import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    const q = (url.searchParams.get('q') || '').trim();
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.OR = [{ number: { contains: q } }, { subject: { contains: q } }, { user: { is: { email: { contains: q } } } }];
    const rows = await db.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}
