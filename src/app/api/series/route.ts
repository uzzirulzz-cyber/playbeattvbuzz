import { db } from '@/lib/db';
import { jsonErr, jsonOk, parsePage } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { page, size, q, url } = parsePage(req);
    const genre = url.searchParams.get('genre') || '';
    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (genre) where.genres = { contains: genre };
    if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];

    const [rows, total, genreRows] = await Promise.all([
      db.series.findMany({
        where,
        include: { seasons: { include: { episodes: true } } },
        orderBy: { trending: 'asc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.series.count({ where }),
      db.series.findMany({ where: { status: 'PUBLISHED' }, select: { genres: true } }),
    ]);
    const genres = [...new Set(genreRows.flatMap((g) => g.genres.split(',').map((s) => s.trim()).filter(Boolean)))].sort();

    return jsonOk({
      rows: rows.map((s) => ({
        id: s.id, title: s.title, slug: s.slug, description: s.description, posterSeed: s.posterSeed,
        genres: s.genres, language: s.language, year: s.year, quality: s.quality, featured: s.featured,
        status: s.status,
        seasonsCount: s.seasons.length,
        episodesCount: s.seasons.reduce((a, x) => a + x.episodes.length, 0),
      })),
      total, page, size, facets: { genres },
    });
  } catch (e) {
    return jsonErr(e);
  }
}
