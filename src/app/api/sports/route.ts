import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category') || '';
    const now = new Date();
    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    const [live, upcoming, finished, cats] = await Promise.all([
      db.sportsEvent.findMany({
        where: { ...where, status: 'LIVE' },
        include: { channel: { select: { id: true, name: true, slug: true, isFree: true } } },
        orderBy: { startsAt: 'asc' },
      }),
      db.sportsEvent.findMany({
        where: { ...where, status: 'UPCOMING', startsAt: { gte: now } },
        include: { channel: { select: { id: true, name: true, slug: true, isFree: true } } },
        orderBy: { startsAt: 'asc' },
        take: 12,
      }),
      db.sportsEvent.findMany({
        where: { ...where, status: 'FINISHED' },
        orderBy: { startsAt: 'desc' },
        take: 8,
      }),
      db.sportsEvent.findMany({ where, distinct: ['category'], select: { category: true } }),
    ]);
    return jsonOk({
      live, upcoming, finished,
      categories: cats.map((c) => c.category),
      now: now.toISOString(),
    });
  } catch (e) {
    return jsonErr(e);
  }
}
