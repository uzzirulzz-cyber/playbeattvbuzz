/**
 * PLAYBEATTV — authorized line importer (owner's Xtream distribution line).
 * v2: uses the Neon HTTP driver (no pg-bouncer pool stalls) + deterministic ids.
 *
 * Pulls the live catalog via the Xtream player_api and stores it in Postgres.
 *  - Adult categories/streams are excluded (family package policy, red line)
 *  - Streams stored with internal `xtream://live/<id>` scheme — provider
 *    credentials are NEVER written to the DB or exposed to the browser;
 *    playback is resolved server-side through /api/stream/* proxy
 *  - Logos stay as deterministic gradient art (no copyrighted assets hotlinked)
 *
 * Run: DATABASE_URL=... PBTV_LINE_HOST=... PBTV_LINE_USER=... PBTV_LINE_PASS=... bun scripts/import-geotv.ts
 */
import { neon } from '@neondatabase/serverless';

const HOST = (process.env.PBTV_LINE_HOST || '').replace(/\/+$/, '');
const USER = process.env.PBTV_LINE_USER || '';
const PASS = process.env.PBTV_LINE_PASS || '';
const LABEL = process.env.PBTV_LINE_LABEL || 'World Package — Channels + VODs (Family)';
const RENEWAL = process.env.PBTV_LINE_RENEWAL || '';

// Build a clean Neon HTTP-driver URL (strip pooler-specific params)
function neonUrl(): string {
  const raw = process.env.DATABASE_URL || '';
  const m = raw.match(/^(postgres(?:ql)?:\/\/[^?]+)/);
  if (!m) throw new Error('DATABASE_URL missing');
  return m[1];
}
const sql = neon(neonUrl());

type Cat = { category_id: string; category_name: string; parent_id?: number; is_adult?: number };
type Live = {
  num: number; name: string; stream_type: string; stream_id: number;
  stream_icon: string; epg_channel_id: string | null; added: string;
  tv_archive: number; tv_archive_duration: number; direct_source: string; category_id: string;
};

