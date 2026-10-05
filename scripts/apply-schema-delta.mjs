/**
 * Targeted schema delta for the PLAYBEATTV Next.js platform (Prisma-managed tables)
 * — avoids `prisma db push` because the shared Neon database also hosts the
 * Express platform's tables (users, watch_history, packages, …) which db push
 * would try to DROP as drift. We only add what this feature needs:
 *   - "Order"."txid" TEXT NOT NULL DEFAULT ''
 *   - "ChannelCategory"."isAdult" BOOLEAN NOT NULL DEFAULT false
 * Run: node scripts/apply-schema-delta.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('postgresql')) {
  console.error('DATABASE_URL (postgresql://…) required');
  process.exit(1);
}
const sql = neon(url);

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name`;
const names = tables.map((t) => t.table_name);
console.log('tables:', names.join(', '));

const need = ['Order', 'ChannelCategory'];
for (const t of need) {
  if (!names.includes(t)) {
    console.error(`✖ required table "${t}" missing — aborting`);
    process.exit(1);
  }
}

await sql`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "txid" TEXT NOT NULL DEFAULT ''`;
await sql`ALTER TABLE "ChannelCategory" ADD COLUMN IF NOT EXISTS "isAdult" BOOLEAN NOT NULL DEFAULT false`;
console.log('✔ Order.txid + ChannelCategory.isAdult ensured');

const cols = await sql`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema='public' AND ((table_name='Order' AND column_name='txid') OR (table_name='ChannelCategory' AND column_name='isAdult'))`;
console.log('verified:', cols.map((c) => `${c.table_name}.${c.column_name}`).join(', '));
