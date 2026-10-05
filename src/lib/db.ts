import { PrismaClient } from '@prisma/client';

/**
 * Dual-runtime Prisma client:
 *  - Node (sandbox/VM): standard client
 *  - Cloudflare Workers (OpenNext): PrismaNeon driver adapter over Hyperdrive/Neon
 * initDb() is called once from instrumentation.ts before any query runs.
 */

const globalForPrisma = globalThis as unknown as { __pbtvPrisma?: PrismaClient };

export function initDb(): Promise<void> {
  if (globalForPrisma.__pbtvPrisma) return Promise.resolve();
  if (process.env.NEXT_RUNTIME === 'workerd' || process.env.DEPLOY_TARGET === 'cloudflare') {
    return (async () => {
      const { neon } = await import('@neondatabase/serverless');
      const { PrismaNeon } = await import('@prisma/adapter-neon');
      const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
      globalForPrisma.__pbtvPrisma = new PrismaClient({ adapter });
    })();
  }
  globalForPrisma.__pbtvPrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
  return Promise.resolve();
}

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = globalForPrisma.__pbtvPrisma;
    if (!client) throw new Error('Database not initialized (initDb() pending).');
    const v = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(client) : v;
  },
});