async function api<T>(action: string, extra: Record<string, string> = {}): Promise<T> {
  const u = new URL(`${HOST}/player_api.php`);
  u.searchParams.set('username', USER);
  u.searchParams.set('password', PASS);
  if (action) u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  const res = await fetch(u, { signal: AbortSignal.timeout(120000), cache: 'no-store' });
  if (!res.ok) throw new Error(`${action || 'auth'}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

const ADULT_NAME = /(xxx|porn|adult|\+18|18\+|erotic|playboy|brazzers|hustler|venus|penthouse)/i;

function qualityOf(name: string): string {
  if (/\b(4K|UHD)\b/i.test(name)) return '4K';
  if (/\bSD\b(?!.*HD)/i.test(name)) return 'SD';
  return 'HD';
}

function countryOf(catName: string): string {
  const m = catName.match(/^([A-Z]{2,3})\s*[-–|]/);
  const code = m ? m[1] : 'INT';
  return code === 'EN' ? 'US/UK' : code; // "EN -" groups are English-language US/UK channels
}

function langHint(catName: string): string {
  const m = catName.match(/^-?\s*([A-Z]{2})\s*[-–]/);
  const map: Record<string, string> = {
    IN: 'Hindi', EN: 'English', UK: 'English', US: 'English', AR: 'Arabic', FR: 'French',
    DE: 'German', ES: 'Spanish', PT: 'Portuguese', IT: 'Italian', TR: 'Turkish', NL: 'Dutch',
    RU: 'Russian', PK: 'Urdu', BD: 'Bengali', KR: 'Korean', JP: 'Japanese', CN: 'Chinese',
    BR: 'Portuguese', MX: 'Spanish', SA: 'Arabic', AE: 'Arabic', MY: 'Malay', ID: 'Indonesian',
    TH: 'Thai', VN: 'Vietnamese', PH: 'Filipino', GR: 'Greek', SE: 'Swedish', NO: 'Norwegian',
    DK: 'Danish', FI: 'Finnish', PL: 'Polish', RO: 'Romanian', CZ: 'Czech', HU: 'Hungarian',
  };
  return m && map[m[1]] ? map[m[1]] : 'Multi';
}

async function chunked<T>(rows: T[], n: number, fn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += n) {
    await fn(rows.slice(i, i + n));
    if ((i / n) % 20 === 0) console.log(`  … ${Math.min(i + n, rows.length)}/${rows.length}`);
  }
}

async function main() {
  console.log('PLAYBEATTV line importer v2 (Neon HTTP driver) — authorized distribution line only');
  if (!HOST || !USER || !PASS) throw new Error('PBTV_LINE_HOST/USER/PASS env vars are required.');

  // 0. Idempotent cleanup of any partial rows from earlier importer runs (non-deterministic ids)
  await sql`DELETE FROM "Channel" WHERE slug LIKE 'geo-%' AND id NOT LIKE 'geoch_%'`;
  await sql`DELETE FROM "ChannelCategory" WHERE slug LIKE 'geo-%' AND id NOT LIKE 'geocat_%'`;
  await sql`DELETE FROM "StreamingSource" WHERE id <> 'geoline_source' AND label LIKE '%World Package%'`;
  await sql`DELETE FROM "ContentProvider" WHERE id <> 'geoprovider_line' AND name LIKE 'GeoTV%'`;

  // 1. Auth probe
  const info = await api<{ user_info?: { auth?: number; status?: string; exp_date?: string; max_connections?: string } }>('');
  if (!info.user_info || info.user_info.auth !== 1) throw new Error('Line authentication failed.');
  const exp = info.user_info.exp_date ? new Date(Number(info.user_info.exp_date) * 1000).toISOString().slice(0, 10) : 'n/a';
  console.log(`Line OK: status=${info.user_info.status} max_conn=${info.user_info.max_connections} expires=${exp}`);

  // 2. Fetch catalog
  const cats = await api<Cat[]>('get_live_categories');
  const streams = await api<Live[]>('get_live_streams');
  if (!Array.isArray(cats) || !Array.isArray(streams)) throw new Error('Unexpected provider payload.');
  console.log(`Provider catalog: ${cats.length} categories, ${streams.length} live streams`);

  const catById = new Map(cats.map((c) => [String(c.category_id), c]));
  const adultCatIds = new Set(cats.filter((c) => Number(c.is_adult) === 1).map((c) => String(c.category_id)));

  // 3. Family-policy filter
  const kept = streams.filter((s) => {
    const cid = String(s.category_id);
    if (adultCatIds.has(cid)) return false;
    if (ADULT_NAME.test(s.name)) return false;
    const cat = catById.get(cid);
    if (cat && ADULT_NAME.test(cat.category_name)) return false;
    return true;
  });
  console.log(`Family filter: ${streams.length - kept.length} adult streams excluded, ${kept.length} authorized streams to import`);

  // 4. Register provider + source (credentials stay in ENV — credentialsRef = env var NAMES only)
  const provId = 'geoprovider_line';
  await sql`
    INSERT INTO "ContentProvider" (id, name, type, status, notes)
    VALUES (${provId}, 'GeoTV / Star IPTV Distribution (owner line)', 'IPTV', 'ACTIVE',
            ${`${LABEL} · host ${HOST} · renews ${RENEWAL} · owner-authorized distribution line`})
    ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes, status = 'ACTIVE'`;
  await sql`
    INSERT INTO "StreamingSource" (id, "providerId", label, protocol, "baseUrl", "credentialsRef", status)
    VALUES ('geoline_source', ${provId}, ${`${HOST} — ${LABEL}`}, 'HLS', ${HOST},
            'PBTV_LINE_HOST / PBTV_LINE_USER / PBTV_LINE_PASS (env only)', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET "baseUrl" = EXCLUDED."baseUrl", status = 'ACTIVE'`;

  // 5. Upsert categories (namespaced slugs/ids so seed demo categories stay intact)
  const usedCatIds = [...new Set(kept.map((s) => String(s.category_id)))];
  await chunked(usedCatIds, 5, async (batch) => {
    await Promise.all(batch.map(async (cid, idx) => {
      const c = catById.get(cid);
      if (!c) return;
      await sql`
        INSERT INTO "ChannelCategory" (id, name, slug, "sortOrder")
        VALUES (${'geocat_' + cid}, ${c.category_name}, ${'geo-' + cid}, ${100 + idx})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`;
    }));
  });
  console.log(`Categories upserted: ${usedCatIds.length}`);

  // 6. Upsert channels (deterministic id geoch_<stream_id>, xtream:// scheme, no credentials)
  await chunked(kept, 15, async (batch) => {
    await Promise.all(batch.map(async (s) => {
      const cat = catById.get(String(s.category_id));
      const name = s.name.replace(/\s+/g, ' ').trim();
      await sql`
        INSERT INTO "Channel" (id, name, slug, description, "logoSeed", "categoryId", country, language,
                               quality, "epgId", "streamType", "streamUrl", "isFree", status, "createdAt", "updatedAt")
        VALUES (${'geoch_' + s.stream_id}, ${name}, ${'geo-' + s.stream_id}, '', ${'geo' + (s.stream_id % 97)}, ${'geocat_' + s.category_id},
                ${cat ? countryOf(cat.category_name) : 'INT'}, ${cat ? langHint(cat.category_name) : 'Multi'},
                ${qualityOf(name)}, ${s.epg_channel_id ?? ''}, 'HLS', ${`xtream://live/${s.stream_id}`},
                false, 'ACTIVE', now(), now())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, "categoryId" = EXCLUDED."categoryId", country = EXCLUDED.country,
          language = EXCLUDED.language, quality = EXCLUDED.quality, "epgId" = EXCLUDED."epgId",
          "streamType" = 'HLS', "streamUrl" = EXCLUDED."streamUrl", status = 'ACTIVE', "updatedAt" = now()`;
    }));
  });
  console.log(`Channels upserted: ${kept.length}`);

  // 7. Retire channels that disappeared from the line
  const importedIds = new Set(kept.map((s) => 'geoch_' + s.stream_id));
  const rows = await sql`SELECT id FROM "Channel" WHERE id LIKE 'geoch_%' AND status = 'ACTIVE'`;
  const gone = rows.map((r: { id: string }) => r.id).filter((id: string) => !importedIds.has(id));
  for (const id of gone) {
    await sql`UPDATE "Channel" SET status = 'INACTIVE', "updatedAt" = now() WHERE id = ${id}`;
  }

  const totals = await sql`
    SELECT
      (SELECT count(*) FROM "Channel" WHERE status = 'ACTIVE') AS active_channels,
      (SELECT count(*) FROM "Channel" WHERE id LIKE 'geoch_%') AS geo_channels,
      (SELECT count(*) FROM "ChannelCategory" WHERE id LIKE 'geocat_%') AS geo_categories`;
  console.log('IMPORT DONE:', JSON.stringify(totals[0]), `retired=${gone.length}`);
}

main().catch((e) => {
  console.error('IMPORT FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
