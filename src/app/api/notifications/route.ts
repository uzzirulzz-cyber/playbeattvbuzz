import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.notification.findMany({
      where: { OR: [{ userId: session.id }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = rows.filter((r) => !r.readAt).length;
    return jsonOk({ rows, unread });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Mark one or all as read */
export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);
    const { id, all } = (await req.json()) as { id?: string; all?: boolean };
    if (all) {
      await db.notification.updateMany({ where: { userId: session.id, readAt: null }, data: { readAt: new Date() } });
      return jsonOk({ allRead: true });
    }
    if (id) {
      await db.notification.updateMany({ where: { id, userId: session.id }, data: { readAt: new Date() } });
    }
    return jsonOk({ read: id || null });
  } catch (e) {
    return jsonErr(e);
  }
}
