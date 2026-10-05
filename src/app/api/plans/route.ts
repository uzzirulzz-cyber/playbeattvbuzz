import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

// Public plans — dynamic pricing straight from the database
export async function GET() {
  try {
    const rows = await db.plan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { price: 'asc' },
    });
    return jsonOk({ rows: rows.map((p) => ({ ...p, features: JSON.parse(p.features || '[]') })) });
  } catch (e) {
    return jsonErr(e);
  }
}
