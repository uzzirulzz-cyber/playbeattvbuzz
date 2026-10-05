import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const rows = await db.notification.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Send in-app/email notification: broadcast or targeted */
export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(req);
    const { title, body, channel, userIds } = (await req.json()) as { title: string; body: string; channel?: string; userIds?: string[] };
    if (!title?.trim()) throw new ApiError(400, 'VALIDATION', 'Title is required.');
    if (!body?.trim()) throw new ApiError(400, 'VALIDATION', 'Message body is required.');
    const ch = channel === 'EMAIL' ? 'EMAIL' : 'INAPP';

    let count = 0;
    if (Array.isArray(userIds) && userIds.length) {
      for (const userId of userIds) {
        await db.notification.create({ data: { userId, channel: ch, title: title.trim(), body: body.trim() } });
        count++;
      }
    } else {
      const customers = await db.user.findMany({ where: { role: { name: 'CUSTOMER' }, status: 'ACTIVE' }, select: { id: true } });
      for (const u of customers) {
        await db.notification.create({ data: { userId: u.id, channel: ch, title: title.trim(), body: body.trim() } });
        count++;
      }
    }
    await writeAudit(req, actor, 'notification.send', 'notification', '', { title, count, channel: ch });
    return Response.json({ ok: true, data: { delivered: count, channel: ch } }, { status: 201 });
  } catch (e) {
    return jsonErr(e);
  }
}
