import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAuth } from '@/lib/auth';

/** Owner (or admin) view of one order — used by the Bitcoin payment page. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  try {
    const session = await requireAuth(req);
    const { number } = await ctx.params;
    const isAdmin = ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(session.role);
    const order = await db.order.findUnique({
      where: { number },
      include: {
        plan: { select: { id: true, name: true, billingPeriod: true } },
        payment: { select: { id: true, provider: true, status: true, reference: true } },
      },
    });
    if (!order || (order.userId !== session.id && !isAdmin)) {
      throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    }
    return jsonOk({
      order: {
        number: order.number,
        status: order.status,
        paymentMethod: order.paymentMethod,
        txid: order.txid,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        plan: order.plan,
        payment: order.payment,
      },
    });
  } catch (e) {
    return jsonErr(e);
  }
}
