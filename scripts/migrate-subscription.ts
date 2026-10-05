/**
 * PLAYBEATTV — single-membership migration ("there is no subscription tiers,
 * everything is fully accessible … $12/month, crypto only").
 *
 *  1. Deactivates every existing plan (incl. Free Trial) and upserts ONE active
 *     plan: "All Members Access" — $12/month, everything unlocked (incl. 18+).
 *  2. Seeds the public Bitcoin collection address + payment instructions
 *     (public info by design — shown on checkout & payment pages).
 *  3. Flags adult channel categories (isAdult=true) so they stay member-only.
 *
 * Run: npx tsx scripts/migrate-subscription.ts
 */
import { initDb, db } from '../src/lib/db';

const BTC_ADDRESS = 'bc1qa6hnzcxn9zkvj4jkwx805g45239ghq7z5rkcfs';

const ADULT_RE = /adult|xxx|porn|18\+|erotic|nsfw/i;

async function main() {
  await initDb();

  // ── 1. Single All-Access plan ─────────────────────────────
  const allPlans = await db.plan.findMany({ select: { id: true, name: true, slug: true, price: true } });
  console.log(`Found ${allPlans.length} plans:`, allPlans.map((p) => `${p.name}($${p.price})`).join(', '));

  await db.plan.updateMany({ data: { status: 'INACTIVE' } });

  const features = JSON.stringify([
    'Everything included — all live channels, movies & series',
    'Adult section (18+) included',
    'Full HD & 4K quality streams',
    '1 concurrent device',
    'Cancel anytime — no auto-renewal lock-in',
  ]);

  const existing = await db.plan.findUnique({ where: { slug: 'all-members-access' } });
  const plan = existing
    ? await db.plan.update({
        where: { slug: 'all-members-access' },
        data: {
          name: 'All Members Access',
          description: 'One membership. Everything unlocked — including the 18+ section.',
          price: 12, currency: 'USD', billingPeriod: 'MONTHLY',
          deviceLimit: 1, quality: 'FULL HD', features,
          trialDays: 0, autoRenewal: false, status: 'ACTIVE',
        },
      })
    : await db.plan.create({
        data: {
          name: 'All Members Access',
          slug: 'all-members-access',
          description: 'One membership. Everything unlocked — including the 18+ section.',
          price: 12, currency: 'USD', billingPeriod: 'MONTHLY',
          deviceLimit: 1, quality: 'FULL HD', features,
          trialDays: 0, autoRenewal: false, status: 'ACTIVE',
        },
      });
  console.log(`✔ Single active plan: ${plan.name} — $${plan.price}/${plan.billingPeriod.toLowerCase()} (${plan.id})`);

  // ── 2. Bitcoin payment settings (public info) ─────────────
  await db.setting.upsert({
    where: { key: 'btc_address' },
    create: { key: 'btc_address', value: BTC_ADDRESS },
    update: { value: BTC_ADDRESS },
  });
  await db.setting.upsert({
    where: { key: 'payment_instructions' },
    create: {
      key: 'payment_instructions',
      value: JSON.stringify({
        method: 'crypto_btc',
        note: 'Send exactly $12.00 worth of BTC (mainnet) to the address shown at checkout, then submit your transaction ID (TXID). Your All-Access subscription is activated right after verification.',
      }),
    },
    update: {
      value: JSON.stringify({
        method: 'crypto_btc',
        note: 'Send exactly $12.00 worth of BTC (mainnet) to the address shown at checkout, then submit your transaction ID (TXID). Your All-Access subscription is activated right after verification.',
      }),
    },
  });
  console.log('✔ BTC address + payment instructions seeded');

  // ── 3. Adult category flags ───────────────────────────────
  const cats = await db.channelCategory.findMany({ select: { id: true, name: true, slug: true, isAdult: true } });
  const adultCats = cats.filter((c) => ADULT_RE.test(c.name) || ADULT_RE.test(c.slug));
  for (const c of adultCats) {
    await db.channelCategory.update({ where: { id: c.id }, data: { isAdult: true } });
  }
  console.log(`✔ ${adultCats.length}/${cats.length} categories flagged 18+:`, adultCats.map((c) => c.slug).join(', ') || '(none)');

  console.log('\nDone. Platform is now single-membership: $12/month, BTC-only, everything unlocked.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => process.exit(0));
