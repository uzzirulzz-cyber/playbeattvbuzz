import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.device.findMany({
      where: { userId: session.id },
      orderBy: { lastActiveAt: 'desc' },
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Register a named device */
export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    const { name, platform } = (await req.json()) as { name: string; platform?: string };
    if (!name?.trim()) throw new ApiError(400, 'VALIDATION', 'Device name is required.');

    const ent = await db.subscription.findFirst({
      where: { userId: session.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    });
    const limit = ent?.devicesLimit ?? 1;
    const activeCount = await db.device.count({ where: { userId: session.id, status: 'ACTIVE' } });
    const exists = await db.device.findFirst({ where: { userId: session.id, name: name.trim() } });
    if (exists) throw new ApiError(409, 'CONFLICT', 'A device with this name already exists.');
    if (!exists && activeCount >= limit) {
      throw new ApiError(403, 'DEVICE_LIMIT', `Your plan allows ${limit} active device(s). Remove one first.`);
    }
    const row = await db.device.create({
      data: { userId: session.id, name: name.trim(), platform: platform || 'Web', status: 'ACTIVE', lastActiveAt: new Date() },
    });
    return jsonOk({ device: row });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Revoke a device */
export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);
    const { id, status } = (await req.json()) as { id: string; status: 'ACTIVE' | 'REVOKED' };
    const dev = await db.device.findFirst({ where: { id, userId: session.id } });
    if (!dev) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Device not found.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }
    const updated = await db.device.update({ where: { id }, data: { status } });
    return jsonOk({ device: updated });
  } catch (e) {
    return jsonErr(e);
  }
}
