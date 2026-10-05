import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

// EPG lookup: ?channel=<id|epgId>&window=12 (hours ahead)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const channel = url.searchParams.get('channel') || '';
    const hours = Math.min(48, Math.max(1, parseInt(url.searchParams.get('window') || '12', 10) || 12));
    const now = new Date();
    if (!channel) return jsonErr(new Error('channel param required'));

    const ch = await db.channel.findFirst({ where: { OR: [{ id: channel }, { slug: channel }, { epgId: channel }] } });
    if (!ch) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Channel not found.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const [current, next, schedule] = await Promise.all([
      db.epgProgram.findFirst({ where: { channelId: ch.id, startsAt: { lte: now }, endsAt: { gt: now } } }),
      db.epgProgram.findFirst({ where: { channelId: ch.id, startsAt: { gt: now } }, orderBy: { startsAt: 'asc' } }),
      db.epgProgram.findMany({
        where: { channelId: ch.id, endsAt: { gte: now }, startsAt: { lte: new Date(now.getTime() + hours * 3600e3) } },
        orderBy: { startsAt: 'asc' },
        take: 48,
      }),
    ]);
    return jsonOk({
      channelId: ch.id,
      current: current ? { title: current.title, description: current.description, startsAt: current.startsAt, endsAt: current.endsAt } : null,
      next: next ? { title: next.title, startsAt: next.startsAt, endsAt: next.endsAt } : null,
      schedule,
    });
  } catch (e) {
    return jsonErr(e);
  }
}
