import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  ApiError, jsonErr, jsonOk, rateLimit, requireAuth, writeAudit, type SessionUser,
} from '@/lib/auth';
import { addXtreamLine, billingPeriodToPlan, generateXtreamCredentials, type XtreamPlan } from '@/lib/xtream';

const PERIOD_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

function orderNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `PB-${stamp}-${crypto.randomInt(1000, 9999)}`;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Checkout: validates plan + coupon, charges the SANDBOX gateway, creates
 * Payment + Invoice + activates the Subscription. Never stores raw card numbers.
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    rateLimit(req, 'checkout', 10, 60_000);
    const body = (await req.json()) as {
      planId?: string;
      couponCode?: string;
      paymentMethod?: string;
      card?: { number?: string; name?: string; exp?: string; cvv?: string };
      billing?: Record<string, string>;
    };

    const plan = await db.plan.findUnique({ where: { id: body.planId || '' } });
    if (!plan || plan.status !== 'ACTIVE') throw new ApiError(404, 'NOT_FOUND', 'Plan not found or inactive.');

    // ── Coupon ──
    let couponId: string | undefined;
    let discount = 0;
    if (body.couponCode) {
      const coupon = await db.coupon.findUnique({ where: { code: body.couponCode.trim().toUpperCase() } });
      if (!coupon || coupon.status !== 'ACTIVE') throw new ApiError(400, 'VALIDATION', 'Invalid coupon code.');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ApiError(400, 'VALIDATION', 'Coupon has expired.');
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new ApiError(400, 'VALIDATION', 'Coupon usage limit reached.');
      if (coupon.planId && coupon.planId !== plan.id) throw new ApiError(400, 'VALIDATION', 'Coupon does not apply to this plan.');
      const prevUses = await db.order.count({ where: { userId: session.id, couponId: coupon.id, status: { notIn: ['CANCELLED', 'FAILED'] } } });
      if (prevUses >= coupon.perCustomerLimit) throw new ApiError(400, 'VALIDATION', 'Coupon already used by this account.');
      if (plan.price < coupon.minAmount) throw new ApiError(400, 'VALIDATION', `Coupon requires a minimum order of $${coupon.minAmount.toFixed(2)}.`);
      discount = coupon.type === 'PERCENT' ? Math.round(plan.price * (coupon.value / 100) * 100) / 100 : Math.min(coupon.value, plan.price);
      couponId = coupon.id;
    }

    const total = Math.max(0, Math.round((plan.price - discount) * 100) / 100);

    // ── Payment method validation (sandbox) ──
    const method = body.paymentMethod || 'SANDBOX_CARD';

    // ── Bitcoin (crypto) checkout: create a PENDING order + PENDING payment.
    //    No subscription is activated here — the operator verifies the on-chain
    //    payment (customer submits TXID) in Admin → Orders, then the
    //    subscription is given ("verify & give subscription").
    if (method === 'CRYPTO_BTC') {
      const order = await db.order.create({
        data: {
          number: orderNumber(), userId: session.id, planId: plan.id, couponId,
          subtotal: plan.price, discount, total, currency: plan.currency,
          paymentMethod: 'CRYPTO_BTC', status: 'PENDING',
          billing: JSON.stringify(body.billing || {}),
        },
      });
      const reference = `BTC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      await db.payment.create({
        data: {
          orderId: order.id, provider: 'crypto_btc', reference, amount: total, currency: plan.currency,
          status: 'PENDING', payload: JSON.stringify({ mode: 'crypto', network: 'BTC' }),
        },
      });
      await db.notification.create({
        data: {
          userId: session.id, channel: 'INAPP',
          title: 'Bitcoin payment initiated ₿',
          body: `Order ${order.number} for ${plan.name} is awaiting your BTC payment. Send exactly $${total.toFixed(2)} worth of BTC to the address on the payment page, then submit your TXID.`,
        },
      });
      await writeAudit(req, session as unknown as SessionUser, 'order.created_crypto', 'order', order.id, { total });
      return jsonOk({
        orderId: order.id, number: order.number, status: 'PENDING', paymentMethod: 'CRYPTO_BTC',
        total, currency: plan.currency, redirect: `/order/${order.number}`,
      });
    }

    let cardBrand = '';
    let cardLast4 = '';
    let paymentFails = false;
    if (method === 'SANDBOX_CARD') {
      const num = (body.card?.number || '').replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(num)) throw new ApiError(400, 'VALIDATION', 'Enter a valid card number (digits only, 13–19).');
      if (!/^\d{2}\/\d{2}$/.test(body.card?.exp || '')) throw new ApiError(400, 'VALIDATION', 'Expiry must be MM/YY.');
      if (!/^\d{3,4}$/.test(body.card?.cvv || '')) throw new ApiError(400, 'VALIDATION', 'Enter a valid CVV.');
      if (!(body.card?.name || '').trim()) throw new ApiError(400, 'VALIDATION', 'Cardholder name is required.');
      cardBrand = num.startsWith('4') ? 'Visa' : num.startsWith('5') ? 'Mastercard' : num.startsWith('3') ? 'Amex' : 'Card';
      cardLast4 = num.slice(-4); // ONLY last 4 stored — raw number discarded immediately
      paymentFails = num.endsWith('0002'); // sandbox decline card
    }

    // ── Create order + payment atomically-ish ──
    const order = await db.order.create({
      data: {
        number: orderNumber(), userId: session.id, planId: plan.id, couponId,
        subtotal: plan.price, discount, total, currency: plan.currency,
        paymentMethod: method, status: 'PENDING',
        billing: JSON.stringify(body.billing || {}),
      },
    });

    const reference = `SANDBOX-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await db.payment.create({
      data: {
        orderId: order.id, provider: 'sandbox', reference, amount: total, currency: plan.currency,
        status: paymentFails ? 'FAILED' : 'PAID',
        cardBrand, cardLast4,
        failureMsg: paymentFails ? 'Sandbox decline: card ending 0002 always fails.' : '',
        payload: JSON.stringify({ mode: 'sandbox', method }),
      },
    });

    if (paymentFails) {
      await db.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
      await writeAudit(req, session as unknown as SessionUser, 'order.payment_failed', 'order', order.id, { total });
      return jsonOk({ orderId: order.id, number: order.number, status: 'FAILED', message: 'Payment declined by the sandbox gateway. Try a different card.' });
    }

    // ── Activate: order → COMPLETED, subscription → ACTIVE ──
    const now = new Date();
    const months = PERIOD_MONTHS[plan.billingPeriod] || 1;
    const expiresAt = addMonths(now, months + (plan.trialDays > 0 ? 0 : 0));
    const effectiveStart = plan.trialDays > 0 ? now : now;
    if (plan.trialDays > 0) expiresAt.setDate(expiresAt.getDate() + plan.trialDays);

    await db.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
    const subscription = await db.subscription.create({
      data: {
        userId: session.id, planId: plan.id, orderId: order.id, status: 'ACTIVE',
        startsAt: effectiveStart, expiresAt, autoRenew: plan.autoRenewal,
        devicesLimit: plan.deviceLimit,
      },
    });
    const invoice = await db.invoice.create({
      data: { orderId: order.id, number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${order.number.slice(-4)}`, amount: total, currency: plan.currency, status: 'PAID' },
    });
    if (couponId) await db.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });

    // ── IPTV line provisioning via the reseller API (Xtream Masters) ──
    let lineStatus = 'PENDING';
    let lineMsg = 'Provider not configured';
    let lineUser = '';
    let linePass = '';
    const isTrial = plan.trialDays > 0 || plan.price === 0;
    const xtreamPlan: XtreamPlan = isTrial ? 11 : billingPeriodToPlan(plan.billingPeriod);
    if (process.env.XTREAM_API_KEY) {
      const creds = generateXtreamCredentials('pb');
      const add = await addXtreamLine({
        user: creds.user, pass: creds.pass, plan: xtreamPlan,
        connections: Math.min(4, plan.deviceLimit || 1),
        notice: order.number,
      });
      lineMsg = add.msg.slice(0, 300);
      if (add.ok && add.status === 'success') {
        lineStatus = 'PROVISIONED';
        lineUser = creds.user;
        linePass = creds.pass;
      } else {
        lineStatus = 'FAILED';
      }
      await db.iptvLine.create({
        data: {
          userId: session.id, subscriptionId: subscription.id, type: 'XTREAM',
          username: creds.user, password: creds.pass, xtreamPlan,
          connections: Math.min(4, plan.deviceLimit || 1),
          notice: order.number, status: lineStatus === 'PROVISIONED' ? 'ACTIVE' : 'FAILED',
          providerMsg: lineMsg,
        },
      });
      await db.subscription.update({
        where: { id: subscription.id },
        data: { lineType: 'XTREAM', lineUser, linePass, lineStatus, lineMsg },
      });
      await writeAudit(req, session as unknown as SessionUser, 'iptv.provision', 'iptvLine', creds.user, { ok: lineStatus, plan: xtreamPlan });
    }

    await db.notification.create({
      data: { userId: session.id, channel: 'INAPP', title: 'Payment confirmed ✅', body: `Order ${order.number} — ${plan.name} is active until ${expiresAt.toDateString()}. Invoice ${invoice.number} is in your account.` },
    });
    await writeAudit(req, session as unknown as SessionUser, 'order.completed', 'order', order.id, { total, plan: plan.name, subscription: subscription.id });

    return jsonOk({
      orderId: order.id,
      number: order.number,
      status: 'COMPLETED',
      total,
      invoice: invoice.number,
      subscription: { id: subscription.id, expiresAt, plan: plan.name },
      iptvLine: lineStatus === 'PROVISIONED'
        ? { username: lineUser, password: linePass, status: lineStatus }
        : { status: lineStatus, message: lineMsg },
    });
  } catch (e) {
    return jsonErr(e);
  }
}

/** GET: my orders (with payment + plan + invoice) */
export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.order.findMany({
      where: { userId: session.id },
      include: { plan: true, payment: true, invoices: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}
