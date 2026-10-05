import { db } from '@/lib/db';
import { jsonErr, jsonOk } from '@/lib/auth';

/** Public CMS endpoint — safe keys only (marketing content, FAQ, footer, SEO) */
export async function GET() {
  try {
    const keys = ['site.content', 'faq.items', 'cms.banners', 'cms.footer', 'seo.meta'];
    const rows = await db.setting.findMany({ where: { key: { in: keys } } });
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    }
    return jsonOk(out);
  } catch (e) {
    return jsonErr(e);
  }
}
