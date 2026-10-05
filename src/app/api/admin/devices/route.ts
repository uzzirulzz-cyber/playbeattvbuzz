import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '20', 10) || 20));
    const q = (url.searchParams.get('q') || '').trim();
    const where: Record<string, unknown> = {};
    if (q) where.OR = [{ name: { contains: q } }, { user: { is: { email: { contains: q } } } }];
    const [rows, total] = await Promise.all([
      db.device.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { lastActiveAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.device.count({ where }),
    ]);
    return jsonOk({ rows, total, page, size });
  } catch (e) {
    return jsonErr(e);
  }
}
