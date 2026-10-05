import { db } from '@/lib/db';
import { ApiError, getSessionUser } from '@/lib/auth';
import { getEntitlement } from '@/lib/adminCrud';
import { checkToken, sig, unb64url } from '@/lib/streamSign';

/**
 * Backend stream proxy — the ONLY path through which provider streams reach a
 * browser. The distribution-line credentials (PBTV_LINE_*) live in env vars and
 * are injected here, server-side. They are never present in any URL the client
 * sees: HLS playlists are rewritten so every segment is re-wrapped in a signed
 * /api/stream/seg route, and VOD/episode media are piped with Range support.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOST = () => (process.env.PBTV_LINE_HOST || '').replace(/\/+$/, '');
const USER = () => process.env.PBTV_LINE_USER || '';
const PASS = () => process.env.PBTV_LINE_PASS || '';
const UA = 'PLAYBEATTV/1.0';

function fail(status: number, code: string, message: string) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

/** Entitlement gate for a live channel referenced by its proxy id. */
async function gateLive(req: Request, sid: string) {
  const session = await getSessionUser(req);
  if (!session) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to watch.');
  const ch = await db.channel.findFirst({ where: { streamUrl: `xtream://live/${sid}`, status: 'ACTIVE' } });
  if (!ch) throw new ApiError(404, 'NOT_FOUND', 'Channel not found.');
  if (!ch.isFree) {
    const ent = await getEntitlement(session.id);
    if (!ent.hasActive) throw new ApiError(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required to watch this channel.');
  }
  return { session, ch };
}

function segWrap(u: string, base: URL, exp: number): string {
  const abs = new URL(u, base).toString();
  if (!/^https?:/i.test(abs)) return u;
  // payload must match checkToken('seg', abs, '', e, k) → "seg|<abs>||<exp>"
  return `/api/stream/seg?u=${encodeURIComponent(Buffer.from(abs, 'utf8').toString('base64url'))}&e=${exp}&k=${sig(`seg|${abs}||${exp}`)}`;
}

function rewritePlaylist(text: string, base: URL): string {
  const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
  return text
    .split('\n')
    .map((raw) => {
      const line = raw.trimEnd();
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) return t.replace(/URI="([^"]+)"/g, (_m, u: string) => `URI="${segWrap(u, base, exp)}"`);
      return segWrap(t, base, exp);
    })
    .join('\n');
}

async function pipe(
  upstreamUrl: string,
  req: Request,
  opts: { range?: boolean; timeoutMs?: number } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'User-Agent': UA };
  if (opts.range && req.headers.get('range')) headers.Range = req.headers.get('range') as string;
  const up = await fetch(upstreamUrl, {
    redirect: 'follow',
    headers,
    cache: 'no-store',
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  });
  if (!up.ok || !up.body) {
    return fail(502, 'UPSTREAM_UNAVAILABLE', 'The stream is not available right now. Please try again.');
  }
  const h = new Headers();
  for (const x of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(x);
    if (v) h.set(x, v);
  }
  if (!h.has('Content-Type')) h.set('Content-Type', 'video/mp2t');
  h.set('Cache-Control', 'no-store');
  return new Response(up.body, { status: up.status, headers: h });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    if (!HOST() || !USER() || !PASS()) {
      return fail(503, 'SOURCE_NOT_CONFIGURED', 'No provider line is configured on the server.');
    }
    const { path } = await ctx.params;
    const url = new URL(req.url);
    const [kind, file] = path;

    // ── Signed segment passthrough (playlist-referenced) ────────────────
    if (kind === 'seg') {
      const u = url.searchParams.get('u');
      const e = url.searchParams.get('e');
      const k = url.searchParams.get('k');
      if (!u || !e || !k) return fail(400, 'BAD_REQUEST', 'Missing segment token.');
      const abs = unb64url(u);
      if (!/^https?:/i.test(abs)) return fail(400, 'BAD_REQUEST', 'Invalid segment.');
      if (!checkToken('seg', abs, '', e, k)) return fail(403, 'BAD_SIGNATURE', 'Stream token expired — reload the player.');
      return pipe(abs, req, { timeoutMs: 30000 });
    }

    if (!file) return fail(400, 'BAD_REQUEST', 'Malformed stream path.');
    const dot = file.lastIndexOf('.');
    const id = dot > 0 ? file.slice(0, dot) : file;
    const ext = dot > 0 ? file.slice(dot + 1) : '';

    // ── Live channel: HLS playlist (rewritten) or TS passthrough ───────
    if (kind === 'live') {
      await gateLive(req, id);
      if (ext === 'm3u8') {
        const up = await fetch(`${HOST()}/live/${USER()}/${PASS()}/${id}.m3u8`, {
          redirect: 'follow', cache: 'no-store', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000),
        });
        if (!up.ok) return fail(502, 'UPSTREAM_UNAVAILABLE', 'Live playlist unavailable.');
        const base = new URL(up.url);
        const text = await up.text();
        return new Response(rewritePlaylist(text, base), {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' },
        });
      }
      return pipe(`${HOST()}/live/${USER()}/${PASS()}/${id}.ts`, req, { timeoutMs: 30000 });
    }

    // ── VOD movie / series episode: Range-aware passthrough ────────────
    if (kind === 'movie' || kind === 'ep') {
      const session = await getSessionUser(req);
      if (!session) return fail(401, 'UNAUTHORIZED', 'Sign in to watch.');
      const ent = await getEntitlement(session.id);
      if (!ent.hasActive) return fail(402, 'SUBSCRIPTION_REQUIRED', 'An active subscription is required.');
      const prefix = kind === 'movie' ? 'xtream://vod/' : 'xtream://ep/';
      const ref = kind === 'movie'
        ? await db.movie.findFirst({ where: { playbackUrl: { startsWith: `${prefix}${id}/` }, status: 'PUBLISHED' } })
        : await db.episode.findFirst({ where: { playbackUrl: { startsWith: `${prefix}${id}/` } } });
      if (!ref) return fail(404, 'NOT_FOUND', 'Media not found.');
      const seg = kind === 'movie' ? 'movie' : 'series';
      return pipe(`${HOST()}/${seg}/${USER()}/${PASS()}/${id}.${ext || 'mp4'}`, req, { range: true });
    }

    return fail(404, 'NOT_FOUND', 'Unknown stream route.');
  } catch (e) {
    if (e instanceof ApiError) {
      return Response.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status });
    }
    return Response.json(
      { ok: false, error: { code: 'STREAM_ERROR', message: e instanceof Error ? e.message : 'Stream proxy failed.' } },
      { status: 500 },
    );
  }
}

// Player never needs to mutate through the proxy
export async function POST() {
  return fail(405, 'METHOD_NOT_ALLOWED', 'Use GET.');
}
