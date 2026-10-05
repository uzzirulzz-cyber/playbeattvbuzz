import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const s = await db.series.findFirst({
      where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' },
      include: {
        seasons: { orderBy: { number: 'asc' }, include: { episodes: { orderBy: { number: 'asc' } } } },
      },
    });
    if (!s) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Series not found.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const seasons = s.seasons.map((sn) => ({
      id: sn.id,
      number: sn.number,
      title: sn.title,
      episodes: sn.episodes.map((e) => ({
        id: e.id, number: e.number, title: e.title, description: e.description, durationMin: e.durationMin,
      })),
    }));
    const related = await db.series.findMany({
      where: { status: 'PUBLISHED', id: { not: s.id }, OR: s.genres.split(',').map((g) => ({ genres: { contains: g.trim() } })) },
      take: 6,
    });
    return jsonOk({
      series: {
        id: s.id, title: s.title, slug: s.slug, description: s.description, posterSeed: s.posterSeed,
        genres: s.genres, language: s.language, year: s.year, quality: s.quality,
      },
      seasons,
      related: related.map((r) => ({ id: r.id, title: r.title, slug: r.slug, posterSeed: r.posterSeed, year: r.year, genres: r.genres })),
    });
  } catch (e) {
    return jsonErr(e);
  }
}
