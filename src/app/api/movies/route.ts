import { db } from '@/lib/db';
import { jsonErr, jsonOk, parsePage } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { page, size, q, url } = parsePage(req);
    const genre = url.searchParams.get('genre') || '';
    const language = url.searchParams.get('language') || '';
    const year = url.searchParams.get('year') || '';
    const quality = url.searchParams.get('quality') || '';
    const sort = url.searchParams.get('sort') || 'trending'; // trending | newest | az

    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (genre) where.genres = { contains: genre };
    if (language) where.language = language;
    if (year) where.year = parseInt(year, 10) || 0;
    if (quality) where.quality = quality;
    if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];

    const orderBy = sort === 'newest' ? { year: 'desc' as const } : sort === 'az' ? { title: 'asc' as const } : { trending: 'asc' as const };

    const [rows, total, facets] = await Promise.all([
      db.movie.findMany({ where, orderBy, skip: (page - 1) * size, take: size }),
      db.movie.count({ where }),
      Promise.all([
        db.movie.findMany({ where: { status: 'PUBLISHED' }, select: { genres: true } }),
        db.movie.findMany({ where: { status: 'PUBLISHED' }, distinct: ['language'], select: { language: true }, orderBy: { language: 'asc' } }),
        db.movie.findMany({ where: { status: 'PUBLISHED' }, distinct: ['year'], select: { year: true }, orderBy: { year: 'desc' } }),
      ]),
    ]);

    const genreSet = [...new Set(facets[0].flatMap((g) => g.genres.split(',').map((s) => s.trim()).filter(Boolean)))].sort();
    return jsonOk({
      rows: rows.map((m) => ({ ...m, playbackUrl: undefined, trailerUrl: m.trailerUrl ? 'protected' : '' })),
      total, page, size,
      facets: { genres: genreSet, languages: facets[1].map((l) => l.language), years: facets[2].map((y) => y.year), qualities: ['HD', '4K'] },
    });
  } catch (e) {
    return jsonErr(e);
  }
}
