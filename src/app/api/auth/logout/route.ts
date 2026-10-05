import { SESSION_COOKIE, jsonOk } from '@/lib/auth';

export async function POST() {
  const res = jsonOk({ loggedOut: true });
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
