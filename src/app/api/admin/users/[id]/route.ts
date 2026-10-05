import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit, hashPassword } from '@/lib/auth';
import { requireRole, ADMIN_ONLY } from '@/lib/adminCrud';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const { id } = await ctx.params;
    const body = (await req.json()) as { status?: string; role?: string; password?: string; twoFactor?: boolean };
    const user = await db.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    if (user.role.name === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only a SUPERADMIN can modify SUPERADMIN accounts.');
    }
    const data: Record<string, unknown> = {};
    if (body.status && ['ACTIVE', 'SUSPENDED'].includes(body.status)) {
      data.status = body.status;
      if (body.status === 'SUSPENDED') data.tokenVersion = { increment: 1 };
    }
    if (body.role && ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(body.role)) {
      if (body.role === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
        throw new ApiError(403, 'FORBIDDEN', 'Only a SUPERADMIN can grant SUPERADMIN.');
      }
      const role = await db.role.findUniqueOrThrow({ where: { name: body.role } });
      data.roleId = role.id;
    }
    if (body.password) {
      if (body.password.length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be 8+ characters.');
      data.passwordHash = hashPassword(body.password);
    }
    if (typeof body.twoFactor === 'boolean') data.twoFactor = body.twoFactor;
    await db.user.update({ where: { id }, data });
    await writeAudit(req, actor, 'user.update', 'user', id, { keys: Object.keys(data) });
    return jsonOk({ updated: true });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const { id } = await ctx.params;
    const user = await db.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    if (user.role.name === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only a SUPERADMIN can remove SUPERADMIN accounts.');
    }
    if (user.id === actor.id) throw new ApiError(400, 'VALIDATION', 'You cannot delete your own account.');
    await db.user.update({ where: { id }, data: { status: 'SUSPENDED', tokenVersion: { increment: 1 }, email: `deleted+${id.slice(-6)}@playbeattv.buzz` } });
    await writeAudit(req, actor, 'user.deactivated', 'user', id, { originalEmail: user.email });
    return jsonOk({ deactivated: true });
  } catch (e) {
    return jsonErr(e);
  }
}
