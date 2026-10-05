import { ApiError, jsonErr, jsonOk, rateLimit } from '@/lib/auth';

/** Privacy-safe forgot-password: always 200, rate-limited, never reveals account existence. */
export async function POST(req: Request) {
  try {
    rateLimit(req, 'forgot', 5, 300_000);
    await req.json().catch(() => ({}));
    return jsonOk({ sent: true });
  } catch (e) {
    if (e instanceof ApiError) return jsonErr(e);
    return jsonErr(e);
  }
}
