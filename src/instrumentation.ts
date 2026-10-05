export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Local/dev sandbox hygiene: parent shells may export a stale DATABASE_URL
    // (e.g. the old SQLite file). .env is the source of truth here; on Vercel no
    // .env file ships, so this is a no-op in production.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as typeof import('node:fs');
      const txt = fs.readFileSync('.env', 'utf8');
      for (const line of txt.split('\n')) {
        if (!line || line.trim().startsWith('#')) continue;
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let v = m[2];
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        process.env[m[1]] = v;
      }
    } catch {
      /* .env not present (production) — keep platform env */
    }
    const { initDb } = await import('@/lib/db');
    await initDb();
  } else if (process.env.NEXT_RUNTIME === 'workerd' || process.env.NEXT_RUNTIME === 'edge') {
    const { initDb } = await import('@/lib/db');
    await initDb();
  }
}
