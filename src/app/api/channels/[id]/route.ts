import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const ch = await db.channel.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { category: true },
    });
    if (!ch || ch.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Channel not found.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const now = new Date();
    const [current, next, schedule] = await Promise.all([
      db.epgProgram.findFirst({ where: { channelId: ch.id, startsAt: { lte: now }, endsAt: { gt: now } } }),
      db.epgProgram.findFirst({ where: { channelId: ch.id, startsAt: { gt: now } }, orderBy: { startsAt: 'asc' } }),
      db.epgProgram.findMany({
        where: { channelId: ch.id, endsAt: { gte: now }, startsAt: { lte: new Date(now.getTime() + 12 * 3600e3) } },
        orderBy: { startsAt: 'asc' },
        take: 24,
      }),
    ]);
    return jsonOk({
      channel: {
        id: ch.id, name: ch.name, slug: ch.slug, description: ch.description, logoSeed: ch.logoSeed,
        category: ch.category.name, country: ch.country, language: ch.language, quality: ch.quality,
        isFree: ch.isFree, epgId: ch.epgId,
      },
      nowNext: {
        current: current ? { title: current.title, description: current.description, startsAt: current.startsAt, endsAt: current.endsAt } : null,
        next: next ? { title: next.title, startsAt: next.startsAt, endsAt: next.endsAt } : null,
      },
      schedule,
    });
  } catch (e) {
    return jsonErr(e);
  }
}
