import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAuth } from '@/lib/auth';

/** My subscription (with plan) */
export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.subscription.findMany({
      where: { userId: session.id },
      include: { plan: true, order: { include: { payment: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // expire stale ACTIVE subs
    const now = new Date();
    for (const s of rows) {
      if (s.status === 'ACTIVE' && s.expiresAt < now) {
        await db.subscription.update({ where: { id: s.id }, data: { status: 'EXPIRED' } });
        s.status = 'EXPIRED';
      }
    }
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Toggle auto-renewal / cancel */
export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);
    const { id, autoRenew, cancel } = (await req.json()) as { id: string; autoRenew?: boolean; cancel?: boolean };
    const sub = await db.subscription.findFirst({ where: { id, userId: session.id } });
    if (!sub) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Subscription not found.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const data: Record<string, unknown> = {};
    if (typeof autoRenew === 'boolean') data.autoRenew = autoRenew;
    if (cancel === true) data.status = 'CANCELLED';
    const updated = await db.subscription.update({ where: { id }, data });
    return jsonOk({ subscription: updated });
  } catch (e) {
    return jsonErr(e);
  }
}
