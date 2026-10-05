import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '20', 10) || 20));
    const status = url.searchParams.get('status') || '';
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: { order: { select: { number: true, user: { select: { name: true, email: true } }, plan: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.payment.count({ where }),
    ]);
    return jsonOk({ rows, total, page, size });
  } catch (e) {
    return jsonErr(e);
  }
}
