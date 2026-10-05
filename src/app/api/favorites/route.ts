import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const url = new URL(req.url);
    const refType = url.searchParams.get('refType');
    const rows = await db.favorite.findMany({
      where: { userId: session.id, ...(refType ? { refType } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    const { refType, refId, label } = (await req.json()) as { refType: string; refId: string; label?: string };
    if (!['CHANNEL', 'MOVIE', 'SERIES'].includes(refType)) throw new ApiError(400, 'VALIDATION', 'Invalid favorite type.');
    const row = await db.favorite.upsert({
      where: { userId_refType_refId: { userId: session.id, refType, refId } },
      create: { userId: session.id, refType, refId, label: label || '' },
      update: {},
    });
    return jsonOk({ favorite: row });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth(req);
    const { refType, refId, id } = (await req.json()) as { refType?: string; refId?: string; id?: string };
    if (id) {
      await db.favorite.deleteMany({ where: { id, userId: session.id } });
      return jsonOk({ removed: id });
    }
    if (!refType || !refId) throw new ApiError(400, 'VALIDATION', 'refType and refId are required.');
    await db.favorite.deleteMany({ where: { userId: session.id, refType, refId } });
    return jsonOk({ removed: `${refType}:${refId}` });
  } catch (e) {
    return jsonErr(e);
  }
}
