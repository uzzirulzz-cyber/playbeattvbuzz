import crypto from 'crypto';
import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';
import { addXtreamLine, billingPeriodToPlan, generateXtreamCredentials, type XtreamPlan } from '@/lib/xtream';

const ALLOWED = ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'];

const PERIOD_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

/** Crypto verification queue: operator confirms the BTC payment → subscription given. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { action?: string; status?: string; note?: string };
    const order = await db.order.findUnique({
      where: { id },
      include: { payment: true, subscription: true, invoices: true, plan: true, user: true },
    });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');

    // ── Verify BTC payment → activate subscription ("subscription given") ──
    if (body.action === 'verify_crypto') {
      if (order.paymentMethod !== 'CRYPTO_BTC') throw new ApiError(400, 'VALIDATION', 'Not a Bitcoin order.');
      if (order.status !== 'PENDING') throw new ApiError(400, 'VALIDATION', `Order already processed (status: ${order.status}).`);

      await db.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
      if (order.payment) {
        await db.payment.update({ where: { id: order.payment.id }, data: { status: 'PAID' } });
      }

      // Extend from the customer's current active expiry when applicable
      const now = new Date();
      const current = await db.subscription.findFirst({
        where: { userId: order.userId, status: 'ACTIVE', expiresAt: { gt: now } },
        orderBy: { expiresAt: 'desc' },
      });
      const base = current ? current.expiresAt : now;
      const months = PERIOD_MONTHS[order.plan.billingPeriod] || 1;
      const expiresAt = new Date(base);
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const subscription = await db.subscription.create({
        data: {
          userId: order.userId, planId: order.planId, orderId: order.id, status: 'ACTIVE',
          startsAt: current ? base : now, expiresAt, autoRenew: order.plan.autoRenewal,
          devicesLimit: order.plan.deviceLimit,
        },
      });

      const invoice = await db.invoice.create({
        data: {
          orderId: order.id,
          number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${order.number.slice(-4)}`,
          amount: order.total, currency: order.currency, status: 'PAID',
        },
      });

      // Best-effort IPTV line provisioning (same as card checkout)
      if (process.env.XTREAM_API_KEY) {
        try {
          const creds = generateXtreamCredentials('pb');
          const xtreamPlan: XtreamPlan = billingPeriodToPlan(order.plan.billingPeriod);
          const add = await addXtreamLine({
            user: creds.user, pass: creds.pass, plan: xtreamPlan,
            connections: Math.min(4, order.plan.deviceLimit || 1),
            notice: order.number,
          });
          const lineStatus = add.ok && add.status === 'success' ? 'PROVISIONED' : 'FAILED';
          await db.iptvLine.create({
            data: {
              userId: order.userId, subscriptionId: subscription.id, type: 'XTREAM',
              username: creds.user, password: creds.pass, xtreamPlan,
              connections: Math.min(4, order.plan.deviceLimit || 1),
              notice: order.number, status: lineStatus === 'PROVISIONED' ? 'ACTIVE' : 'FAILED',
              providerMsg: add.msg.slice(0, 300),
            },
          });
          await db.subscription.update({
            where: { id: subscription.id },
            data: {
              lineType: 'XTREAM', lineUser: creds.user, linePass: creds.pass,
              lineStatus, lineMsg: add.msg.slice(0, 300),
            },
          });
        } catch (e) {
          console.error('[verify_crypto] line provisioning failed', e);
        }
      }

      await db.notification.create({
        data: {
          userId: order.userId, channel: 'INAPP',
          title: 'Payment verified — subscription active ✅',
          body: `Your Bitcoin payment for order ${order.number} has been verified. ${order.plan.name} is active until ${expiresAt.toDateString()}. Enjoy!`,
        },
      });
      await writeAudit(req, actor, 'order.crypto_verified', 'order', order.id, {
        number: order.number, txid: order.txid, subscription: subscription.id, invoice: invoice.number,
      });
      return jsonOk({ verified: true, status: 'COMPLETED', subscriptionId: subscription.id, expiresAt });
    }

    // ── Reject BTC payment (invalid/never-seen TXID) ──
    if (body.action === 'reject_crypto') {
      if (order.paymentMethod !== 'CRYPTO_BTC') throw new ApiError(400, 'VALIDATION', 'Not a Bitcoin order.');
      if (order.status !== 'PENDING') throw new ApiError(400, 'VALIDATION', `Order already processed (status: ${order.status}).`);
      await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      if (order.payment) {
        await db.payment.update({
          where: { id: order.payment.id },
          data: { status: 'FAILED', failureMsg: (body.note || 'Payment could not be verified on-chain.').slice(0, 300) },
        });
      }
      await db.notification.create({
        data: {
          userId: order.userId, channel: 'INAPP',
          title: 'Payment could not be verified ❌',
          body: `We could not verify the Bitcoin transaction submitted for order ${order.number}${body.note ? `: ${body.note}` : '.'} Please contact support with your TXID.`,
        },
      });
      await writeAudit(req, actor, 'order.crypto_rejected', 'order', order.id, { number: order.number, note: body.note || '' });
      return jsonOk({ rejected: true, status: 'FAILED' });
    }

    const { status } = body as { status: string };
    if (!ALLOWED.includes(status)) throw new ApiError(400, 'VALIDATION', `Status must be one of: ${ALLOWED.join(', ')}`);

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
