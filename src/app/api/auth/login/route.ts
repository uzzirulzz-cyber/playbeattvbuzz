import { db } from '@/lib/db';
import {
  ApiError, checkLockout, clearLoginFails, jsonErr, jsonOk, rateLimit,
  recordLoginFail, signToken, SESSION_COOKIE, verifyPassword, writeAudit,
} from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha';

export async function POST(req: Request) {
  try {
    rateLimit(req, 'login', 15, 60_000);
    const body = (await req.json()) as { email?: string; password?: string; remember?: boolean; captchaToken?: string; captchaAnswer?: string };
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    if (!email || !password) throw new ApiError(400, 'VALIDATION', 'Email and password are required.');

    // Bot verification (human check) — required on every sign-in
    verifyCaptcha(String(body.captchaToken || ''), String(body.captchaAnswer || ''));

    checkLockout(email);
    const user = await db.user.findUnique({ where: { email }, include: { role: true } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordLoginFail(email);
      throw new ApiError(401, 'BAD_CREDENTIALS', 'Invalid email or password.');
    }
    if (user.status !== 'ACTIVE') {
      throw new ApiError(403, 'SUSPENDED', 'This account is suspended. Contact support.');
    }
    clearLoginFails(email);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedLogins: 0 } });

    const session = {
      id: user.id, email: user.email, name: user.name, role: user.role.name,
      status: user.status, phone: user.phone, twoFactor: user.twoFactor,
    };
    await writeAudit(req, session, 'auth.login', 'user', user.id, { remember: body.remember === true });

    const token = await signToken({ sub: user.id, email: user.email, role: user.role.name, tv: user.tokenVersion });
    const maxAge = body.remember === true ? 30 * 86400 : 7 * 86400;
    const res = jsonOk({
      user: { id: user.id, email: user.email, name: user.name, role: user.role.name, twoFactor: user.twoFactor },
      redirect: ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(user.role.name) ? '#/admin' : '#/account',
    });
    res.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
    );
    return res;
  } catch (e) {
    return jsonErr(e);
  }
}
