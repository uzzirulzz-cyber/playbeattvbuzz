import { db } from '@/lib/db';
import { getSessionUser, hasActiveSubscription, jsonErr, jsonOk } from '@/lib/auth';

// Catalog — NEVER returns streamUrl (protected; served only via /api/play/*).
// 18+ categories are hidden unless the requester holds an active All-Access subscription.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const category = url.searchParams.get('category') || '';
    const country = url.searchParams.get('country') || '';
    const language = url.searchParams.get('language') || '';
    const quality = url.searchParams.get('quality') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(60, Math.max(1, parseInt(url.searchParams.get('size') || '24', 10) || 24));

    const session = await getSessionUser(req);
    const unlocked = session ? await hasActiveSubscription(session.id) : false;

    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (category) where.category = { slug: category };
    if (country) where.country = country;
    if (language) where.language = language;
    if (quality) where.quality = quality;
    if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
    if (!unlocked) {
      where.category = { ...(where.category as Record<string, unknown> || {}), isAdult: false };
    }

    const [rows, total, cats, countries, languages] = await Promise.all([
      db.channel.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.channel.count({ where }),
      db.channelCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.channel.findMany({ where: { status: 'ACTIVE' }, distinct: ['country'], select: { country: true }, orderBy: { country: 'asc' } }),
      db.channel.findMany({ where: { status: 'ACTIVE' }, distinct: ['language'], select: { language: true }, orderBy: { language: 'asc' } }),
    ]);

    return jsonOk({
      rows: rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        logoSeed: c.logoSeed,
        category: c.category.name,
        categorySlug: c.category.slug,
        country: c.country,
        language: c.language,
        quality: c.quality,
        isFree: c.isFree,
        epgId: c.epgId,
      })),
      total,
      page,
      size,
      facets: {
        categories: cats.filter((c) => unlocked || !c.isAdult).map((c) => ({ name: c.name, slug: c.slug })),
        countries: countries.map((c) => c.country),
        languages: languages.map((l) => l.language),
        qualities: ['SD', 'HD', '4K'],
      },
    });
  } catch (e) {
    return jsonErr(e);
  }
}
