import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, rateLimit, writeAudit } from '@/lib/auth';

/** Public contact form → creates a support ticket for logged-in users, or a logged notification for guests. */
export async function POST(req: Request) {
  try {
    rateLimit(req, 'contact', 5, 60_000);
    const { name, email, subject, message } = (await req.json()) as Record<string, string>;
    if (!name?.trim() || !message?.trim()) throw new ApiError(400, 'VALIDATION', 'Name and message are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) throw new ApiError(400, 'VALIDATION', 'A valid email is required.');
    if (message.trim().length < 10) throw new ApiError(400, 'VALIDATION', 'Please describe your request (10+ characters).');

    const sessionUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } }).catch(() => null);
    const count = await db.supportTicket.count();
    if (sessionUser) {
      const ticket = await db.supportTicket.create({
        data: {
          number: `TK-${String(count + 1).padStart(4, '0')}`,
          userId: sessionUser.id,
          subject: subject?.trim() || 'Website contact request',
          category: 'Sales',
          priority: 'NORMAL',
          status: 'OPEN',
        },
      });
      await db.ticketMessage.create({
        data: { ticketId: ticket.id, authorId: sessionUser.id, authorRole: 'CUSTOMER', body: message.trim() },
      });
      await writeAudit(req, null, 'contact.ticket_created', 'ticket', ticket.id, { email });
      return jsonOk({ mode: 'ticket', number: ticket.number });
    }
    await db.notification.create({
      data: { userId: null, channel: 'EMAIL', title: `Website contact: ${subject?.trim() || 'General'}`, body: `${name} <${email}>: ${message.trim()}` },
    });
    await writeAudit(req, null, 'contact.guest_message', 'notification', '', { email });
    return jsonOk({ mode: 'message' });
  } catch (e) {
    return jsonErr(e);
  }
}
