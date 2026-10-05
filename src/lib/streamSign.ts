import crypto from 'node:crypto';

/**
 * Short-lived signed playback tokens (server-only).
 *
 * play.ts hands entitled viewers proxy URLs of the form
 *   /api/stream/<kind>/<id>.<ext>?e=<exp>&k=<sig>
 * where sig = HMAC-SHA256(JWT_SECRET, "<kind>|<id>|<uid>|<exp>"). The provider
 * line credentials NEVER leave the server: the proxy route injects them and
 * rewrites HLS playlists so every segment flows back through /api/stream/seg.
 */
const SECRET = process.env.JWT_SECRET || 'pbtv-dev-secret-change-in-production';

export function sig(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function makeToken(kind: string, id: string, uid: string, ttlSec = 6 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return { exp, k: sig(`${kind}|${id}|${uid}|${exp}`) };
}

export function checkToken(kind: string, id: string, uid: string, exp: string | null, k: string | null): boolean {
  const e = Number(exp);
  if (!e || e < Math.floor(Date.now() / 1000) || !k) return false;
  const want = sig(`${kind}|${id}|${uid}|${e}`);
  return want.length === k.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(k));
}

export function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

export function unb64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}
