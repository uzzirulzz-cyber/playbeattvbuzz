import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(req);
    const { id } = await ctx.params;
    const { status } = (await req.json()) as { status: 'ACTIVE' | 'REVOKED' };
    if (!['ACTIVE', 'REVOKED'].includes(status)) throw new ApiError(400, 'VALIDATION', 'Invalid status.');
    const dev = await db.device.findUnique({ where: { id } });
    if (!dev) throw new ApiError(404, 'NOT_FOUND', 'Device not found.');
    await db.device.update({ where: { id }, data: { status } });
    await writeAudit(req, actor, 'device.status_change', 'device', id, { status, userId: dev.userId });
    return jsonOk({ updated: true, status });
  } catch (e) {
    return jsonErr(e);
  }
}
