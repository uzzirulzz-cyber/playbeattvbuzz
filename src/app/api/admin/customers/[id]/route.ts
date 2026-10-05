import crypto from 'crypto';
import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit, hashPassword } from '@/lib/auth';

/** Customer 360 detail */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const u = await db.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, phone: true, status: true, createdAt: true, lastLoginAt: true, billing: true, twoFactor: true,
        subscriptions: { include: { plan: true, order: true }, orderBy: { createdAt: 'desc' } },
        orders: { include: { plan: { select: { name: true } }, payment: { select: { status: true, reference: true, amount: true } }, invoices: true }, orderBy: { createdAt: 'desc' } },
        devices: { orderBy: { lastActiveAt: 'desc' } },
        tickets: { include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } }, orderBy: { updatedAt: 'desc' } },
        history: { orderBy: { updatedAt: 'desc' }, take: 10 },
        favorites: true,
      },
    });
    if (!u) throw new ApiError(404, 'NOT_FOUND', 'Customer not found.');
    return jsonOk({ customer: u });
  } catch (e) {
    return jsonErr(e);
  }
}

/** suspend | activate | reset-password (returns one-time temp password) */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { action?: string; status?: string };
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Customer not found.');

    if (body.action === 'suspend' || body.status === 'SUSPENDED') {
      await db.user.update({ where: { id }, data: { status: 'SUSPENDED', tokenVersion: { increment: 1 } } });
      await db.subscription.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'SUSPENDED' } });
      await writeAudit(req, actor, 'customer.suspend', 'user', id, { email: user.email });
      return jsonOk({ status: 'SUSPENDED' });
    }
    if (body.action === 'activate' || body.status === 'ACTIVE') {
      await db.user.update({ where: { id }, data: { status: 'ACTIVE' } });
      await db.subscription.updateMany({ where: { userId: id, status: 'SUSPENDED' }, data: { status: 'ACTIVE' } });
      await writeAudit(req, actor, 'customer.activate', 'user', id, { email: user.email });
      return jsonOk({ status: 'ACTIVE' });
    }
    if (body.action === 'reset-password') {
      const temp = `PB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await db.user.update({ where: { id }, data: { passwordHash: hashPassword(temp), tokenVersion: { increment: 1 } } });
      await writeAudit(req, actor, 'customer.reset_password', 'user', id, { email: user.email });
      // one-time display only; NOT stored in plaintext
      return jsonOk({ tempPassword: temp, message: 'Share this one-time password with the customer securely. It is not stored.' });
    }
    if (body.action === 'grant_subscription') {
      const months = Math.max(1, Math.min(36, Math.floor(Number((body as unknown as { months?: number }).months) || 1)));
      const note = String((body as unknown as { note?: string }).note || '').slice(0, 300);
      const plan = await db.plan.findFirst({ where: { status: 'ACTIVE' }, orderBy: { price: 'asc' } });
      if (!plan) throw new ApiError(400, 'VALIDATION', 'No active plan configured — create one in Admin → Plans first.');

      const now = new Date();
      const current = await db.subscription.findFirst({
        where: { userId: id, status: 'ACTIVE', expiresAt: { gt: now } },
        orderBy: { expiresAt: 'desc' },
      });
      const base = current ? current.expiresAt : now;
      const expiresAt = new Date(base);
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const order = await db.order.create({
        data: {
          number: `PB-G-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          userId: id, planId: plan.id, subtotal: 0, discount: 0, total: 0, currency: plan.currency,
          paymentMethod: 'ADMIN_GRANT', status: 'COMPLETED',
          billing: JSON.stringify({ grantedBy: actor.email, note, months }),
        },
      });
      await db.payment.create({
        data: {
          orderId: order.id, provider: 'admin_grant', reference: `GRANT-${order.number}`,
          amount: 0, currency: plan.currency, status: 'PAID',
          payload: JSON.stringify({ grantedBy: actor.email, months, note }),
        },
      });
      const subscription = await db.subscription.create({
        data: {
          userId: id, planId: plan.id, orderId: order.id, status: 'ACTIVE',
          startsAt: current ? base : now, expiresAt, autoRenew: false, devicesLimit: plan.deviceLimit,
        },
      });
      await db.invoice.create({
        data: {
          orderId: order.id,
          number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${order.number.slice(-4)}`,
          amount: 0, currency: plan.currency, status: 'PAID',
        },
      });
      await db.notification.create({
        data: {
          userId: id, channel: 'INAPP',
          title: 'Subscription granted 🎁',
          body: `The team has activated ${plan.name} on your account until ${expiresAt.toDateString()}. Everything is unlocked — enjoy!`,
        },
      });
      await writeAudit(req, actor, 'customer.grant_subscription', 'user', id, { email: user.email, months, note, subscription: subscription.id });
      return jsonOk({ granted: true, subscriptionId: subscription.id, expiresAt });
    }
    throw new ApiError(400, 'VALIDATION', 'Unknown action.');
  } catch (e) {
    return jsonErr(e);
  }
}
