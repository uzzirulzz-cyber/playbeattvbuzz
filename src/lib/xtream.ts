/**
 * Xtream Masters reseller API client (v3) — server-only module.
 *
 * Credentials live in environment variables and are NEVER exposed to the browser:
 *   XTREAM_API_URL  (default https://iptv-api.xtream-masters.com/v3/)
 *   XTREAM_API_KEY  reseller api key
 *   XTREAM_PORTAL_HOST  portal host used to build playlist links shown to customers
 *
 * Line plans: 11=24h trial(0cr) 1=1mo(1cr) 2=3mo(3cr) 3=6mo(5cr) 4=12mo(10cr)
 * Default package: bid=[5,11] full worldwide Channels+Movies+Series WITHOUT adult.
 * Adult packages are never used unless XTREAM_ALLOW_ADULT=1 is explicitly set.
 */

const API_URL = process.env.XTREAM_API_URL || 'https://iptv-api.xtream-masters.com/v3/';
const API_KEY = process.env.XTREAM_API_KEY || '';
const PORTAL_HOST = process.env.XTREAM_PORTAL_HOST || 'xtream-masters.com/webplayer';
const ALLOW_ADULT = process.env.XTREAM_ALLOW_ADULT === '1';

export type XtreamPlan = 11 | 1 | 2 | 3 | 4;
export type XtreamLineType = 'xtream' | 'activecode' | 'mac';

export type XtreamInfo = {
  allow_trial?: string;
  used_trial?: string;
  user_credit?: string;
  api_username?: string;
  is_monthly?: string;
  monthly_max_lines?: string;
  api_status?: string;
  next_renewal?: string;
  total_paid_lines?: string;
};

export type XtreamResult = {
  ok: boolean;
  status: 'success' | 'error' | 'empty';
  msg: string;
  raw: unknown;
};

function slugRandom(len = 6): string {
  return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, len);
}

export function generateXtreamCredentials(prefix = 'pb'): { user: string; pass: string } {
  const clean = (s: string) => s.replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 12);
  return {
    user: `${clean(prefix)}${slugRandom(8)}`,
    pass: `${slugRandom(10)}${slugRandom(2)}`,
  };
}

