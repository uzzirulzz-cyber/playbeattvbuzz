import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAuth, writeAudit } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const rows = await db.supportTicket.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: 'desc' },
    });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    const { subject, category, priority, message } = (await req.json()) as Record<string, string>;
    if (!subject?.trim()) throw new ApiError(400, 'VALIDATION', 'Subject is required.');
    if (!message?.trim() || message.trim().length < 10) throw new ApiError(400, 'VALIDATION', 'Please describe the issue (10+ characters).');
    const count = await db.supportTicket.count();
    const ticket = await db.supportTicket.create({
      data: {
        number: `TK-${String(count + 1).padStart(4, '0')}`,
        userId: session.id,
        subject: subject.trim(),
        category: category || 'General',
        priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority || '') ? priority! : 'NORMAL',
        status: 'OPEN',
      },
    });
    await db.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: session.id, authorRole: session.role, body: message.trim() },
    });
    await db.notification.create({
      data: { userId: session.id, channel: 'INAPP', title: `Ticket ${ticket.number} created`, body: 'Our 24/7 desk will reply shortly.' },
    });
    await writeAudit(req, session, 'support.ticket_created', 'ticket', ticket.id, { subject: ticket.subject });
    return jsonOk({ ticket: { id: ticket.id, number: ticket.number } });
  } catch (e) {
    return jsonErr(e);
  }
}
