import crypto from 'crypto';
import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, rateLimit, requireAuth, writeAudit } from '@/lib/auth';

/**
 * Customer submits the Bitcoin transaction ID (TXID) for a pending crypto order.
 * The order stays PENDING until the operator verifies it in Admin → Orders
 * ("verify & give subscription").
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    rateLimit(req, 'txid', 10, 60_000);
    const body = (await req.json()) as { orderNumber?: string; txid?: string };
    const orderNumber = (body.orderNumber || '').trim();
    const txid = (body.txid || '').trim();

    if (!/^[0-9a-fA-F]{16,100}$/.test(txid)) {
      throw new ApiError(400, 'VALIDATION', 'Enter a valid Bitcoin transaction ID (TXID) — 16+ hexadecimal characters.');
    }

    const order = await db.order.findUnique({ where: { number: orderNumber }, include: { payment: true } });
    if (!order || (order.userId !== session.id && !['SUPERADMIN', 'ADMIN', 'STAFF'].includes(session.role))) {
      throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    }
    if (order.paymentMethod !== 'CRYPTO_BTC') {
      throw new ApiError(400, 'VALIDATION', 'This order is not a Bitcoin payment order.');
    }
    if (order.status !== 'PENDING') {
      throw new ApiError(400, 'VALIDATION', `This order has already been processed (status: ${order.status}).`);
    }

    await db.order.update({ where: { id: order.id }, data: { txid } });
    if (order.payment) {
      await db.payment.update({
        where: { id: order.payment.id },
        data: {
          reference: txid.slice(0, 120), // reference holds the customer TXID for the verification queue
          payload: JSON.stringify({ mode: 'crypto', network: 'BTC', txid, submittedAt: new Date().toISOString() }),
        },
      });
    }

    await db.notification.create({
      data: {
        userId: order.userId, channel: 'INAPP',
        title: 'TXID received — verification in progress ⏳',
        body: `We received your Bitcoin transaction for order ${order.number}. Your All-Access subscription is activated as soon as the payment is verified.`,
      },
    });
    await writeAudit(req, session, 'order.txid_submitted', 'order', order.id, { number: order.number, txid });

    return jsonOk({ number: order.number, status: 'VERIFYING', txid });
  } catch (e) {
    return jsonErr(e);
  }
}
