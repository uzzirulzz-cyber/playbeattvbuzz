import { issueCaptcha } from '@/lib/captcha';

// Bot verification: issue a fresh distorted-SVG challenge (stateless token).
export function GET() {
  const c = issueCaptcha();
  return new Response(JSON.stringify({ ok: true, data: c }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
