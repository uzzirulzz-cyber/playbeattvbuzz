import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('size') || '20', 10) || 20));
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.OR = [{ number: { contains: q } }, { user: { is: { email: { contains: q } } } }, { user: { is: { name: { contains: q } } } }];

    const [rows, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, billingPeriod: true } },
          payment: { select: { id: true, provider: true, status: true, reference: true, cardBrand: true, cardLast4: true } },
          coupon: { select: { code: true } },
          subscription: { select: { id: true, status: true, expiresAt: true } },
          invoices: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.order.count({ where }),
    ]);
    return jsonOk({ rows, total, page, size });
  } catch (e) {
    return jsonErr(e);
  }
}
