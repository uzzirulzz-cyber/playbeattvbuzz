import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

const ALLOWED = ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const { status } = (await req.json()) as { status: string };
    if (!ALLOWED.includes(status)) throw new ApiError(400, 'VALIDATION', `Status must be one of: ${ALLOWED.join(', ')}`);

    const order = await db.order.findUnique({ where: { id }, include: { payment: true, subscription: true, invoices: true } });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');

    const data: Record<string, unknown> = { status };

    // side-effects
    if (status === 'REFUNDED') {
      if (order.payment) await db.payment.update({ where: { id: order.payment.id }, data: { status: 'REFUNDED' } });
      if (order.subscription) await db.subscription.update({ where: { id: order.subscription.id }, data: { status: 'CANCELLED' } });
      for (const inv of order.invoices) await db.invoice.update({ where: { id: inv.id }, data: { status: 'VOID' } });
      await db.notification.create({
        data: { userId: order.userId, channel: 'INAPP', title: 'Order refunded', body: `Order ${order.number} has been refunded and the associated subscription cancelled.` },
      });
    }
    if (status === 'COMPLETED' && order.subscription && order.subscription.status === 'PENDING') {
      await db.subscription.update({ where: { id: order.subscription.id }, data: { status: 'ACTIVE' } });
    }
    if (status === 'CANCELLED' && order.subscription && order.subscription.status === 'PENDING') {
      await db.subscription.update({ where: { id: order.subscription.id }, data: { status: 'CANCELLED' } });
    }

    await db.order.update({ where: { id }, data });
    await writeAudit(req, actor, 'order.status_change', 'order', id, { status, number: order.number });
    return jsonOk({ updated: true, status });
  } catch (e) {
    return jsonErr(e);
  }
}
