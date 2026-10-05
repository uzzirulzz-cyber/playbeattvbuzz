import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers, activeSubs, expiredSubs, pendingSubs, suspendedUsers,
      todayOrders, monthPaidAgg, failedPayments, activeDevices,
      channels, movies, series, openTickets,
      recentOrders, recentAudit, recentActivity,
    ] = await Promise.all([
      db.user.count({ where: { role: { name: 'CUSTOMER' } } }),
      db.subscription.count({ where: { status: 'ACTIVE' } }),
      db.subscription.count({ where: { status: 'EXPIRED' } }),
      db.subscription.count({ where: { status: 'PENDING' } }),
      db.user.count({ where: { status: 'SUSPENDED' } }),
      db.order.count({ where: { createdAt: { gte: startOfDay } } }),
      db.payment.aggregate({ where: { status: 'PAID', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      db.payment.count({ where: { status: 'FAILED' } }),
      db.device.count({ where: { status: 'ACTIVE' } }),
      db.channel.count({ where: { status: 'ACTIVE' } }),
      db.movie.count({ where: { status: 'PUBLISHED' } }),
      db.series.count({ where: { status: 'PUBLISHED' } }),
      db.supportTicket.count({ where: { status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS'] } } }),
      db.order.findMany({ include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } }, payment: { select: { status: true, amount: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      db.watchHistory.findMany({ orderBy: { updatedAt: 'desc' }, take: 8, include: { user: { select: { name: true } } } }),
    ]);

    return jsonOk({
      kpis: {
        totalCustomers,
        activeSubscriptions: activeSubs,
        expiredSubscriptions: expiredSubs,
        pendingSubscriptions: pendingSubs,
        suspendedUsers,
        todayOrders,
        monthlyRevenue: Math.round((monthPaidAgg._sum.amount || 0) * 100) / 100,
        failedPayments,
        activeDevices,
        liveChannels: channels,
        movies,
        series,
        openTickets,
      },
      recentOrders,
      recentAudit,
      recentActivity,
    });
  } catch (e) {
    return jsonErr(e);
  }
}
