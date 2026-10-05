import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAuth } from '@/lib/auth';

/** Customer's own invoices */
export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.invoice.findMany({
      where: { order: { is: { userId: session.id } } },
      include: { order: { select: { number: true, plan: { select: { name: true } } } } },
      orderBy: { issuedAt: 'desc' },
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}
