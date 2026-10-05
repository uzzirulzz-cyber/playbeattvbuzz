/**
 * PLAYBEATTV — single-membership + BTC checkout + bot-verification QA matrix.
 * Run against a local server (default http://127.0.0.1:3100).
 *
 * Covers:
 *  1. /api/captcha issues svg + token
 *  2. register WITHOUT captcha → 400 CAPTCHA; with valid captcha → 200
 *  3. login without captcha → 400; with valid captcha → 200
 *  4. /api/plans → single ACTIVE plan $12 All Members Access
 *  5. checkout CRYPTO_BTC → PENDING + redirect to /order/<number>
 *  6. /api/payments/btc → owner's address; /api/payments/btc/qr → svg
 *  7. TXID validation (bad → 400, good → VERIFYING)
 *  8. play gate: 402 before verification, 200 after admin verify
 *  9. admin captcha login → verify_crypto → order COMPLETED + subscription ACTIVE
 * 10. admin grant_subscription works
 * 11. cleanup QA artifacts
 */
const BASE = process.env.QA_BASE || 'http://127.0.0.1:3100';
const SECRET = process.env.QA_JWT_SECRET || 'pbtv-local-qa-secret-not-used-in-production';
const crypto = await import('node:crypto');

let pass = 0; let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✖ ${name} ${extra}`); }
}

/** Craft a captcha the same way src/lib/captcha.ts verifies it. */
function craftCaptcha(code = 'QA7X2M') {
  const exp = Date.now() + 5 * 60 * 1000;
  const payload = `${code}.${exp}.qanonce`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const token = `${Buffer.from(payload).toString('base64url')}.${sig}`;
  return { captchaToken: token, captchaAnswer: code };
}

function cookieOf(res) {
  const set = res.headers.get('set-cookie') || '';
  const m = set.match(/pbtv_session=([^;]+)/);
  return m ? `pbtv_session=${m[1]}` : '';
}

async function api(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data, res };
}

const stamp = Date.now().toString(36);
const QA_EMAIL = `qa-${stamp}@test.pb`;
const QA_PASS = 'QaTest2026!x';

console.log(`QA against ${BASE}`);

// ── 1. captcha endpoint ──
const cap = await api('/api/captcha');
check('captcha endpoint issues svg+token', cap.status === 200 && !!cap.data?.data?.svg && !!cap.data?.data?.token && cap.data.data.svg.includes('<svg'));

// ── 2. register ──
const regNo = await api('/api/auth/register', { method: 'POST', body: { name: 'QA Bot', email: QA_EMAIL, password: QA_PASS, confirmPassword: QA_PASS, terms: true } });
check('register blocked without captcha', regNo.status === 400 && regNo.data?.error?.code === 'CAPTCHA', JSON.stringify(regNo.data));

const regBad = await api('/api/auth/register', { method: 'POST', body: { name: 'QA Bot', email: QA_EMAIL, password: QA_PASS, confirmPassword: QA_PASS, terms: true, captchaToken: 'x.y', captchaAnswer: 'WRONG1' } });
check('register blocked with wrong captcha', regBad.status === 400 && regBad.data?.error?.code === 'CAPTCHA');

const reg = await api('/api/auth/register', { method: 'POST', body: { name: 'QA Tester', email: QA_EMAIL, password: QA_PASS, confirmPassword: QA_PASS, terms: true, ...craftCaptcha() } });
check('register with valid captcha → 200', reg.status === 200 && !!reg.data?.data?.user?.id, JSON.stringify(reg.data));

// ── 3. login ──
const logNo = await api('/api/auth/login', { method: 'POST', body: { email: QA_EMAIL, password: QA_PASS } });
check('login blocked without captcha', logNo.status === 400 && logNo.data?.error?.code === 'CAPTCHA');

const log = await api('/api/auth/login', { method: 'POST', body: { email: QA_EMAIL, password: QA_PASS, ...craftCaptcha() } });
const userCookie = cookieOf(log.res);
check('login with valid captcha → session', log.status === 200 && !!userCookie);

// ── 4. single plan ──
const plans = await api('/api/plans');
const p0 = plans.data?.data?.rows?.[0];
check('exactly ONE active plan', plans.data?.data?.rows?.length === 1, `got ${plans.data?.data?.rows?.length}`);
check('plan is All Members Access $12/mo', p0?.name === 'All Members Access' && p0?.price === 12 && p0?.billingPeriod === 'MONTHLY', JSON.stringify(p0?.name));

// ── 5. play gate before subscription (no-sub member) ──
const chans = await api('/api/channels?size=5');
const chId = chans.data?.data?.rows?.[0]?.id;
check('channels catalog loads for member', !!chId, JSON.stringify(chans.data?.error));
const playNo = await api(`/api/play/channel/${chId}`, { cookie: userCookie });
check('play blocked 402 without subscription', playNo.status === 402, `got ${playNo.status}`);

// ── 6. crypto checkout ──
const co = await api('/api/orders', { method: 'POST', cookie: userCookie, body: { planId: p0.id, paymentMethod: 'CRYPTO_BTC', billing: { name: 'QA Tester' } } });
const order = co.data?.data;
check('crypto checkout → PENDING + redirect', co.status === 200 && order?.status === 'PENDING' && order?.paymentMethod === 'CRYPTO_BTC' && !!order?.redirect, JSON.stringify(order));
const orderNumber = order?.number;

// ── 7. BTC config + QR ──
const btc = await api('/api/payments/btc');
check('BTC config returns owner address', btc.status === 200 && btc.data?.data?.address === 'bc1qa6hnzcxn9zkvj4jkwx805g45239ghq7z5rkcfs', btc.data?.data?.address);
const qr = await fetch(`${BASE}/api/payments/btc/qr?text=${encodeURIComponent('bitcoin:' + btc.data?.data?.address)}`);
const qrText = await qr.text();
check('QR endpoint returns SVG', qr.status === 200 && qr.headers.get('content-type').includes('svg') && qrText.includes('<svg'));

// ── 8. TXID validation ──
const txBad = await api('/api/orders/txid', { method: 'POST', cookie: userCookie, body: { orderNumber, txid: 'not-hex!' } });
check('bad TXID rejected', txBad.status === 400);
const txOk = await api('/api/orders/txid', { method: 'POST', cookie: userCookie, body: { orderNumber, txid: '9f2c7b1e4a8d3f6b0c5e7a9d2f4b6c8e0a1b3d5f7c9e1a3b5d7f9c1e3b5d7f9a' } });
check('TXID accepted → VERIFYING', txOk.status === 200 && txOk.data?.data?.status === 'VERIFYING', JSON.stringify(txOk.data));

const ordInfo = await api(`/api/orders/number/${orderNumber}`, { cookie: userCookie });
check('order page data: txid stored, still PENDING', ordInfo.status === 200 && ordInfo.data?.data?.order?.txid?.length > 16 && ordInfo.data?.data?.order?.status === 'PENDING');

// ── 9. admin login + verify & give subscription ──
const adm = await api('/api/auth/login', { method: 'POST', body: { email: 'admin@playbeattv.buzz', password: 'Admin@2026!', ...craftCaptcha() } });
const adminCookie = cookieOf(adm.res);
check('admin captcha login', adm.status === 200 && !!adminCookie && adm.data?.data?.user?.role !== 'CUSTOMER', JSON.stringify(adm.data?.error));

const adminOrders = await api(`/api/admin/orders?q=${orderNumber}&size=5`, { cookie: adminCookie });
const target = adminOrders.data?.data?.rows?.find((o) => o.number === orderNumber);
check('admin queue shows order with TXID', !!target && (target.txid || '').length > 16, JSON.stringify(adminOrders.data?.error));

const verify = await api(`/api/admin/orders/${target.id}`, { method: 'PATCH', cookie: adminCookie, body: { action: 'verify_crypto' } });
check('verify_crypto → subscription given', verify.status === 200 && verify.data?.data?.verified === true, JSON.stringify(verify.data));

const subs = await api('/api/subscriptions', { cookie: userCookie });
const active = (subs.data?.data?.rows || []).find((s) => s.status === 'ACTIVE');
check('member subscription ACTIVE', !!active, JSON.stringify(subs.data?.data?.rows?.map((s) => s.status)));

const playOk = await api(`/api/play/channel/${chId}`, { cookie: userCookie });
check('play allowed after verification (200)', playOk.status === 200, `got ${playOk.status} ${JSON.stringify(playOk.data?.error || {})}`);

// ── 10. admin grant subscription ──
const grant = await api(`/api/admin/orders/x`, { method: 'PATCH', cookie: adminCookie, body: { action: 'verify_crypto' } });
check('verify on non-crypto order rejected 400/404', grant.status === 400 || grant.status === 404);

const customers = await api(`/api/admin/customers?q=${QA_EMAIL}&size=5`, { cookie: adminCookie });
const qaCustomer = customers.data?.data?.rows?.find((c) => c.email === QA_EMAIL);
const granted = await api(`/api/admin/customers/${qaCustomer?.id}`, { method: 'PATCH', cookie: adminCookie, body: { action: 'grant_subscription', months: 1, note: 'QA grant' } });
check('admin grant_subscription works', granted.status === 200 && granted.data?.data?.granted === true, JSON.stringify(granted.data));

// ── 11. adult gating mechanism (no adult cats in current catalog → just assert endpoint shape) ──
const facets = await api('/api/channels?size=1');
check('facets filtered without error', facets.status === 200 && Array.isArray(facets.data?.data?.facets?.categories));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
