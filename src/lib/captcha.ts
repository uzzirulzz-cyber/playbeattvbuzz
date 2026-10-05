import crypto from 'crypto';
import { ApiError } from '@/lib/auth';

/**
 * Bot verification (human check) — dependency-free distorted-SVG captcha.
 *
 * Serverless-friendly: fully stateless. The issued token is
 *   base64url(`${code}.${expiryMs}.${nonce}`) + '.' + HMAC-SHA256(payload, JWT_SECRET)
 * Verification recomputes the HMAC and compares the (single) answer.
 * Tokens are short-lived (10 min) and the code is never sent to the client in
 * machine-readable form — only as a distorted SVG image.
 */

const SECRET = process.env.JWT_SECRET || 'pbtv-dev-secret-change-in-production';
const TTL_MS = 10 * 60 * 1000;
// No 0/O, 1/I/L — avoids ambiguous reads
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function hmac(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function rand(min: number, max: number): number {
  return min + crypto.randomInt(max - min + 1);
}

function renderSvg(code: string): string {
  const W = 220;
  const H = 74;
  const glyphs = code.split('').map((ch, i) => {
    const x = 22 + i * 30 + rand(-4, 4);
    const y = 48 + rand(-6, 6);
    const rot = rand(-28, 28);
    const colors = ['#5b3df5', '#e11d48', '#0f766e', '#b45309', '#1d4ed8', '#7c3aed'];
    const color = colors[(i + rand(0, 5)) % colors.length];
    return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" fill="${color}" font-family="Georgia, 'Times New Roman', serif" font-size="${rand(30, 38)}" font-weight="700">${ch}</text>`;
  });

  const strokes: string[] = [];
  for (let i = 0; i < 3; i++) {
    strokes.push(
      `<path d="M0 ${rand(10, 64)} Q ${W / 2} ${rand(6, 68)} ${W} ${rand(10, 64)}" stroke="#94a3b8" stroke-width="1" fill="none" opacity="0.7" />`,
    );
  }
  const dots: string[] = [];
  for (let i = 0; i < 60; i++) {
    dots.push(`<circle cx="${rand(0, W)}" cy="${rand(0, H)}" r="${rand(0.6, 1.6)}" fill="#64748b" opacity="${rand(20, 55) / 100}" />`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="verification code">` +
    `<rect width="${W}" height="${H}" rx="10" fill="#f1f3fb" />` +
    dots.join('') + strokes.join('') + glyphs.join('') +
    '</svg>';
}

export function issueCaptcha(): { svg: string; token: string } {
  const code = Array.from({ length: 6 }, () => CHARS[crypto.randomInt(CHARS.length)]).join('');
  const exp = Date.now() + TTL_MS;
  const nonce = crypto.randomBytes(4).toString('hex');
  const payload = `${code}.${exp}.${nonce}`;
  const token = `${Buffer.from(payload).toString('base64url')}.${hmac(payload)}`;
  return { svg: renderSvg(code), token };
}

export function verifyCaptcha(token: string, answer: string): void {
  const reject = (msg: string) => { throw new ApiError(400, 'CAPTCHA', msg); };
  if (!token || !answer) reject('Please complete the bot verification (security code).');
  const parts = String(token).split('.');
  if (parts.length !== 2) reject('Security code is invalid — please refresh and try again.');
  const [b64, sig] = parts;
  let payload = '';
  try {
    payload = Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    reject('Security code is invalid — please refresh and try again.');
  }
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    reject('Security code is invalid — please refresh and try again.');
  }
  const seg = payload.split('.');
  if (seg.length !== 3) reject('Security code is invalid — please refresh and try again.');
  const exp = Number(seg[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    reject('Security code expired — please refresh and try again.');
  }
  const clean = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');
  if (clean(answer) !== clean(seg[0])) {
    reject('Security code does not match — try again or refresh for a new code.');
  }
}
