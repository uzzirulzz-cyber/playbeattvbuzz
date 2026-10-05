import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

const DAYS: Record<string, number> = { '7': 7, '30': 30, '90': 90, '365': 365 };

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30';
    const days = DAYS[range] || 30;
    const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0);

    const [payments, orders, subs, customers, deviceRows, topChannels, favorites] = await Promise.all([
      db.payment.findMany({ where: { status: 'PAID', createdAt: { gte: from } }, select: { amount: true, createdAt: true } }),
      db.order.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true } }),
      db.subscription.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true } }),
      db.user.findMany({ where: { createdAt: { gte: from }, role: { name: 'CUSTOMER' } }, select: { createdAt: true } }),
      db.device.findMany({ select: { platform: true, status: true } }),
      db.watchHistory.findMany({ where: { refType: 'CHANNEL', updatedAt: { gte: from } }, select: { channelId: true, secondsWatched: true } }),
      db.favorite.findMany({ select: { refType: true, refId: true } }),
    ]);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const buckets: Record<string, { revenue: number; orders: number; subs: number; customers: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(from.getDate() + i);
      buckets[dayKey(d)] = { revenue: 0, orders: 0, subs: 0, customers: 0 };
    }
    for (const p of payments) {
      const k = dayKey(new Date(p.createdAt));
      if (buckets[k]) buckets[k].revenue = Math.round((buckets[k].revenue + p.amount) * 100) / 100;
    }
    for (const o of orders) { const k = dayKey(new Date(o.createdAt)); if (buckets[k]) buckets[k].orders++; }
    for (const s of subs) { const k = dayKey(new Date(s.createdAt)); if (buckets[k]) buckets[k].subs++; }
    for (const c of customers) { const k = dayKey(new Date(c.createdAt)); if (buckets[k]) buckets[k].customers++; }

    const series = Object.entries(buckets).map(([date, v]) => ({ date, ...v }));

    const deviceUsage: Record<string, number> = {};
    for (const d of deviceRows) deviceUsage[d.platform] = (deviceUsage[d.platform] || 0) + 1;

    // popular channels by watch seconds
    const secByChannel: Record<string, number> = {};
    for (const h of topChannels) secByChannel[h.channelId || ''] = (secByChannel[h.channelId || ''] || 0) + h.secondsWatched;
    const chanIds = Object.keys(secByChannel).filter(Boolean).slice(0, 8);
    const chanRows = chanIds.length ? await db.channel.findMany({ where: { id: { in: chanIds } }, select: { id: true, name: true } }) : [];
    const popularChannels = chanIds
      .map((id) => ({ name: chanRows.find((c) => c.id === id)?.name || id, watchSeconds: secByChannel[id] }))
      .sort((a, b) => b.watchSeconds - a.watchSeconds);

    // popular categories by favorites on channels
    const chanFav = favorites.filter((f) => f.refType === 'CHANNEL');
    const favChan = chanFav.length ? await db.channel.findMany({ where: { id: { in: chanFav.map((f) => f.refId) } }, include: { category: true } }) : [];
    const popularCategories: Record<string, number> = {};
    for (const f of chanFav) {
      const c = favChan.find((x) => x.id === f.refId);
      if (c) popularCategories[c.category.name] = (popularCategories[c.category.name] || 0) + 1;
    }

    const totalPaid = payments.reduce((a, p) => a + p.amount, 0);
    const completed = orders.filter((o) => ['PAID', 'COMPLETED'].includes(o.status)).length;
    return jsonOk({
      series,
      range: days,
      deviceUsage,
      popularChannels,
      popularCategories,
      conversion: {
        orders: orders.length,
        completed,
        rate: orders.length ? Math.round((completed / orders.length) * 100) : 0,
        revenue: Math.round(totalPaid * 100) / 100,
      },
    });
  } catch (e) {
    return jsonErr(e);
  }
}
