import { db } from '@/lib/db';
import {
  ApiError, getSessionUser, hashPassword, jsonErr, jsonOk, rateLimit,
  requireAuth, verifyPassword, writeAudit,
} from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    if (!session) return jsonOk({ user: null, subscription: null });
    const ent = await db.subscription.findFirst({
      where: { userId: session.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { expiresAt: 'desc' },
    });
    const unread = await db.notification.count({ where: { userId: session.id, readAt: null } });
    return jsonOk({
      user: session,
      subscription: ent
        ? {
            id: ent.id,
            plan: ent.plan.name,
            quality: ent.plan.quality,
            devicesLimit: ent.devicesLimit,
            expiresAt: ent.expiresAt,
          }
        : null,
      unread,
    });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);
    rateLimit(req, 'me-update', 20, 60_000);
    const body = (await req.json()) as Record<string, string>;

    // change password
    if (body.currentPassword !== undefined) {
      const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
      if (!verifyPassword(body.currentPassword, user.passwordHash)) {
        throw new ApiError(400, 'VALIDATION', 'Current password is incorrect.');
      }
      if ((body.newPassword || '').length < 8 || !/[A-Za-z]/.test(body.newPassword) || !/\d/.test(body.newPassword)) {
        throw new ApiError(400, 'VALIDATION', 'New password must be 8+ characters with letters and numbers.');
      }
      if (body.newPassword !== body.confirmPassword) throw new ApiError(400, 'VALIDATION', 'New passwords do not match.');
      await db.user.update({
        where: { id: session.id },
        data: { passwordHash: hashPassword(body.newPassword), tokenVersion: { increment: 1 } },
      });
      await writeAudit(req, session, 'auth.password_change', 'user', session.id, {});
      return jsonOk({ passwordChanged: true });
    }

    // profile update
    const data: Record<string, string> = {};
    if (body.name !== undefined) {
      const n = body.name.trim();
      if (n.length < 2) throw new ApiError(400, 'VALIDATION', 'Name is too short.');
      data.name = n;
    }
    if (body.phone !== undefined) data.phone = body.phone.trim();
    if (body.billing !== undefined) {
      const b = typeof body.billing === 'string' ? JSON.parse(body.billing) : body.billing;
      data.billing = JSON.stringify(b);
    }
    if (!Object.keys(data).length) throw new ApiError(400, 'VALIDATION', 'Nothing to update.');
    await db.user.update({ where: { id: session.id }, data });
    await writeAudit(req, session, 'profile.update', 'user', session.id, { keys: Object.keys(data) });
    return jsonOk({ updated: true });
  } catch (e) {
    return jsonErr(e);
  }
}
