import { db } from '@/lib/db';
import { ApiError, jsonErr, jsonOk, requireAdmin, writeAudit } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const rows = await db.emailTemplate.findMany({ orderBy: { key: 'asc' } });
    return jsonOk({ rows });
  } catch (e) {
    return jsonErr(e);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireAdmin(req);
    const { key, subject, bodyHtml } = (await req.json()) as { key: string; subject: string; bodyHtml: string };
    if (!key) throw new ApiError(400, 'VALIDATION', 'Template key is required.');
    if (!subject?.trim()) throw new ApiError(400, 'VALIDATION', 'Subject is required.');
    await db.emailTemplate.upsert({
      where: { key },
      create: { key, subject, bodyHtml: bodyHtml || '' },
      update: { subject, bodyHtml: bodyHtml || '' },
    });
    await writeAudit(req, actor, 'email_template.update', 'emailTemplate', key, {});
    return jsonOk({ updated: key });
  } catch (e) {
    return jsonErr(e);
  }
}
