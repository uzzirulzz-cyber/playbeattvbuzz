import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAuth } from '@/lib/auth';
import { playlistLinks } from '@/lib/xtream';

/** Customer's IPTV lines with ready-to-use playlist links */
export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const lines = await db.iptvLine.findMany({
      where: { userId: session.id, status: { not: 'DELETED' } },
      include: { subscription: { select: { id: true, status: true, expiresAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const subs = await db.subscription.findMany({
      where: { userId: session.id, lineUser: { not: '' } },
      select: { id: true, lineType: true, lineUser: true, linePass: true, lineStatus: true, lineMsg: true, status: true, expiresAt: true, plan: { select: { name: true } } },
    });
    return jsonOk({
      lines: lines.map((l) => ({
        id: l.id,
        type: l.type,
        username: l.username,
        password: l.type === 'MAC' ? null : l.password,
        plan: l.xtreamPlan,
        connections: l.connections,
        status: l.status,
        providerMsg: l.providerMsg,
        expiresAt: l.subscription?.expiresAt || null,
        links: l.type === 'XTREAM' && l.status === 'ACTIVE' ? playlistLinks(l.username, l.password) : null,
      })),
      subscriptionLines: subs.map((s) => ({
        subscriptionId: s.id,
        plan: s.plan.name,
        status: s.status,
        lineStatus: s.lineStatus,
        lineMsg: s.lineMsg,
        username: s.lineUser,
        password: s.linePass,
        expiresAt: s.expiresAt,
        links: s.lineStatus === 'PROVISIONED' ? playlistLinks(s.lineUser, s.linePass) : null,
      })),
    });
  } catch (e) {
    return jsonErr(e);
  }
}
