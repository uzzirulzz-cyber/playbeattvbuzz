import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';
import { XMLParser } from 'fast-xml-parser';

/** EPG admin: GET programs+logs / POST XMLTV import / DELETE purge channel */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const channelId = url.searchParams.get('channelId') || '';
    const now = new Date();
    const [channels, logs] = await Promise.all([
      db.channel.findMany({
        select: { id: true, name: true, slug: true, epgId: true, _count: { select: { epgPrograms: true } } },
        orderBy: { name: 'asc' },
      }),
      db.epgSyncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    let programs: unknown[] = [];
    if (channelId) {
      programs = await db.epgProgram.findMany({
        where: { channelId, endsAt: { gte: new Date(now.getTime() - 24 * 3600e3) } },
        orderBy: { startsAt: 'asc' },
        take: 200,
      });
    }
    return jsonOk({ channels, logs, programs });
  } catch (e) {
    return jsonErr(e);
  }
}

/**
 * POST: XMLTV import. Accepts { xml: '<tv>…</tv>' } or { url } (server fetch).
 * Maps <programme channel="epgId" start/end="YYYYMMDDHHmmss …"> to EpgProgram via channel.epgId.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(req);
    const body = (await req.json()) as { xml?: string; url?: string };
    let xml = body.xml || '';
    if (!xml && body.url) {
      const res = await fetch(body.url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new ApiError(400, 'FETCH_FAILED', `EPG source returned ${res.status}.`);
      xml = await res.text();
    }
    if (!xml.trim()) throw new ApiError(400, 'VALIDATION', 'Provide `xml` text or a `url` to an XMLTV source.');

    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);
    const tv = parsed?.tv;
    const programmes = tv?.programme ? (Array.isArray(tv.programme) ? tv.programme : [tv.programme]) : [];
    if (!programmes.length) throw new ApiError(400, 'VALIDATION', 'No <programme> elements found — is this an XMLTV file?');

    const channels = await db.channel.findMany({ select: { id: true, epgId: true } });
    const byEpgId = new Map(channels.filter((c) => c.epgId).map((c) => [c.epgId, c.id]));

    const parseTs = (s: string): Date | null => {
      const m = s?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/);
      if (!m) return null;
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
    };

    let imported = 0;
    let mapped = 0;
    const seenChannels = new Set<string>();
    for (const p of programmes) {
      const epgId = p?.['@_channel'];
      const start = parseTs(p?.['@_start'] || '');
      const end = parseTs(p?.['@_stop'] || '') || (start ? new Date(start.getTime() + 3600e3) : null);
      if (!epgId || !start || !end) continue;
      const channelId = byEpgId.get(epgId);
      if (!channelId) continue;
      seenChannels.add(channelId);
      const title = p?.title?.['#text'] || p?.title?.[0]?.['#text'] || 'Programme';
      const desc = p?.desc?.['#text'] || p?.desc?.[0]?.['#text'] || '';
      await db.epgProgram.create({ data: { channelId, epgId, title: String(title).slice(0, 200), description: String(desc).slice(0, 500), startsAt: start, endsAt: end } });
      imported++;
    }
    mapped = seenChannels.size;

    const log = await db.epgSyncLog.create({
      data: { source: body.url || 'inline-xml', status: 'OK', message: `Imported ${imported} programmes across ${mapped} channels.`, programsImported: imported, channelsMapped: mapped },
    });
    await writeAudit(req, actor, 'epg.import', 'epg', log.id, { imported, mapped });
    return Response.json({ ok: true, data: { imported, mapped, unmatched: programmes.length - imported } }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return jsonErr(e);
    await db.epgSyncLog.create({ data: { source: 'import', status: 'ERROR', message: e instanceof Error ? e.message.slice(0, 300) : 'Unknown import error.', programsImported: 0, channelsMapped: 0 } }).catch(() => null);
    return jsonErr(e);
  }
}

/** DELETE: purge a channel's schedule (?channelId=…) */
export async function DELETE(req: Request) {
  try {
    const actor = await requireAdmin(req);
    const url = new URL(req.url);
    const channelId = url.searchParams.get('channelId') || '';
    if (!channelId) throw new ApiError(400, 'VALIDATION', 'channelId query param required.');
    const res = await db.epgProgram.deleteMany({ where: { channelId } });
    await db.epgSyncLog.create({ data: { source: 'purge', status: 'OK', message: `Purged ${res.count} programmes.`, programsImported: 0, channelsMapped: 0 } });
    await writeAudit(req, actor, 'epg.purge', 'epg', channelId, { purged: res.count });
    return jsonOk({ purged: res.count });
  } catch (e) {
    return jsonErr(e);
  }
}
