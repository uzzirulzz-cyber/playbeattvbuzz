import { db } from '@/lib/db';
import { makeCrud } from '@/lib/adminCrud';
import { wireItem } from '@/lib/adminRoute';
import { writeAudit } from '@/lib/auth';
import type { SessionUser } from '@/lib/auth';

const crud = makeCrud({
  model: 'series', entity: 'series', softField: 'status',
  include: { seasons: { include: { episodes: true } } },
  fields: [
    { name: 'title' }, { name: 'description' }, { name: 'posterSeed' }, { name: 'genres', type: 'csv' },
    { name: 'language' }, { name: 'year', type: 'number' }, { name: 'quality' },
    { name: 'featured', type: 'boolean' }, { name: 'trending', type: 'number' }, { name: 'status' },
  ],
});

type SeasonInput = { number?: number; title?: string; episodes?: { number?: number; title?: string; description?: string; durationMin?: number; playbackUrl?: string }[] };

/** PATCH also supports full seasons/episodes sync via body.seasons */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown> & { seasons?: SeasonInput[] };

    if (Array.isArray(body.seasons)) {
      // full replace of seasons/episodes (simple + deterministic)
      const existing = await db.season.findMany({ where: { seriesId: id } });
      for (const sn of existing) await db.season.delete({ where: { id: sn.id } });
      for (const [i, sn] of body.seasons.entries()) {
        const season = await db.season.create({
          data: { seriesId: id, number: sn.number ?? i + 1, title: sn.title || `Season ${sn.number ?? i + 1}` },
        });
        for (const [j, ep] of (sn.episodes || []).entries()) {
          await db.episode.create({
            data: {
              seasonId: season.id, number: ep.number ?? j + 1,
              title: ep.title || `Episode ${ep.number ?? j + 1}`,
              description: ep.description || '', durationMin: ep.durationMin ?? 25,
              playbackUrl: ep.playbackUrl || '',
            },
          });
        }
      }
      await writeAudit(req, actor as unknown as SessionUser, 'series.seasons_sync', 'series', id, { seasons: body.seasons.length });
      delete body.seasons;
    }

    const data = await crud.PATCH(new Request(req.url, { method: 'PATCH', headers: req.headers, body: JSON.stringify(body) }), actor, id);
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json({ ok: false, error: { code: 'ERROR', message: e instanceof Error ? e.message : 'Update failed.' } }, { status: 400 });
  }
}

export const { DELETE } = wireItem(crud);
