import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit, hashPassword } from '@/lib/auth';
import { requireRole, ADMIN_ONLY } from '@/lib/adminCrud';

/** Staff/admin accounts (customers live in /admin/customers) */
export async function GET(req: Request) {
  try {
    await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const rows = await db.user.findMany({
      where: { role: { name: { in: ['SUPERADMIN', 'ADMIN', 'STAFF'] } } },
      select: {
        id: true, email: true, name: true, phone: true, status: true, twoFactor: true,
        lastLoginAt: true, createdAt: true, roleId: true, role: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const body = (await req.json()) as { name?: string; email?: string; phone?: string; password?: string; role?: string; twoFactor?: boolean };
    const email = (body.email || '').trim().toLowerCase();
    if (!body.name?.trim()) throw new ApiError(400, 'VALIDATION', 'Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION', 'Valid email is required.');
    if ((body.password || '').length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be 8+ characters.');
    const roleName = body.role && ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(body.role) ? body.role : 'STAFF';
    if (roleName === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only a SUPERADMIN can create SUPERADMIN accounts.');
    }
    if (await db.user.findUnique({ where: { email } })) throw new ApiError(409, 'CONFLICT', 'Email already exists.');
    const role = await db.role.findUniqueOrThrow({ where: { name: roleName } });
    const user = await db.user.create({
      data: { email, name: body.name!.trim(), phone: body.phone || '', roleId: role.id, passwordHash: hashPassword(body.password!), twoFactor: body.twoFactor ?? false },
    });
    await writeAudit(req, actor, 'user.create', 'user', user.id, { email, role: roleName });
    return Response.json({ ok: true, data: { id: user.id, email: user.email, role: roleName } }, { status: 201 });
  } catch (e) {
    return jsonErr(e);
  }
}