async function call(params: Record<string, string | number | undefined>): Promise<XtreamResult> {
  if (!API_KEY) {
    return { ok: false, status: 'error', msg: 'XTREAM_API_KEY is not configured on the server.', raw: null };
  }
  const qs = new URLSearchParams();
  qs.set('apikey', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = `${API_URL}?${qs.toString()}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(20000),
      headers: { accept: 'application/json, text/html' },
      cache: 'no-store',
    });
    const text = await res.text();
    if (!text.trim()) {
      // Provider returns an empty body for unknown/invalid api keys
      return { ok: false, status: 'empty', msg: 'Provider returned an empty response (check the API key).', raw: null };
    }
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      if (json.status === 'success') return { ok: true, status: 'success', msg: String(json.msg || 'Success'), raw: json };
      if (json.status === 'error') return { ok: false, status: 'error', msg: String(json.msg || 'Provider rejected the request.'), raw: json };
      // array/object payloads (infoapi, credit_logs)
      return { ok: true, status: 'success', msg: 'OK', raw: json };
    } catch {
      // Non-JSON (HTML portal page etc.)
      return { ok: res.ok, status: res.ok ? 'success' : 'error', msg: res.ok ? 'Non-JSON provider response.' : `HTTP ${res.status}`, raw: text.slice(0, 400) };
    }
  } catch (e) {
    return { ok: false, status: 'error', msg: e instanceof Error ? e.message : 'Provider request failed.', raw: null };
  }
}

// ─── Account / credits ──────────────────────────────────────

export async function getInfo(): Promise<{ ok: boolean; info?: XtreamInfo; msg: string }> {
  const r = await call({ type: 'infoapi' });
  if (!r.ok) return { ok: false, msg: r.msg };
  const raw = r.raw as XtreamInfo;
  if (!raw || typeof raw !== 'object' || (!raw.user_credit && !raw.api_username)) {
    return { ok: false, msg: 'Unexpected info payload — verify the API key.' };
  }
  return { ok: true, info: raw, msg: 'OK' };
}

export async function getCreditLogs(): Promise<{ ok: boolean; logs?: unknown[]; msg: string }> {
  const r = await call({ type: 'credit_logs' });
  if (!r.ok) return { ok: false, msg: r.msg };
  const raw = r.raw;
  return { ok: true, logs: Array.isArray(raw) ? raw : [], msg: 'OK' };
}

// ─── Xtream user lines ──────────────────────────────────────

export type AddLineParams = {
  user: string;
  pass: string;
  plan: XtreamPlan;
  connections?: number; // 1..4
  notice?: string;
  adult?: boolean;
};

/** Generate a new xtream user line. Default package bid=[5,11]: worldwide, NO adult. */
export async function addXtreamLine(p: AddLineParams): Promise<XtreamResult> {
  const conx = Math.max(1, Math.min(4, p.connections || 1));
  return call({
    type: 'add',
    user: p.user,
    pass: p.pass,
    conx,
    plan: p.plan,
    bid: '[5,11]',
    addch: 1,
    addvods: 1,
    adults: p.adult && ALLOW_ADULT ? 1 : '',
    notice: p.notice || 'PLAYBEATTV',
  });
}

export async function editXtreamLine(user: string, newUser: string | undefined, newPass: string | undefined, notice?: string): Promise<XtreamResult> {
  return call({ type: 'edit', user, newuser: newUser, pass: newPass, notice });
}

export async function extendXtreamLine(user: string, plan: Exclude<XtreamPlan, 11>): Promise<XtreamResult> {
  return call({ type: 'extend', user, plan });
}

export async function deleteXtreamLine(user: string, force = false): Promise<XtreamResult> {
  return call({ type: 'del', user, force: force ? 1 : undefined });
}

// ─── ActiveCode lines ───────────────────────────────────────

export async function addActiveCode(plan: XtreamPlan, connections = 1, callbackB64?: string, notice?: string): Promise<XtreamResult> {
  return call({
    type: 'activecode',
    pass: 'TVSTARIPTV',
    plan,
    conx: Math.max(1, Math.min(4, connections)),
    bid: '[5,11]',
    addch: 1,
    addvods: 1,
    notice: notice || 'PLAYBEATTV',
    callback: callbackB64,
  });
}

export async function extendActiveCode(code: string, plan: Exclude<XtreamPlan, 11>): Promise<XtreamResult> {
  return call({ type: 'extendac', user: code, plan });
}

export async function deleteActiveCode(code: string, force = false): Promise<XtreamResult> {
  return call({ type: 'delac', user: code, force: force ? 1 : undefined });
}

// ─── MAC address lines ──────────────────────────────────────

export const MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export async function addMac(address: string, plan: XtreamPlan, notice?: string): Promise<XtreamResult> {
  if (!MAC_RE.test(address)) return { ok: false, status: 'error', msg: 'MAC must look like 00:AA:BB:CC:DD:11', raw: null };
  return call({
    type: 'addmac',
    mac: 1,
    address,
    plan,
    bid: '[5,11]',
    addch: 1,
    addvods: 1,
    notice: notice || 'PLAYBEATTV',
  });
}

export async function editMac(oldAddress: string, newAddress: string, notice?: string): Promise<XtreamResult> {
  return call({ type: 'editmac', user: oldAddress, newuser: newAddress, notice });
}

export async function extendMac(address: string, plan: Exclude<XtreamPlan, 11>): Promise<XtreamResult> {
  return call({ type: 'extendmac', user: address, plan });
}

export async function deleteMac(address: string, force = false): Promise<XtreamResult> {
  return call({ type: 'delmac', user: address, force: force ? 1 : undefined });
}

// ─── Mapping helpers ────────────────────────────────────────

export function billingPeriodToPlan(billingPeriod: string): XtreamPlan {
  switch (billingPeriod) {
    case 'MONTHLY': return 1;
    case 'QUARTERLY': return 2;
    case 'SEMIANNUALLY': return 3;
    case 'YEARLY': return 4;
    default: return 1;
  }
}

export function playlistLinks(xtreamUser: string, xtreamPass: string) {
  const host = PORTAL_HOST.replace(/^https?:\/\//, '');
  return {
    m3u: `http://${host}/get.php?username=${encodeURIComponent(xtreamUser)}&password=${encodeURIComponent(xtreamPass)}&type=m3u_plus&output=ts`,
    epg: `http://${host}/xmltv.php?username=${encodeURIComponent(xtreamUser)}&password=${encodeURIComponent(xtreamPass)}`,
    webplayer: `https://${PORTAL_HOST.includes('/') ? PORTAL_HOST : `${PORTAL_HOST}/webplayer/`}`,
    portal: `http://${host}/player_api.php?username=${encodeURIComponent(xtreamUser)}&password=${encodeURIComponent(xtreamPass)}`,
  };
}
