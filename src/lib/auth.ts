import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

// ─── Config (never hardcode secrets in client code; server-only module) ───

const JWT_SECRET = process.env.JWT_SECRET || 'pbtv-dev-secret-change-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);
export const SESSION_COOKIE = 'pbtv_session';
const TOKEN_TTL = '7d';

// ─── Password hashing ───────────────────────────────────────

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return bcrypt.compareSync(pw, hash);
}

// ─── JWT ────────────────────────────────────────────────────

export type TokenPayload = {
  sub: string;
  email: string;
  role: string;
  tv: number; // tokenVersion for global revocation
};

export async function signToken(p: TokenPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Session resolution ─────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  phone: string;
  twoFactor: boolean;
};

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!m) return null;
  const payload = await verifyToken(decodeURIComponent(m[1]));
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
  if (!user || user.status !== 'ACTIVE') return null;
  if (user.tokenVersion !== payload.tv) return null; // sessions revoked
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    status: user.status,
    phone: user.phone,
    twoFactor: user.twoFactor,
  };
}

export const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN', 'STAFF'];

export async function requireAuth(req: Request): Promise<SessionUser> {
  const u = await getSessionUser(req);
  if (!u) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required.');
  return u;
}

export async function requireAdmin(req: Request): Promise<SessionUser> {
  const u = await requireAuth(req);
  if (!ADMIN_ROLES.includes(u.role)) throw new ApiError(403, 'FORBIDDEN', 'Admin access required.');
  return u;
}

// ─── Structured API errors & responses ──────────────────────

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

export function jsonErr(err: unknown) {
  if (err instanceof ApiError) {
    return new Response(JSON.stringify({ ok: false, error: { code: err.code, message: err.message } }), {
      status: err.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  console.error('[api]', err);
  return new Response(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'Something went wrong.' } }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Rate limiting (in-memory sliding window) ───────────────

const buckets = new Map<string, number[]>();

export function rateLimit(req: Request, bucket: string, limit: number, windowMs: number) {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please slow down and try again shortly.');
  }
  arr.push(now);
  buckets.set(key, arr);
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

// ─── Login lockout ──────────────────────────────────────────

const loginFails = new Map<string, { n: number; until: number }>();

export function checkLockout(key: string) {
  const rec = loginFails.get(key);
  if (rec && rec.until > Date.now()) {
    const mins = Math.ceil((rec.until - Date.now()) / 60000);
    throw new ApiError(423, 'LOCKED', `Account temporarily locked. Try again in ${mins} minute(s).`);
  }
}

export function recordLoginFail(key: string) {
  const rec = loginFails.get(key) || { n: 0, until: 0 };
  rec.n += 1;
  if (rec.n >= 5) {
    rec.until = Date.now() + 10 * 60 * 1000;
    rec.n = 0;
  }
  loginFails.set(key, rec);
}

export function clearLoginFails(key: string) {
  loginFails.delete(key);
}

// ─── Audit logging ──────────────────────────────────────────

export async function writeAudit(
  req: Request,
  actor: SessionUser | null,
  action: string,
  entity = '',
  entityId = '',
  meta: Record<string, unknown> = {},
) {
  try {
    await db.auditLog.create({
      data: {
        userId: actor?.id || null,
        actorEmail: actor?.email || 'anonymous',
        action,
        entity,
        entityId,
        meta: JSON.stringify(meta),
        ip: getClientIp(req),
      },
    });
  } catch (e) {
    console.error('[audit]', e);
  }
}

// ─── Misc helpers ───────────────────────────────────────────

// ─── Entitlement helpers ────────────────────────────────────

/** True when the user currently holds an ACTIVE, unexpired subscription. */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await db.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return !!sub;
}

export function intParam(v: string | null, def: number, min: number, max: number): number {
  const n = parseInt(v || '', 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export function csv(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join(',');
  return String(v ?? '');
}

export function parsePage(req: Request) {
  const url = new URL(req.url);
  return {
    page: intParam(url.searchParams.get('page'), 1, 1, 100000),
    size: intParam(url.searchParams.get('size'), 12, 1, 100),
    q: (url.searchParams.get('q') || '').trim(),
    url,
  };
}
