import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

const STATUSES = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'SUSPENDED'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { status?: string; extendDays?: number; autoRenew?: boolean };
    const sub = await db.subscription.findUnique({ where: { id } });
    if (!sub) throw new ApiError(404, 'NOT_FOUND', 'Subscription not found.');

    const data: Record<string, unknown> = {};
    if (body.status && STATUSES.includes(body.status)) data.status = body.status;
    if (typeof body.autoRenew === 'boolean') data.autoRenew = body.autoRenew;
    if (typeof body.extendDays === 'number' && body.extendDays !== 0) {
      const base = sub.expiresAt > new Date() ? sub.expiresAt : new Date();
      data.expiresAt = new Date(base.getTime() + body.extendDays * 86400e3);
    }
    if (!Object.keys(data).length) throw new ApiError(400, 'VALIDATION', 'Nothing to update.');

    const updated = await db.subscription.update({ where: { id }, data });
    await writeAudit(req, actor, 'subscription.update', 'subscription', id, { keys: Object.keys(data) });
    await db.notification.create({
      data: { userId: sub.userId, channel: 'INAPP', title: 'Subscription updated', body: `Your subscription status is now ${updated.status}${data.expiresAt ? ` — new expiry ${updated.expiresAt.toDateString()}` : ''}.` },
    });
    return jsonOk({ subscription: updated });
  } catch (e) {
    return jsonErr(e);
  }
}
