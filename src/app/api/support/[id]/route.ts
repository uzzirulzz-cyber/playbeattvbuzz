import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAuth, writeAudit } from '@/lib/auth';

/** Thread view: ticket + messages (customer sees only their ticket, internal notes hidden) */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await ctx.params;
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    });
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
    const isStaff = ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(session.role);
    if (!isStaff && ticket.userId !== session.id) throw new ApiError(403, 'FORBIDDEN', 'This ticket belongs to another customer.');
    return jsonOk({
      ticket: {
        id: ticket.id, number: ticket.number, subject: ticket.subject, category: ticket.category,
        priority: ticket.priority, status: ticket.status, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
      },
      messages: (isStaff ? ticket.messages : ticket.messages.filter((m) => !m.isInternal)).map((m) => ({
        id: m.id, body: m.body, authorRole: m.authorRole, authorName: m.author.name, isInternal: m.isInternal, createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Customer reply */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await ctx.params;
    const { body } = (await req.json()) as { body: string };
    if (!body?.trim()) throw new ApiError(400, 'VALIDATION', 'Message cannot be empty.');
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== session.id) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found.');
    await db.ticketMessage.create({
      data: { ticketId: id, authorId: session.id, authorRole: session.role, body: body.trim() },
    });
    await db.supportTicket.update({ where: { id }, data: { status: ticket.status === 'CLOSED' ? 'OPEN' : 'PENDING', updatedAt: new Date() } });
    return jsonOk({ replied: true });
  } catch (e) {
    return jsonErr(e);
  }
}
