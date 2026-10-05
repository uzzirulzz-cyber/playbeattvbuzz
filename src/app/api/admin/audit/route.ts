import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '30', 10) || 30));
    const q = (url.searchParams.get('q') || '').trim();
    const action = url.searchParams.get('action') || '';

    const where: Record<string, unknown> = {};
    if (action) where.action = { contains: action };
    if (q) where.OR = [{ actorEmail: { contains: q } }, { action: { contains: q } }, { entity: { contains: q } }];

    const [rows, total, actions] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.auditLog.count({ where }),
      db.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    ]);
    return jsonOk({ rows, total, page, size, actions: actions.map((a) => a.action) });
  } catch (e) {
    return jsonErr(e);
  }
}
