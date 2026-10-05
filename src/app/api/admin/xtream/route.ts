import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';
import { requireRole, ADMIN_ONLY } from '@/lib/adminCrud';
import {
  addActiveCode, addMac, addXtreamLine, deleteActiveCode, deleteMac, deleteXtreamLine,
  extendActiveCode, extendMac, extendXtreamLine, generateXtreamCredentials, getCreditLogs,
  getInfo, MAC_RE, type XtreamPlan,
} from '@/lib/xtream';

/** Reseller account + all provisioned lines */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const [info, logs, lines] = await Promise.all([
      getInfo(),
      getCreditLogs().catch(() => ({ ok: false, msg: 'credit logs unavailable', logs: [] as unknown[] })),
      db.iptvLine.findMany({
        include: { user: { select: { name: true, email: true } }, subscription: { select: { id: true, status: true, expiresAt: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    const configured = !!process.env.XTREAM_API_KEY;
    return jsonOk({ configured, info: info.info || null, infoMsg: info.msg, logs: logs.logs || [], logMsg: (logs as { msg?: string }).msg, lines });
  } catch (e) {
    return jsonErr(e);
  }
}

/**
 * Actions:
 *  check                 — validate API key + show credits
 *  create                — manual line { type: XTREAM|ACTIVECODE|MAC, username?, password?, mac?, plan, connections, notice }
 *  extend                — { lineId, plan }
 *  delete                — { lineId, force? }
 *  retry-subscription    — { subscriptionId } re-provision a failed checkout line
 */
export async function POST(req: Request) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const body = (await req.json()) as {
      action: string; lineId?: string; subscriptionId?: string; type?: string;
      username?: string; password?: string; mac?: string; plan?: number;
      connections?: number; notice?: string; force?: boolean;
    };

    if (body.action === 'check') {
      const info = await getInfo();
      await writeAudit(req, actor, 'xtream.check', 'xtream', '', { ok: info.ok });
      return jsonOk({ ok: info.ok, info: info.info, message: info.msg });
    }

    if (body.action === 'retry-subscription') {
      if (!body.subscriptionId) throw new ApiError(400, 'VALIDATION', 'subscriptionId required.');
      const sub = await db.subscription.findUnique({ where: { id: body.subscriptionId }, include: { plan: true } });
      if (!sub) throw new ApiError(404, 'NOT_FOUND', 'Subscription not found.');
      if (sub.lineStatus === 'PROVISIONED') return jsonOk({ alreadyProvisioned: true, username: sub.lineUser });
      const creds = generateXtreamCredentials('pb');
      const plan = (sub.lineType === 'ACTIVECODE' ? 11 : sub.lineType === 'MAC' ? 11 : 1) as XtreamPlan;
      const isTrial = sub.plan.trialDays > 0 || sub.plan.price === 0;
      const xp: XtreamPlan = isTrial ? 11 : (plan === 1 ? 1 : plan);
      const add = await addXtreamLine({
        user: creds.user, pass: creds.pass, plan: xp,
        connections: Math.min(4, sub.devicesLimit || 1), notice: 'retry',
      });
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          lineType: 'XTREAM', lineUser: creds.user, linePass: creds.pass,
          lineStatus: add.ok && add.status === 'success' ? 'PROVISIONED' : 'FAILED', lineMsg: add.msg.slice(0, 300),
        },
      });
      await db.iptvLine.create({
        data: {
          userId: sub.userId, subscriptionId: sub.id, type: 'XTREAM', username: creds.user, password: creds.pass,
          xtreamPlan: xp, connections: Math.min(4, sub.devicesLimit || 1), notice: 'retry',
          status: add.ok && add.status === 'success' ? 'ACTIVE' : 'FAILED', providerMsg: add.msg.slice(0, 300),
        },
      });
      await writeAudit(req, actor, 'iptv.retry', 'iptvLine', creds.user, { ok: add.ok });
      return jsonOk({ ok: add.ok, username: creds.user, message: add.msg });
    }

    if (body.action === 'create') {
      const plan = (body.plan || 1) as XtreamPlan;
      const conns = Math.max(1, Math.min(4, body.connections || 1));
      let result;
      let username = '';
      let password = '';
      let type = (body.type || 'XTREAM').toUpperCase();
      if (type === 'MAC') {
        if (!body.mac || !MAC_RE.test(body.mac)) throw new ApiError(400, 'VALIDATION', 'Valid MAC required (00:AA:BB:CC:DD:11).');
        username = body.mac.toUpperCase();
        result = await addMac(username, plan, body.notice);
      } else if (type === 'ACTIVECODE') {
        result = await addActiveCode(plan, conns, undefined, body.notice);
        username = String((result.raw as { user?: string })?.user || 'see-provider');
      } else {
        username = (body.username || '').trim() || generateXtreamCredentials('pb').user;
        password = (body.password || '').trim() || generateXtreamCredentials('pb').pass;
        result = await addXtreamLine({ user: username, pass: password, plan, connections: conns, notice: body.notice });
      }
      const line = await db.iptvLine.create({
        data: {
          type, username, password, xtreamPlan: plan, connections: conns, notice: body.notice || 'manual',
          status: result.ok && result.status === 'success' ? 'ACTIVE' : 'FAILED', providerMsg: result.msg.slice(0, 300),
        },
      });
      await writeAudit(req, actor, 'iptv.create', 'iptvLine', line.id, { type, username, plan });
      return Response.json({ ok: true, data: { line, providerMessage: result.msg } }, { status: 201 });
    }

    if (body.action === 'extend' || body.action === 'delete') {
      if (!body.lineId) throw new ApiError(400, 'VALIDATION', 'lineId required.');
      const line = await db.iptvLine.findUnique({ where: { id: body.lineId } });
      if (!line) throw new ApiError(404, 'NOT_FOUND', 'Line not found.');
      const plan = (body.plan || 1) as Parameters<typeof extendXtreamLine>[1];
      let result;
      if (body.action === 'extend') {
        if (line.type === 'MAC') result = await extendMac(line.username, plan);
        else if (line.type === 'ACTIVECODE') result = await extendActiveCode(line.username, plan);
        else result = await extendXtreamLine(line.username, plan);
      } else {
        if (line.type === 'MAC') result = await deleteMac(line.username, body.force);
        else if (line.type === 'ACTIVECODE') result = await deleteActiveCode(line.username, body.force);
        else result = await deleteXtreamLine(line.username, body.force);
      }
      if (body.action === 'delete' && result.ok) {
        await db.iptvLine.update({ where: { id: line.id }, data: { status: 'DELETED', providerMsg: result.msg.slice(0, 300) } });
        if (line.subscriptionId) {
          await db.subscription.update({ where: { id: line.subscriptionId }, data: { lineStatus: 'DELETED', lineMsg: result.msg.slice(0, 300) } });
        }
      } else if (body.action === 'extend' && result.ok) {
        await db.iptvLine.update({ where: { id: line.id }, data: { providerMsg: result.msg.slice(0, 300), updatedAt: new Date() } });
      }
      await writeAudit(req, actor, `iptv.${body.action}`, 'iptvLine', line.username, { ok: result.ok, msg: result.msg });
      return jsonOk({ ok: result.ok, message: result.msg });
    }

    throw new ApiError(400, 'VALIDATION', 'Unknown action.');
  } catch (e) {
    return jsonErr(e);
  }
}
