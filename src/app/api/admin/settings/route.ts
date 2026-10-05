import { db } from '@/lib/db';
import { jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';
import { requireRole, ADMIN_ONLY } from '@/lib/adminCrud';

/** CMS settings — all keys, used by Website Builder + global config */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const rows = await db.setting.findMany({ orderBy: { key: 'asc' } });
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    }
    return jsonOk({ settings: out });
  } catch (e) {
    return jsonErr(e);
  }
}

/** Upsert one or many setting keys: { values: { 'site.content': {...} } } */
export async function PUT(req: Request) {
  try {
    const actor = await requireRole(await requireAdmin(req), ADMIN_ONLY);
    const { values } = (await req.json()) as { values: Record<string, unknown> };
    if (!values || typeof values !== 'object') {
      return Response.json({ ok: false, error: { code: 'VALIDATION', message: 'values object required.' } }, { status: 400 });
    }
    for (const [key, value] of Object.entries(values)) {
      await db.setting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      });
    }
    await writeAudit(req, actor, 'settings.update', 'setting', '', { keys: Object.keys(values) });
    return jsonOk({ updated: Object.keys(values) });
  } catch (e) {
    return jsonErr(e);
  }
}
