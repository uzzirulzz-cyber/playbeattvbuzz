export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'workerd' || process.env.NEXT_RUNTIME === 'edge') {
    const { initDb } = await import('@/lib/db');
    await initDb();
  }
}
