/**
 * PLAYBEATTV seed — idempotent (wipes + recreates demo data)
 * Run: bun scripts/seed.ts
 *
 * Content policy: every stream below is a PUBLIC DEMO/TEST stream published by
 * CDN vendors (Mux, Apple, Unified Streaming, Bitmovin) for player development.
 * No pirated or unauthorized streams. Replace via Admin → Channels with your
 * licensed provider sources.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const HLS = {
  pts: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
  bunny: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  mux1: 'https://test-streams.mux.dev/test_001/stream.m3u8',
  apple: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  tears: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  sintel: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  motion: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
};
const DEMO_NOTE = 'Demo test stream (vendor sample) — replace with your licensed provider source in Admin → Channels.';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  console.log('Seeding PLAYBEATTV…');

  // wipe (order matters for FKs)
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.ticketMessage.deleteMany();
  await db.supportTicket.deleteMany();
  await db.watchHistory.deleteMany();
  await db.favorite.deleteMany();
  await db.device.deleteMany();
  await db.subscription.deleteMany();
  await db.invoice.deleteMany();
  await db.payment.deleteMany();
  await db.order.deleteMany();
  await db.coupon.deleteMany();
  await db.epgSyncLog.deleteMany();
  await db.epgProgram.deleteMany();
  await db.sportsEvent.deleteMany();
  await db.episode.deleteMany();
  await db.season.deleteMany();
  await db.series.deleteMany();
  await db.movie.deleteMany();
  await db.channel.deleteMany();
  await db.channelCategory.deleteMany();
  await db.streamingSource.deleteMany();
  await db.contentProvider.deleteMany();
  await db.apiIntegration.deleteMany();
  await db.emailTemplate.deleteMany();
  await db.setting.deleteMany();
  await db.user.deleteMany();
  await db.role.deleteMany();

  // ── Roles ──
  const roleSA = await db.role.create({ data: { name: 'SUPERADMIN', permissions: JSON.stringify(['*']) } });
  await db.role.create({ data: { name: 'ADMIN', permissions: JSON.stringify(['dashboard.view','catalog.*','commerce.*','support.*','analytics.view','settings.*']) } });
  await db.role.create({ data: { name: 'STAFF', permissions: JSON.stringify(['dashboard.view','support.*','orders.read','customers.read','catalog.read']) } });
  const roleCust = await db.role.create({ data: { name: 'CUSTOMER', permissions: JSON.stringify(['account.*','play.*','shop.*']) } });

  // ── Users ──
  const admin = await db.user.create({
    data: {
      email: 'admin@playbeattv.buzz', passwordHash: bcrypt.hashSync('Admin@2026!', 10),
      name: 'PlayBeat Admin', phone: '+1 555 0100', roleId: roleSA.id, twoFactor: false,
    },
  });
  const staff = await db.user.create({
    data: {
      email: 'staff@playbeattv.buzz', passwordHash: bcrypt.hashSync('Staff@2026!', 10),
      name: 'Support Agent', roleId: (await db.role.findUniqueOrThrow({ where: { name: 'STAFF' } })).id,
    },
  });
  const cust = await db.user.create({
    data: {
      email: 'customer@playbeattv.buzz', passwordHash: bcrypt.hashSync('Customer@2026!', 10),
      name: 'Demo Customer', phone: '+1 555 0199', roleId: roleCust.id,
      billing: JSON.stringify({ address: '221B Stream Street', city: 'Austin', country: 'United States', zip: '73301' }),
    },
  });

  // ── Channel categories ──
  const catNames = ['News','Sports','Entertainment','Movies','Kids','Documentary','Lifestyle','Music','International','Local','Religious','Technology'];
  const cats: Record<string, { id: string }> = {};
  let so = 0;
  for (const n of catNames) {
    cats[n] = await db.channelCategory.create({ data: { name: n, slug: slug(n), sortOrder: so++ } });
  }

  // ── Channels (demo test streams, clearly labeled) ──
  type Ch = [name: string, cat: string, country: string, lang: string, q: 'SD'|'HD'|'4K', stream: string, free: boolean];
  const chDefs: Ch[] = [
    ['Pulse News 24', 'News', 'USA', 'English', 'HD', HLS.apple, true],
    ['World Report TV', 'News', 'UK', 'English', 'HD', HLS.bunny, false],
    ['Noticias Hoy', 'News', 'Spain', 'Spanish', 'SD', HLS.mux1, false],
    ['PlayBeat Sports 1', 'Sports', 'International', 'English', '4K', HLS.tears, false],
    ['PlayBeat Sports 2', 'Sports', 'International', 'English', 'HD', HLS.motion, false],
    ['Cricket Central', 'Sports', 'India', 'Hindi', 'HD', HLS.bunny, false],
    ['CineMax Showcase', 'Movies', 'USA', 'English', '4K', HLS.sintel, false],
    ['Reel Action', 'Movies', 'Canada', 'English', 'HD', HLS.tears, false],
    ['Ciné Première', 'Movies', 'France', 'French', 'HD', HLS.mux1, false],
    ['Prime Time Now', 'Entertainment', 'USA', 'English', 'HD', HLS.apple, false],
    ['Studio Live', 'Entertainment', 'UK', 'English', 'HD', HLS.bunny, false],
    ['Comedy Loop', 'Entertainment', 'International', 'English', 'SD', HLS.mux1, true],
    ['Toon Planet', 'Kids', 'International', 'English', 'HD', HLS.bunny, true],
    ['Kids Kingdom', 'Kids', 'Germany', 'German', 'SD', HLS.apple, false],
    ['Terra Wild', 'Documentary', 'International', 'English', '4K', HLS.tears, false],
    ['History Files', 'Documentary', 'UK', 'English', 'HD', HLS.motion, false],
    ['Taste & Home', 'Lifestyle', 'USA', 'English', 'HD', HLS.mux1, false],
    ['Travel Diaries', 'Lifestyle', 'UAE', 'Arabic', 'HD', HLS.bunny, false],
    ['Beat Music TV', 'Music', 'International', 'English', 'HD', HLS.apple, true],
    ['Retro Hits', 'Music', 'Brazil', 'Portuguese', 'SD', HLS.mux1, false],
    ['Global Voices', 'International', 'International', 'English', 'HD', HLS.tears, false],
    ['City Channel 7', 'Local', 'Pakistan', 'Urdu', 'SD', HLS.bunny, false],
    ['Peace TV Style', 'Religious', 'International', 'Arabic', 'SD', HLS.mux1, false],
    ['FutureTech TV', 'Technology', 'International', 'English', 'HD', HLS.motion, true],
  ];
  const channels: { id: string; name: string; slug: string }[] = [];
  let ci = 0;
  for (const [name, cat, country, lang, q, stream, free] of chDefs) {
    const ch = await db.channel.create({
      data: {
        name, slug: slug(name),
        description: `${name} — curated ${cat.toLowerCase()} channel on PLAYBEATTV. ${DEMO_NOTE}`,
        logoSeed: slug(name), categoryId: cats[cat].id, country, language: lang,
        quality: q, epgId: `pbtv.${slug(name)}`, streamType: 'HLS', streamUrl: stream,
        isFree: free, status: 'ACTIVE',
      },
    });
    channels.push({ id: ch.id, name, slug: ch.slug });
    ci++;
  }
  console.log(`channels: ${ci}`);

  // ── EPG programs: -6h → +14h per channel ──
  const NOW = new Date();
  NOW.setMinutes(0, 0, 0);
  const progTitles = ['Morning Brief','Prime Talk','Live Wire','The Daily Mix','Spotlight Hour','Open Studio','Late Edition','Encore Presentation','Main Event','Behind The Scenes','Weekend Wrap','Headline Now'];
  let progCount = 0;
  for (const ch of channels) {
    let t = new Date(NOW.getTime() - 6 * 3600e3);
    const end = new Date(NOW.getTime() + 14 * 3600e3);
    let i = 0;
    while (t < end) {
      const durMin = [60, 90, 120, 30][i % 4];
      const startsAt = new Date(t);
      const endsAt = new Date(t.getTime() + durMin * 60e3);
      await db.epgProgram.create({
        data: {
          channelId: ch.id, epgId: `pbtv.${ch.slug}`,
          title: progTitles[i % progTitles.length],
          description: 'Scheduled program from the demo EPG feed (XMLTV-compatible).',
          startsAt, endsAt,
        },
      });
      t = endsAt; i++; progCount++;
    }
  }
  await db.epgSyncLog.create({
    data: { source: 'seed-demo-xmltv', status: 'OK', message: 'Initial demo EPG import (XMLTV-compatible window).', programsImported: progCount, channelsMapped: channels.length },
  });

  // ── Movies (fictional titles, test-stream playback) ──
  const movieDefs: [string, string, string, number, number, 'HD'|'4K', string, boolean][] = [
    ['Neon Horizon', 'Sci-Fi,Action', 'English', 2026, 118, '4K', '16+', true],
    ['The Last Signal', 'Thriller,Drama', 'English', 2025, 104, 'HD', '13+', true],
    ['Midnight Cartography', 'Mystery,Drama', 'English', 2024, 96, 'HD', '13+', false],
    ['Skyward Bound', 'Adventure,Family', 'English', 2025, 88, 'HD', 'PG', false],
    ['Desert Frequencies', 'Documentary', 'Arabic', 2025, 76, '4K', 'PG', false],
    ['Paper Kingdoms', 'Drama,Romance', 'English', 2023, 112, 'HD', '13+', false],
    ['Velocity Trap', 'Action,Crime', 'English', 2026, 101, '4K', '16+', false],
    ['The Quiet Coast', 'Drama', 'French', 2024, 95, 'HD', 'PG', false],
    ['Glass Orchards', 'Horror,Thriller', 'English', 2025, 92, 'HD', '16+', false],
    ['Starlight Rally', 'Family,Animation', 'English', 2026, 84, '4K', 'PG', false],
    ['Monsoon Letters', 'Romance,Drama', 'Hindi', 2024, 123, 'HD', '13+', false],
    ['Iron Meridian', 'Sci-Fi,War', 'English', 2025, 131, '4K', '16+', false],
    ['Comedy Vault: Live', 'Comedy,Special', 'English', 2026, 68, 'HD', '13+', false],
    ['The Deep Blue Ledger', 'Documentary,Crime', 'English', 2023, 87, 'HD', '13+', false],
  ];
  const movies: { id: string; title: string }[] = [];
  const streams = Object.values(HLS);
  let mi = 0;
  for (const [title, genres, lang, year, dur, q, rating, feat] of movieDefs) {
    const m = await db.movie.create({
      data: {
        title, slug: slug(title),
        description: `${title} (${year}) — a PLAYBEATTV VOD showcase title. Metadata demo; playback uses a vendor demo stream until licensed sources are connected.`,
        posterSeed: slug(title), genres, language: lang, year, durationMin: dur, quality: q, rating,
        trailerUrl: streams[mi % streams.length], playbackUrl: streams[mi % streams.length],
        featured: feat, trending: 90 - mi * 4, status: 'PUBLISHED',
      },
    });
    movies.push({ id: m.id, title });
    mi++;
  }

  // ── Series + seasons + episodes ──
  const seriesDefs: [string, string, string, number, number, number[]][] = [
    ['Signal & Noise', 'Sci-Fi,Drama', 'English', 2026, 2, [6, 6]],
    ['Harbor Lights', 'Drama,Mystery', 'English', 2025, 1, [8]],
    ['The Recipe Wars', 'Reality,Lifestyle', 'English', 2025, 3, [6, 6, 5]],
    ['Frontier Code', 'Documentary,Technology', 'English', 2026, 1, [5]],
    ['Mumbai Express', 'Comedy,Drama', 'Hindi', 2024, 2, [7, 7]],
    ['Court of Sands', 'Action,History', 'Arabic', 2025, 1, [6]],
    ['Backyard Legends', 'Sports,Family', 'English', 2026, 1, [4]],
  ];
  let si = 0;
  const seriesAll: { id: string; title: string }[] = [];
  for (const [title, genres, lang, year, seasons, eps] of seriesDefs) {
    const s = await db.series.create({
      data: {
        title, slug: slug(title),
        description: `${title} (${year}) — original series showcase on PLAYBEATTV. Episodes stream from vendor demo sources in this demo build.`,
        posterSeed: slug(title), genres, language: lang, year, quality: si % 3 === 0 ? '4K' : 'HD',
        featured: si < 2, trending: 88 - si * 5, status: 'PUBLISHED',
      },
    });
    for (let sn = 1; sn <= seasons; sn++) {
      const season = await db.season.create({ data: { seriesId: s.id, number: sn, title: `Season ${sn}` } });
      for (let en = 1; en <= eps[sn - 1]; en++) {
        await db.episode.create({
          data: {
            seasonId: season.id, number: en, title: `Episode ${en}`,
            description: `${title} — S${sn}:E${en}. Demo playback source.`,
            durationMin: 22 + ((en + sn) % 4) * 8, playbackUrl: streams[(sn + en + si) % streams.length],
          },
        });
      }
    }
    seriesAll.push({ id: s.id, title });
    si++;
  }

  // ── Sports events ──
  const mkEv = async (title: string, category: string, home: string, away: string, offsetMin: number, status: string, channelIdx: number) => {
    await db.sportsEvent.create({
      data: {
        title, category, homeTeam: home, awayTeam: away,
        startsAt: new Date(NOW.getTime() + offsetMin * 60e3), status,
        channelId: channels[channelIdx].id,
      },
    });
  };
  await mkEv('Metro United vs Coastal FC', 'Football', 'Metro United', 'Coastal FC', -35, 'LIVE', 3);
  await mkEv('Champions Trophy: Semi-Final', 'Cricket', 'Lions', 'Falcons', -60, 'LIVE', 4);
  await mkEv('City Derby Night', 'Football', 'Rangers', 'Athletic', 90, 'UPCOMING', 3);
  await mkEv('Grand Slam Quarterfinal', 'Tennis', 'A. Rivera', 'K. Sato', 300, 'UPCOMING', 4);
  await mkEv('Playoffs Game 4', 'Basketball', 'Metro Kings', 'Harbor City', 1500, 'UPCOMING', 3);
  await mkEv('Street Circuit Grand Prix', 'Motorsports', 'Grid', 'Grid', 2900, 'UPCOMING', 4);
  await mkEv('Title Fight: Round Card', 'Combat Sports', 'Vega', 'Okonkwo', 4300, 'UPCOMING', 3);
  await mkEv('Continental Cup Opener', 'Football', 'Northside', 'Southgate', 6000, 'UPCOMING', 3);
  await mkEv('Metro United vs Riverside', 'Football', 'Metro United', 'Riverside', -2200, 'FINISHED', 3);
  await mkEv('Trophy Final Highlights', 'Cricket', 'Warriors', 'Chargers', -4400, 'FINISHED', 4);
  await mkEv('Semifinal Replay', 'Basketball', 'Metro Kings', 'Ironworks', -3000, 'FINISHED', 3);
  await mkEv('Circuit Qualifying', 'Motorsports', 'Grid', 'Grid', -5100, 'FINISHED', 4);

  // ── Plans ──
  const mkPlan = async (name: string, price: number, period: string, devices: number, q: string, features: string[], trial = 0) =>
    db.plan.create({
      data: { name, slug: slug(name), description: `${name} subscription for PLAYBEATTV.`, price, currency: 'USD', billingPeriod: period, deviceLimit: devices, quality: q, features: JSON.stringify(features), trialDays: trial, autoRenewal: true, status: 'ACTIVE' },
    });
  const pBasic = await mkPlan('Basic', 9.99, 'MONTHLY', 1, 'HD', ['1 concurrent device', 'HD streaming', 'Full channel catalog*', 'Standard support']);
  const pPremium = await mkPlan('Premium', 19.99, 'MONTHLY', 2, 'FULL HD', ['2 concurrent devices', 'Full HD streaming', 'Full channel catalog*', 'Priority support', 'EPG + catch-up TV']);
  const pUltimate = await mkPlan('Ultimate', 34.99, 'MONTHLY', 4, '4K', ['4 concurrent devices', '4K where available', 'Full channel catalog*', 'Premium 24/7 support', 'EPG + catch-up TV', 'Early access features']);
  await mkPlan('Quarterly Pass', 49.99, 'QUARTERLY', 2, 'FULL HD', ['2 concurrent devices', 'Full HD streaming', '3 months — save 17%', 'Priority support']);
  await mkPlan('Yearly Pass', 179.99, 'YEARLY', 4, '4K', ['4 concurrent devices', '4K where available', '12 months — save 25%', 'Premium support', 'EPG + catch-up TV']);
  const pTrial = await mkPlan('Free Trial', 0, 'MONTHLY', 1, 'HD', ['1 concurrent device', '7-day full access trial', 'No billing during trial'], 7);

  // ── Coupons ──
  const couponWelcome = await db.coupon.create({ data: { code: 'WELCOME10', type: 'PERCENT', value: 10, maxUses: 0, perCustomerLimit: 1, minAmount: 5, status: 'ACTIVE' } });
  await db.coupon.create({ data: { code: 'SAVE5', type: 'FIXED', value: 5, maxUses: 100, perCustomerLimit: 1, minAmount: 15, status: 'ACTIVE' } });
  const yearly = await db.plan.findUniqueOrThrow({ where: { slug: 'yearly-pass' } });
  await db.coupon.create({ data: { code: 'YEAR20', type: 'PERCENT', value: 20, maxUses: 50, perCustomerLimit: 1, minAmount: 100, planId: yearly.id, status: 'ACTIVE' } });

  // ── Demo customer commerce + engagement ──
  const number = 'PB-20261005-0001';
  const order = await db.order.create({
    data: {
      number, userId: cust.id, planId: pPremium.id, couponId: couponWelcome.id,
      subtotal: 19.99, discount: 2.0, total: 17.99, currency: 'USD',
      paymentMethod: 'SANDBOX_CARD', status: 'COMPLETED',
      billing: JSON.stringify({ name: 'Demo Customer', email: 'customer@playbeattv.buzz', address: '221B Stream Street', city: 'Austin', country: 'United States', zip: '73301' }),
    },
  });
  await db.payment.create({
    data: { orderId: order.id, provider: 'sandbox', reference: 'SANDBOX-0001-PBT', amount: 17.99, currency: 'USD', status: 'PAID', cardBrand: 'Visa', cardLast4: '4242' },
  });
  await db.invoice.create({
    data: { orderId: order.id, number: 'INV-20261005-0001', amount: 17.99, currency: 'USD', status: 'PAID' },
  });
  const sub = await db.subscription.create({
    data: {
      userId: cust.id, planId: pPremium.id, orderId: order.id, status: 'ACTIVE',
      startsAt: new Date(NOW.getTime() - 5 * 86400e3), expiresAt: new Date(NOW.getTime() + 25 * 86400e3),
      autoRenew: true, devicesLimit: 2,
    },
  });
  await db.device.create({
    data: { userId: cust.id, name: 'Living Room Android TV', platform: 'Android TV', lastIp: '203.0.113.10', lastActiveAt: new Date(NOW.getTime() - 3600e3), status: 'ACTIVE' },
  });
  await db.device.create({
    data: { userId: cust.id, name: 'iPhone 15 Pro', platform: 'iPhone', lastIp: '198.51.100.22', lastActiveAt: new Date(NOW.getTime() - 7200e3), status: 'ACTIVE' },
  });
  await db.favorite.create({ data: { userId: cust.id, refType: 'CHANNEL', refId: channels[0].id, label: channels[0].name } });
  await db.favorite.create({ data: { userId: cust.id, refType: 'MOVIE', refId: movies[0].id, label: movies[0].title } });
  await db.watchHistory.create({ data: { userId: cust.id, channelId: channels[0].id, refType: 'CHANNEL', refId: channels[0].id, label: channels[0].name, secondsWatched: 1240, updatedAt: new Date(NOW.getTime() - 3600e3) } });
  await db.watchHistory.create({ data: { userId: cust.id, refType: 'MOVIE', refId: movies[1].id, label: movies[1].title, secondsWatched: 3600, updatedAt: new Date(NOW.getTime() - 86400e3) } });
  const ticket = await db.supportTicket.create({
    data: { number: 'TK-0001', userId: cust.id, subject: '4K quality question on Premium plan', category: 'Technical', priority: 'NORMAL', status: 'IN_PROGRESS', assigneeId: staff.id },
  });
  await db.ticketMessage.create({
    data: { ticketId: ticket.id, authorId: cust.id, authorRole: 'CUSTOMER', body: 'Hi — does the Premium plan include 4K on supported channels, or do I need Ultimate? Thanks!' },
  });
  await db.ticketMessage.create({
    data: { ticketId: ticket.id, authorId: staff.id, authorRole: 'STAFF', body: 'Hello! Premium streams Full HD; 4K titles are on the Ultimate plan. Happy to upgrade you or answer anything else.', isInternal: false },
  });
  await db.ticketMessage.create({
    data: { ticketId: ticket.id, authorId: staff.id, authorRole: 'STAFF', body: 'Internal: customer eligible for loyalty upgrade coupon if they ask again.', isInternal: true },
  });
  await db.notification.create({ data: { userId: cust.id, channel: 'INAPP', title: 'Welcome to PLAYBEATTV 🎬', body: 'Your Premium subscription is active. Enjoy premium entertainment on 2 devices.' } });
  await db.notification.create({ data: { userId: cust.id, channel: 'INAPP', title: 'Payment receipt', body: `Order ${number} paid — invoice INV-20261005-0001 available in your account.` } });
  await db.notification.create({ data: { userId: null, channel: 'INAPP', title: 'Scheduled maintenance', body: 'EPG sync maintenance Sunday 02:00–03:00 UTC. Playback unaffected.' } });

  // ── Settings / CMS ──
  const mkSetting = (key: string, value: unknown) => db.setting.create({ data: { key, value: JSON.stringify(value) } });
  await mkSetting('site.content', {
    brand: 'PLAYBEATTV',
    tagline: 'Your Gateway to Premium Digital Entertainment',
    domain: 'playbeattv.buzz',
    hero: {
      title: 'PLAYBEATTV',
      subtitle: 'Premium Entertainment. One Powerful Platform.',
      text: 'Access your authorized live television, sports, entertainment, news, movies and other digital entertainment services from one modern platform.',
    },
    stats: [
      { value: '15,000+', label: 'Live Channels*', note: 'Configurable marketing placeholder — not live inventory' },
      { value: '20,000+', label: 'Movies & Series*', note: 'Configurable marketing placeholder — not live inventory' },
      { value: 'HD / 4K*', label: 'Streaming Quality Ready', note: 'Where the licensed source provides it' },
      { value: 'Multi-Device', label: 'TV · Mobile · Web · Tablet', note: 'Watch anywhere on your devices' },
    ],
    contact: { email: 'support@playbeattv.buzz', whatsapp: '+1 555 0100', hours: '24/7 support desk' },
    socials: { youtube: '#', instagram: '#', twitter: '#', facebook: '#' },
    legalNote: '* Channel, movie and series counts are configurable marketing placeholders, not live inventory counts. All demo playback uses vendor test streams; connect your licensed provider in the admin panel.',
  });
  await mkSetting('faq.items', [
    { q: 'What is PLAYBEATTV?', a: 'PLAYBEATTV is a subscription platform that delivers your authorized live TV, sports, movies and series through one modern portal on all your devices.' },
    { q: 'Which devices are supported?', a: 'Android TV, Smart TV browsers, Fire TV, Android phones, iPhone/iPad, Windows and macOS — all modern browsers.' },
    { q: 'How many devices can I use?', a: 'Each plan has a device limit: Basic 1, Premium 2, Ultimate 4 concurrent devices. Manage sessions from Account → My Devices.' },
    { q: 'Can I cancel anytime?', a: 'Yes. Your plan stays active until the end of the paid period; auto-renewal can be switched off in Account → My Subscription.' },
    { q: 'What payment methods are accepted?', a: 'Card and PayPal through the sandbox payment gateway in this build. Production deployments connect licensed PSPs via Admin → API Integrations.' },
    { q: 'Do you offer a free trial?', a: 'Yes — a 7-day Free Trial plan with full catalog access and no billing during the trial.' },
    { q: 'Is the content licensed?', a: 'Absolutely. PLAYBEATTV only serves streams from sources the operator is authorized to distribute. This demo build uses public vendor test streams.' },
    { q: 'How do I get support?', a: 'Open a ticket from Account → Support Tickets or use the contact page — the desk is staffed 24/7.' },
  ]);
  await mkSetting('cms.banners', [
    { text: 'Launch offer — 20% off the Yearly Pass with code YEAR20', href: '#/pricing', active: true },
  ]);
  await mkSetting('cms.footer', {
    about: 'PLAYBEATTV delivers premium, authorized digital entertainment through one powerful platform — live TV, sports, movies and series on every screen.',
    columns: [
      { title: 'Watch', links: [{ label: 'Live TV', href: '#/live-tv' }, { label: 'Movies', href: '#/movies' }, { label: 'Series', href: '#/series' }, { label: 'Sports', href: '#/sports' }] },
      { title: 'Company', links: [{ label: 'Pricing', href: '#/pricing' }, { label: 'Devices', href: '#/devices' }, { label: 'FAQ', href: '#/faq' }, { label: 'Contact', href: '#/contact' }] },
      { title: 'Legal', links: [{ label: 'Terms', href: '#/faq' }, { label: 'Privacy', href: '#/faq' }, { label: 'DMCA & Content Policy', href: '#/faq' }] },
    ],
  });
  await mkSetting('seo.meta', {
    title: 'PLAYBEATTV — Premium Entertainment. One Powerful Platform.',
    description: 'Subscribe to PLAYBEATTV for authorized live TV, sports, movies and series in HD/4K on all your devices. playbeattv.buzz',
    keywords: 'IPTV, live tv, sports streaming, movies, series, playbeattv',
  });

  // ── Providers / sources / integrations / templates ──
  const provider = await db.contentProvider.create({ data: { name: 'PlayBeat Demo Feeds', type: 'IPTV', status: 'ACTIVE', notes: 'Public vendor test streams for development. Replace with licensed provider(s) before commercial launch.' } });
  await db.streamingSource.create({ data: { providerId: provider.id, label: 'Mux / Apple / Unified / Bitmovin demo HLS set', protocol: 'HLS', baseUrl: 'https://test-streams.mux.dev', credentialsRef: 'DEMO_PROVIDER_API_KEY', status: 'ACTIVE' } });
  await db.apiIntegration.create({ data: { name: 'Sandbox Card Gateway', kind: 'PAYMENT', config: JSON.stringify({ mode: 'sandbox', webhookSecretRef: 'PAYMENTS_WEBHOOK_SECRET', supported: ['card', 'paypal'] }), status: 'ACTIVE' } });
  await db.apiIntegration.create({ data: { name: 'XMLTV EPG Importer', kind: 'EPG', config: JSON.stringify({ format: 'xmltv', syncWindowHours: 24 }), status: 'ACTIVE' } });
  await db.emailTemplate.create({ data: { key: 'welcome', subject: 'Welcome to PLAYBEATTV', bodyHtml: '<h2>Welcome, {{name}}!</h2><p>Your gateway to premium digital entertainment is open. Manage your subscription any time from your account.</p>' } });
  await db.emailTemplate.create({ data: { key: 'order_confirmation', subject: 'Your PLAYBEATTV order {{order}} is confirmed', bodyHtml: '<p>Thanks! Order <b>{{order}}</b> for plan <b>{{plan}}</b> is confirmed. Total: {{total}}.</p>' } });
  await db.emailTemplate.create({ data: { key: 'payment_receipt', subject: 'Payment receipt — PLAYBEATTV', bodyHtml: '<p>We received your payment of <b>{{total}}</b>. Invoice {{invoice}} is available in your account.</p>' } });
  await db.emailTemplate.create({ data: { key: 'subscription_expiring', subject: 'Your PLAYBEATTV subscription is expiring soon', bodyHtml: '<p>Heads up — your <b>{{plan}}</b> plan expires on {{expiry}}. Renew any time to keep watching.</p>' } });
  await db.emailTemplate.create({ data: { key: 'password_reset', subject: 'Reset your PLAYBEATTV password', bodyHtml: '<p>Use this code to reset your password: <b>{{code}}</b>. If you did not request it, ignore this email.</p>' } });
  await db.emailTemplate.create({ data: { key: 'ticket_created', subject: 'Support ticket {{ticket}} received', bodyHtml: '<p>We got your ticket — our 24/7 desk is on it and will reply shortly.</p>' } });
  await db.emailTemplate.create({ data: { key: 'ticket_reply', subject: 'New reply on ticket {{ticket}}', bodyHtml: '<p>Support replied to your ticket. Open your account to continue the conversation.</p>' } });

  // ── Audit seed ──
  await db.auditLog.create({ data: { userId: admin.id, actorEmail: admin.email, action: 'system.seed', entity: 'system', entityId: 'init', meta: JSON.stringify({ channels: channels.length, movies: movies.length }), ip: 'local' } });

  console.log('Seed complete.');
  console.log('Admin: admin@playbeattv.buzz / Admin@2026!');
  console.log('Staff: staff@playbeattv.buzz / Staff@2026!');
  console.log('Customer: customer@playbeattv.buzz / Customer@2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
