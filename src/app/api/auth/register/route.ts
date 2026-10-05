import { db } from '@/lib/db';
import {
  ApiError, hashPassword, jsonErr, jsonOk, rateLimit, writeAudit,
  signToken, SESSION_COOKIE,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    rateLimit(req, 'register', 10, 60_000);
    const body = (await req.json()) as Record<string, string>;
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const password = body.password || '';
    const confirm = body.confirmPassword || '';
    const terms = body.terms;

    if (!name || name.length < 2) throw new ApiError(400, 'VALIDATION', 'Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'VALIDATION', 'Please enter a valid email address.');
    if (phone && phone.replace(/\D/g, '').length < 7) throw new ApiError(400, 'VALIDATION', 'Please enter a valid phone number.');
    if (password.length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be at least 8 characters.');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new ApiError(400, 'VALIDATION', 'Password must contain letters and numbers.');
    if (password !== confirm) throw new ApiError(400, 'VALIDATION', 'Passwords do not match.');
    if (!terms) throw new ApiError(400, 'VALIDATION', 'You must accept the Terms & Privacy Policy.');

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) throw new ApiError(409, 'CONFLICT', 'An account with this email already exists. Try signing in.');

    const role = await db.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
    const user = await db.user.create({
      data: {
        email, name, phone, roleId: role.id,
        passwordHash: hashPassword(password),
        billing: JSON.stringify({ address: body.address || '', city: body.city || '', country: body.country || '', zip: body.zip || '' }),
      },
    });

    await db.notification.create({
      data: { userId: user.id, channel: 'INAPP', title: 'Welcome to PLAYBEATTV 🎬', body: 'Your account is ready. Pick a plan to start streaming.' },
    });
    const session = { id: user.id, email, name, role: 'CUSTOMER', status: 'ACTIVE', phone, twoFactor: false };
    await writeAudit(req, session, 'auth.register', 'user', user.id, {});

    const token = await signToken({ sub: user.id, email: user.email, role: 'CUSTOMER', tv: user.tokenVersion });
    const res = jsonOk({ user: { id: user.id, email: user.email, name: user.name, role: 'CUSTOMER' } });
    res.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`,
    );
    return res;
  } catch (e) {
    return jsonErr(e);
  }
}
