import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';
import { requireRole, ADMIN_ONLY } from '@/lib/adminCrud';

/** Security center: session stats, 2FA adoption, recent security events */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const [users, lockEvents, recentActions, activeDevices] = await Promise.all([
      db.user.findMany({ select: { id: true, email: true, name: true, role: { select: { name: true } }, status: true, twoFactor: true, lastLoginAt: true } }),
      db.auditLog.findMany({ where: { action: { contains: 'login' } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.auditLog.findMany({ where: { action: { in: ['user.update', 'customer.suspend', 'customer.activate', 'customer.reset_password', 'settings.update', 'user.create'] } }, orderBy: { createdAt: 'desc' }, take: 15 }),
      db.device.count({ where: { status: 'ACTIVE' } }),
    ]);
    return jsonOk({
      users,
      sessions: { activeDevices },
      twoFactorAdoption: users.filter((u) => u.twoFactor).length,
      loginEvents: lockEvents,
      securityActions: recentActions,
    });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Revoke all sessions for a user (bumps tokenVersion) or toggle 2FA flag */
export async function POST(req: Request) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const { userId, action } = (await req.json()) as { userId: string; action: 'revoke-sessions' | 'toggle-2fa' };
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    if (action === 'revoke-sessions') {
      await db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
      await writeAudit(req, actor, 'security.revoke_sessions', 'user', userId, { email: user.email });
      return jsonOk({ revoked: true });
    }
    if (action === 'toggle-2fa') {
      await db.user.update({ where: { id: userId }, data: { twoFactor: !user.twoFactor } });
      await writeAudit(req, actor, 'security.toggle_2fa', 'user', userId, { enabled: !user.twoFactor });
      return jsonOk({ twoFactor: !user.twoFactor });
    }
    throw new ApiError(400, 'VALIDATION', 'Unknown action.');
  } catch (e) {
    return jsonErr(e);
  }
}
