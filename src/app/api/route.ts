import { db } from '@/lib/db';
import { jsonOk } from '@/lib/auth';

export async function GET() {
  const t = Date.now();
  await db.setting.count().catch(() => null);
  return jsonOk({ service: 'PLAYBEATTV', status: 'healthy', latencyMs: Date.now() - t, time: new Date().toISOString() });
}
