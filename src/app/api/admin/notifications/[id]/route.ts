import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    await db.notification.deleteMany({ where: { id } });
    await writeAudit(req, actor, 'notification.delete', 'notification', id, {});
    return jsonOk({ deleted: true });
  } catch (e) {
    return jsonErr(e);
  }
}
