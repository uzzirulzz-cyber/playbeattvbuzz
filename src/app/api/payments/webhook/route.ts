import crypto from 'crypto';
import { db } from '@/lib/db';
import { jsonErr } from '@/lib/auth';

/**
 * Payment provider webhook (PSP → server).
 * Verifies HMAC-SHA256 signature over the raw body using PAYMENTS_WEBHOOK_SECRET.
 * Raw card data is never accepted here — only provider references.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const sig = req.headers.get('x-pbtv-signature') || '';
    const secret = process.env.PAYMENTS_WEBHOOK_SECRET || 'sandbox-webhook-secret';
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'BAD_SIGNATURE', message: 'Webhook signature verification failed.' } }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
    const evt = JSON.parse(raw) as { reference?: string; status?: string };
    if (!evt.reference) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'VALIDATION', message: 'reference required' } }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    const payment = await db.payment.findUnique({ where: { reference: evt.reference } });
    if (!payment) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Unknown payment reference.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (evt.status === 'PAID' && payment.status !== 'PAID') {
      await db.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } });
      await db.order.update({ where: { id: payment.orderId }, data: { status: 'COMPLETED' } });
    } else if (evt.status === 'FAILED') {
      await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureMsg: 'Gateway reported failure.' } });
      await db.order.update({ where: { id: payment.orderId }, data: { status: 'FAILED' } });
    }
    return Response.json({ ok: true, data: { received: true } });
  } catch (e) {
    return jsonErr(e);
  }
}
