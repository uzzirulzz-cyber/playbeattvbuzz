import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.watchHistory.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Progress ping from the player (throttled client-side) */
export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    const { refType, refId, channelId, label, secondsWatched } = (await req.json()) as {
      refType: 'CHANNEL' | 'MOVIE' | 'EPISODE'; refId: string; channelId?: string; label?: string; secondsWatched?: number;
    };
    if (!refType || !refId) return jsonErr(new Error('refType/refId required'));
    const row = await db.watchHistory.upsert({
      where: { userId_refType_refId: { userId: session.id, refType, refId } },
      create: { userId: session.id, refType, refId, channelId: channelId || null, label: label || '', secondsWatched: secondsWatched || 0 },
      update: { secondsWatched: secondsWatched || undefined, updatedAt: new Date() },
    });
    return jsonOk({ saved: row.id });
  } catch (e) {
    return jsonErr(e);
  }
}
