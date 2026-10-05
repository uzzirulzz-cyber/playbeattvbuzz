import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';
import { requireRole, ADMIN_ONLY } from '@/lib/adminCrud';

const SENSITIVE = /secret|key|token|password/i;

function maskConfig(cfg: string): string {
  try {
    const obj = JSON.parse(cfg || '{}') as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      if (SENSITIVE.test(k) && typeof obj[k] === 'string' && obj[k]) obj[k] = '••••••••';
    }
    return JSON.stringify(obj);
  } catch {
    return cfg;
  }
}

export async function GET(req: Request) {
  try {
    await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const rows = await db.apiIntegration.findMany({ orderBy: { createdAt: 'desc' } });
    return jsonOk({ rows: rows.map((r) => ({ ...r, config: maskConfig(r.config) })) });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const { name, kind, config } = (await req.json()) as { name: string; kind?: string; config?: Record<string, unknown> };
    if (!name?.trim()) throw new ApiError(400, 'VALIDATION', 'Name is required.');
    const row = await db.apiIntegration.create({
      data: { name: name.trim(), kind: kind || 'OTHER', config: JSON.stringify(config || {}) },
    });
    await writeAudit(req, actor, 'integration.create', 'apiIntegration', row.id, { name });
    return Response.json({ ok: true, data: { ...row, config: maskConfig(row.config) } }, { status: 201 });
  } catch (e) {
    return jsonErr(e);
  }
}
