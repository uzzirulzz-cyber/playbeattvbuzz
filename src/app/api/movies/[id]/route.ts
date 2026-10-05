import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const m = await db.movie.findFirst({ where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' } });
    if (!m) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Movie not found.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const related = await db.movie.findMany({
      where: { status: 'PUBLISHED', id: { not: m.id }, OR: m.genres.split(',').map((g) => ({ genres: { contains: g.trim() } })) },
      take: 6,
      orderBy: { trending: 'asc' },
    });
    return jsonOk({
      movie: { ...m, playbackUrl: undefined, trailerUrl: m.trailerUrl ? 'protected' : '' },
      related: related.map((r) => ({ ...r, playbackUrl: undefined })),
    });
  } catch (e) {
    return jsonErr(e);
  }
}
