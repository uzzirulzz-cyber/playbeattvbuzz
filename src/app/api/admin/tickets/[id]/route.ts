import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

const STATUSES = ['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/** Admin thread view (includes internal notes) */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } },
      },
    });
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
    return jsonOk({ ticket });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Reply (public or internal note) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const { body, isInternal } = (await req.json()) as { body: string; isInternal?: boolean };
    if (!body?.trim()) throw new ApiError(400, 'VALIDATION', 'Message cannot be empty.');
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
    await db.ticketMessage.create({
      data: { ticketId: id, authorId: actor.id, authorRole: actor.role, body: body.trim(), isInternal: !!isInternal },
    });
    const nextStatus = ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status;
    await db.supportTicket.update({ where: { id }, data: { status: nextStatus, updatedAt: new Date() } });
    if (!isInternal) {
      await db.notification.create({
        data: { userId: ticket.userId, channel: 'INAPP', title: `New reply on ticket ${ticket.number}`, body: 'Open your account to view the support reply.' },
      });
    }
    return jsonOk({ replied: true, status: nextStatus });
  } catch (e) {
    return jsonErr(e);
  }
}

/** status / priority / assignee */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { status?: string; priority?: string; assigneeId?: string | null };
    const data: Record<string, unknown> = {};
    if (body.status && STATUSES.includes(body.status)) data.status = body.status;
    if (body.priority && PRIORITIES.includes(body.priority)) data.priority = body.priority;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (!Object.keys(data).length) throw new ApiError(400, 'VALIDATION', 'Nothing to update.');
    await db.supportTicket.update({ where: { id }, data });
    await writeAudit(req, actor, 'ticket.update', 'ticket', id, { keys: Object.keys(data) });
    return jsonOk({ updated: true });
  } catch (e) {
    return jsonErr(e);
  }
}
