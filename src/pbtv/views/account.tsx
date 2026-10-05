'use client';

import { useEffect, useState } from 'react';
import { get, patch, post } from '../api';
import { Link, navigate } from '../router';
import { useApp } from '../store';
import { Badge, Crumb, Empty, Field, SectionTitle, Spinner, StatusBadge, fmtDate, fmtDateTime, fmtMoney } from '../ui';

type Plan = {
  id: string; name: string; price: number; currency: string; billingPeriod: string;
  deviceLimit: number; quality: string; features: string[]; trialDays: number;
};
// ─── CHECKOUT ───────────────────────────────────────────────

export function Checkout({ params }: { params: Record<string, string> }) {
  const { session, sessionLoading, cartPlanId, setCartPlanId, refreshSession, toast } = useApp();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const method = 'CRYPTO_BTC'; // Bitcoin-only checkout (sandbox gateways kept server-side for compatibility)
  const [billing, setBilling] = useState({ name: '', email: '', address: '', city: '', country: '', zip: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ number: string; status: string; invoice?: string; message?: string } | null>(null);

  useEffect(() => {
    const pid = params.plan || cartPlanId;
    if (!pid) return;
    get<{ rows: Plan[] }>('/api/plans')
      .then((r) => setPlan(r.rows.find((p) => p.id === pid) || null))
      .catch(() => null);
  }, [params.plan, cartPlanId]);

  useEffect(() => {
    if (session?.user) {
      get<{ user: { name: string; email: string } }>('/api/auth/me').then((s) => {
        if (s.user) setBilling((b) => ({ ...b, name: s.user!.name, email: s.user!.email }));
      }).catch(() => null);
    }
  }, [session]);

  if (sessionLoading) return <Spinner />;
  if (!session?.user) {
    return (
      <div className="text-center mt-5">
        <Empty icon="bi-lock" text="Sign in to continue to checkout.">
          <Link to="/login?next=/checkout" className="btn btn-pb btn-sm mt-2">Sign in</Link>
        </Empty>
      </div>
    );
  }
  if (!plan) {
    return (
      <>
        <SectionTitle eyebrow="Checkout" title="Your order" />
        <Empty icon="bi-cart" text="Your cart is empty — pick a plan first.">
          <Link to="/pricing" className="btn btn-pb btn-sm mt-2">View plans</Link>
        </Empty>
      </>
    );
  }

  const discount = coupon?.discount || 0;
  const total = Math.max(0, plan.price - discount);

  const applyCoupon = async () => {
    setErr('');
    try {
      const r = await post<{ code: string; discount: number }>('/api/coupons/validate', { code: couponInput, planId: plan.id, amount: plan.price });
      setCoupon({ code: r.code, discount: r.discount });
      toast('ok', `Coupon ${r.code} applied — you save ${fmtMoney(r.discount)}`);
    } catch (e) {
      setCoupon(null);
      setErr((e as Error).message);
    }
  };

  const pay = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await post<{ number: string; status: string; invoice?: string; message?: string; subscription?: { expiresAt: string }; paymentMethod?: string; redirect?: string }>('/api/orders', {
        planId: plan.id,
        couponCode: coupon?.code,
        paymentMethod: method,
        billing,
      });
      setCartPlanId(null);
      if (r.paymentMethod === 'CRYPTO_BTC' && r.redirect) {
        toast('info', 'Order created — complete your Bitcoin payment.');
        navigate(r.redirect);
        return;
      }
      setResult(r);
      await refreshSession();
      if (r.status === 'COMPLETED') toast('ok', `Payment confirmed — ${plan.name} is active!`);
      else toast('err', r.message || 'Payment failed');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="row justify-content-center mt-4">
        <div className="col-md-8 col-lg-6">
          <div className="pb-glass p-5 text-center">
            {result.status === 'COMPLETED' ? (
              <>
                <i className="bi bi-check-circle-fill" style={{ fontSize: 54, color: '#34d399' }} />
                <h2 className="fw-bold mt-3">You're all set!</h2>
                <p className="pb-muted">
                  Order <b>{result.number}</b> is complete{result.invoice ? ` — invoice ${result.invoice}` : ''}.
                  Your <b>{plan.name}</b> subscription is active immediately.
                </p>
                <div className="d-flex gap-2 justify-content-center mt-4">
                  <Link to="/live-tv" className="btn btn-pb-gold">Start watching</Link>
                  <Link to="/account/subscription" className="btn btn-pb-ghost">My Subscription</Link>
                </div>
              </>
            ) : (
              <>
                <i className="bi bi-x-circle-fill" style={{ fontSize: 54, color: '#ff3b48' }} />
                <h2 className="fw-bold mt-3">Payment declined</h2>
                <p className="pb-muted">{result.message}</p>
                <button className="btn btn-pb mt-2" onClick={() => setResult(null)}>Try another card</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Crumb items={[{ label: 'Pricing', to: '/pricing' }, { label: 'Checkout' }]} />
      <SectionTitle eyebrow="Secure checkout" title="Complete your order" />
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="pb-glass p-4 pb-gold-line">
            <h5 className="fw-bold">{plan.name} plan</h5>
            <div className="pb-muted mb-3" style={{ fontSize: 13.5 }}>
              {plan.deviceLimit} device{plan.deviceLimit > 1 ? 's' : ''} · {plan.quality} · {plan.billingPeriod.toLowerCase()} billing
            </div>
            <div className="d-flex justify-content-between mb-1"><span className="pb-muted">Subtotal</span><span>{fmtMoney(plan.price, plan.currency)}</span></div>
            {coupon && <div className="d-flex justify-content-between mb-1"><span className="pb-muted">Coupon {coupon.code}</span><span className="text-success">−{fmtMoney(discount, plan.currency)}</span></div>}
            <hr style={{ borderColor: 'var(--pb-line)' }} />
            <div className="d-flex justify-content-between fw-bold" style={{ fontSize: 18 }}><span>Total</span><span>{fmtMoney(total, plan.currency)}</span></div>
            <div className="input-group mt-4">
              <input className="form-control" placeholder="Coupon code (e.g. WELCOME10)" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
              <button className="btn btn-pb-ghost" onClick={applyCoupon} disabled={!couponInput}>Apply</button>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="pb-glass p-4">
            {err && <div className="alert alert-danger py-2" style={{ background: 'rgba(255,59,72,.1)', borderColor: 'rgba(255,59,72,.3)', color: '#ff8a91' }}>{err}</div>}
            <h6 className="pb-eyebrow mb-3">1 · Customer & billing information</h6>
            <div className="row">
              <div className="col-md-6"><Field label="Full name"><input className="form-control" value={billing.name} onChange={(e) => setBilling({ ...billing, name: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Email"><input type="email" className="form-control" value={billing.email} onChange={(e) => setBilling({ ...billing, email: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Address"><input className="form-control" value={billing.address} onChange={(e) => setBilling({ ...billing, address: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="City"><input className="form-control" value={billing.city} onChange={(e) => setBilling({ ...billing, city: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Country"><input className="form-control" value={billing.country} onChange={(e) => setBilling({ ...billing, country: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="ZIP / Postal code"><input className="form-control" value={billing.zip} onChange={(e) => setBilling({ ...billing, zip: e.target.value })} /></Field></div>
            </div>
            <h6 className="pb-eyebrow mb-3 mt-2">2 · Payment method</h6>
            <div className="d-flex gap-2 mb-3 flex-wrap">
              <button className="btn btn-sm btn-pb" type="button">
                <i className="bi bi-currency-bitcoin me-1" />Bitcoin (BTC) — $12/month
              </button>
            </div>
            <div className="alert alert-info py-3" style={{ background: 'rgba(46,144,250,.08)', borderColor: 'rgba(46,144,250,.3)', color: '#9ecbff' }}>
              <i className="bi bi-currency-bitcoin me-1" /><b>How Bitcoin checkout works</b>
              <ol className="mb-0 mt-2" style={{ fontSize: 13.5 }}>
                <li>Create the order — we show you the operator's BTC address & QR.</li>
                <li>Send <b>exactly {fmtMoney(total, plan.currency)}</b> worth of BTC (mainnet only).</li>
                <li>Paste your transaction ID (TXID) on the payment page.</li>
                <li>After verification your All-Access subscription is activated — everything unlocked, 18+ included.</li>
              </ol>
            </div>
            <button className="btn btn-pb-gold w-100 mt-2" onClick={pay} disabled={busy}>
              <i className="bi bi-currency-bitcoin me-2" />{busy ? 'Creating order…' : `Continue — pay ${fmtMoney(total, plan.currency)} with BTC`}
            </button>
            <p className="pb-muted text-center mt-2 mb-0" style={{ fontSize: 12 }}>
              <i className="bi bi-shield-check me-1" />Crypto payments are verified manually by the operator before the subscription is given. No card data is ever collected.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ACCOUNT PORTAL ─────────────────────────────────────────

export type Order = {
  id: string; number: string; status: string; total: number; currency: string; createdAt: string;
  paymentMethod?: string; txid?: string;
  plan: { name: string }; payment?: { status: string; reference: string; cardBrand: string; cardLast4: string } | null;
  invoices: { number: string; status: string }[];
};

export function AccountShell({ active, title, children }: { active: string; title: string; children: React.ReactNode }) {
  const { session } = useApp();
  const tabs = [
    ['', 'Dashboard', 'bi-speedometer2'],
    ['subscription', 'My Subscription', 'bi-arrow-repeat'],
    ['devices', 'My Devices', 'bi-tv'],
    ['history', 'Watch History', 'bi-clock-history'],
    ['favorites', 'Favorites', 'bi-heart'],
    ['iptv', 'My IPTV Line', 'bi-hdmi'],
    ['orders', 'Orders', 'bi-receipt'],
    ['invoices', 'Invoices', 'bi-file-earmark-text'],
    ['tickets', 'Support Tickets', 'bi-life-preserver'],
    ['profile', 'Profile', 'bi-person'],
    ['password', 'Password', 'bi-key'],
  ];
  return (
    <>
      <SectionTitle eyebrow={`Account · ${session?.user?.email || ''}`} title={title} />
      <div className="pb-glass p-2 mb-4 d-flex gap-1 flex-wrap">
        {tabs.map(([key, label, icon]) => (
          <Link key={key} to={`/account/${key}`} className={`pb-nav-link ${active === key ? 'active' : ''}`} style={{ fontSize: 13 }}>
            <i className={`bi ${icon} me-1`} />{label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}

export function AccountDashboard() {
  const { session } = useApp();
  const [subs, setSubs] = useState<ReturnType<typeof fmtDate>[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<unknown[]>([]);
  const [notifs, setNotifs] = useState<{ id: string; title: string; body: string; createdAt: string; readAt: string | null }[]>([]);

  useEffect(() => {
    get<{ rows: never[] }>('/api/subscriptions').then((r) => setSubs(r.rows)).catch(() => null);
    get<{ rows: Order[] }>('/api/orders').then((r) => setOrders(r.rows)).catch(() => null);
    get<{ rows: unknown[] }>('/api/devices').then((r) => setDevices(r.rows)).catch(() => null);
    get<{ rows: typeof notifs }>('/api/notifications').then((r) => setNotifs(r.rows.slice(0, 5))).catch(() => null);
  }, []);

  const activeSub = (subs as unknown as { status: string; expiresAt: string; plan: { name: string; quality: string; deviceLimit: number } }[]).find((s) => s.status === 'ACTIVE');
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <div className="pb-glass p-4 h-100">
          <div className="pb-eyebrow mb-2">Subscription</div>
          {activeSub ? (
            <>
              <div className="fw-bold" style={{ fontSize: 20 }}>{activeSub.plan.name}</div>
              <div className="pb-muted mb-2" style={{ fontSize: 13 }}>{activeSub.plan.quality} · {activeSub.plan.deviceLimit} devices</div>
              <SubStatePillMini expiresAt={activeSub.expiresAt} />
            </>
          ) : (
            <>
              <p className="pb-muted" style={{ fontSize: 14 }}>No active plan — pick one to unlock the full catalog.</p>
              <Link to="/pricing" className="btn btn-pb-gold btn-sm">Choose a plan</Link>
            </>
          )}
        </div>
      </div>
      <div className="col-md-4">
        <div className="pb-glass p-4 h-100">
          <div className="pb-eyebrow mb-2">Recent orders</div>
          {orders.slice(0, 4).map((o) => (
            <div key={o.id} className="d-flex justify-content-between align-items-center py-1">
              <span style={{ fontSize: 13.5 }}>{o.number}</span>
              <StatusBadge status={o.status} />
            </div>
          ))}
          {!orders.length && <p className="pb-muted mb-0" style={{ fontSize: 13 }}>No orders yet.</p>}
        </div>
      </div>
      <div className="col-md-4">
        <div className="pb-glass p-4 h-100">
          <div className="pb-eyebrow mb-2">Devices & notifications</div>
          <div className="pb-muted mb-2" style={{ fontSize: 13.5 }}><i className="bi bi-tv me-2" />{devices.length} registered device(s)</div>
          {notifs.slice(0, 3).map((n) => (
            <div key={n.id} className="py-1" style={{ borderTop: '1px solid rgba(255,255,255,.05)', fontSize: 12.5 }}>
              <span className={n.readAt ? 'pb-muted' : 'fw-semibold'}>{n.title}</span>
              <div className="pb-muted">{fmtDateTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubStatePillMini({ expiresAt }: { expiresAt: string }) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400e3);
  return <Badge kind={days <= 3 ? 'gold' : 'green'}>Expires {fmtDate(expiresAt)} ({days}d)</Badge>;
}

export function AccountSubscription() {
  const [rows, setRows] = useState<{ id: string; status: string; startsAt: string; expiresAt: string; autoRenew: boolean; devicesLimit: number; plan: { name: string; quality: string; billingPeriod: string; deviceLimit: number }; order?: { number: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useApp();
  const load = () => {
    setLoading(true);
    get<{ rows: typeof rows }>('/api/subscriptions').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const update = async (id: string, body: Record<string, unknown>) => {
    try {
      await patch('/api/subscriptions', { id, ...body });
      toast('ok', 'Subscription updated');
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  if (loading) return <Spinner />;
  if (!rows.length) {
    return <Empty icon="bi-arrow-repeat" text="You have no subscriptions yet.">
      <Link to="/pricing" className="btn btn-pb btn-sm mt-2">View plans</Link>
    </Empty>;
  }
  return (
    <div className="d-grid gap-3">
      {rows.map((s) => (
        <div className="pb-glass p-4" key={s.id}>
          <div className="d-flex justify-content-between flex-wrap gap-2">
            <div>
              <h5 className="fw-bold mb-1">{s.plan.name} <StatusBadge status={s.status} /></h5>
              <div className="pb-muted" style={{ fontSize: 13.5 }}>
                {s.plan.quality} · {s.plan.deviceLimit} devices · {s.plan.billingPeriod.toLowerCase()} · started {fmtDate(s.startsAt)}
              </div>
              <div className="pb-muted" style={{ fontSize: 13.5 }}>Expires {fmtDate(s.expiresAt)} · {s.order ? `order ${s.order.number}` : '—'}</div>
            </div>
            <div className="d-flex gap-2 align-items-start">
              <button className={`btn btn-sm ${s.autoRenew ? 'btn-pb-ghost' : 'btn-pb'}`} onClick={() => update(s.id, { autoRenew: !s.autoRenew })}>
                {s.autoRenew ? 'Disable auto-renew' : 'Enable auto-renew'}
              </button>
              {s.status === 'ACTIVE' && (
                <button className="btn btn-pb-danger btn-sm" onClick={() => update(s.id, { cancel: true })}>Cancel</button>
              )}
              {['EXPIRED', 'CANCELLED'].includes(s.status) && <Link to="/pricing" className="btn btn-pb btn-sm">Renew</Link>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountDevices() {
  const [rows, setRows] = useState<{ id: string; name: string; platform: string; lastIp: string; lastActiveAt: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('Android TV');
  const { toast } = useApp();
  const load = () => {
    setLoading(true);
    get<{ rows: typeof rows }>('/api/devices').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    try {
      await post('/api/devices', { name, platform });
      toast('ok', 'Device registered');
      setName('');
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };
  const revoke = async (id: string, next: 'ACTIVE' | 'REVOKED') => {
    await patch('/api/devices', { id, status: next });
    load();
  };

  if (loading) return <Spinner />;
  return (
    <>
      <div className="pb-glass p-3 mb-3 d-flex gap-2 flex-wrap align-items-end">
        <div style={{ flex: 1, minWidth: 180 }}><Field label="Register a device manually"><input className="form-control" placeholder="e.g. Living Room TV" value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
        <div style={{ width: 170 }}>
          <Field label="Platform">
            <select className="form-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {['Android TV', 'Smart TV', 'Android Phone', 'iPhone', 'Windows', 'macOS', 'Fire TV', 'Web'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn btn-pb mb-3" onClick={add} disabled={!name.trim()}>Add device</button>
      </div>
      <div className="pb-glass">
        <table className="pb-table">
          <thead><tr><th>Device</th><th>Platform</th><th>Last active</th><th>IP</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="fw-semibold">{d.name}</td>
                <td>{d.platform}</td>
                <td className="pb-muted">{fmtDateTime(d.lastActiveAt)}</td>
                <td className="pb-muted">{d.lastIp}</td>
                <td><StatusBadge status={d.status} /></td>
                <td className="text-end">
                  {d.status === 'ACTIVE'
                    ? <button className="btn btn-pb-danger btn-sm" onClick={() => revoke(d.id, 'REVOKED')}>Remove</button>
                    : <button className="btn btn-pb-ghost btn-sm" onClick={() => revoke(d.id, 'ACTIVE')}>Restore</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty icon="bi-tv" text="No devices registered yet — they appear automatically when you start watching." />}
      </div>
    </>
  );
}

export function AccountHistory() {
  const [rows, setRows] = useState<{ id: string; label: string; refType: string; refId: string; secondsWatched: number; updatedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    get<{ rows: typeof rows }>('/api/history').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (!rows.length) return <Empty icon="bi-clock-history" text="Nothing watched yet — your history appears here." />;
  return (
    <div className="row g-3">
      {rows.map((h) => (
        <div className="col-md-6 col-xl-4" key={h.id}>
          <div className="pb-glass p-3 d-flex justify-content-between align-items-center gap-2">
            <div>
              <div className="fw-semibold" style={{ fontSize: 14 }}>{h.label || 'Unknown item'}</div>
              <div className="pb-muted" style={{ fontSize: 12 }}>{h.refType === 'CHANNEL' ? 'Live channel' : h.refType === 'MOVIE' ? 'Movie' : 'Episode'} · {Math.round(h.secondsWatched / 60)} min watched · {fmtDateTime(h.updatedAt)}</div>
            </div>
            {h.refType === 'CHANNEL' ? (
              <Link to={`/watch/${h.refId}`} className="btn btn-pb btn-sm"><i className="bi bi-play-fill" /></Link>
            ) : h.refType === 'MOVIE' ? (
              <Link to={`/play/movie/${h.refId}`} className="btn btn-pb btn-sm"><i className="bi bi-play-fill" /></Link>
            ) : (
              <Link to={`/play/episode/${h.refId}`} className="btn btn-pb btn-sm"><i className="bi bi-play-fill" /></Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountFavorites() {
  const [rows, setRows] = useState<{ id: string; refType: string; refId: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshFavorites } = useApp();
  useEffect(() => {
    get<{ rows: typeof rows }>('/api/favorites').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  }, []);
  const remove = async (refType: string, refId: string) => {
    await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refType, refId }) });
    await refreshFavorites();
    setRows((r) => r.filter((x) => !(x.refType === refType && x.refId === refId)));
  };
  if (loading) return <Spinner />;
  if (!rows.length) return <Empty icon="bi-heart" text="No favorites yet — tap the heart on any channel, movie or series." />;
  return (
    <div className="row g-3">
      {rows.map((f) => (
        <div className="col-md-6 col-xl-4" key={f.id}>
          <div className="pb-glass p-3 d-flex justify-content-between align-items-center gap-2">
            <div>
              <div className="fw-semibold" style={{ fontSize: 14 }}>{f.label}</div>
              <Badge kind="gray">{f.refType}</Badge>
            </div>
            <div className="d-flex gap-1">
              {f.refType === 'CHANNEL' && <Link to={`/watch/${f.refId}`} className="btn btn-pb btn-sm"><i className="bi bi-play-fill" /></Link>}
              {f.refType === 'MOVIE' && <Link to={`/play/movie/${f.refId}`} className="btn btn-pb btn-sm"><i className="bi bi-play-fill" /></Link>}
              {f.refType === 'SERIES' && <Link to={`/series/${f.refId}`} className="btn btn-pb btn-sm"><i className="bi bi-play-fill" /></Link>}
              <button className="btn btn-pb-danger btn-sm" onClick={() => remove(f.refType, f.refId)}><i className="bi bi-trash" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountOrders() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    get<{ rows: Order[] }>('/api/orders').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (!rows.length) return <Empty icon="bi-receipt" text="No orders yet." />;
  return (
    <div className="pb-glass table-responsive">
      <table className="pb-table">
        <thead><tr><th>Order</th><th>Plan</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th className="text-end"></th></tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td className="fw-semibold">{o.number}</td>
              <td>{o.plan.name}</td>
              <td>{fmtMoney(o.total, o.currency)}</td>
              <td className="pb-muted">
                {o.paymentMethod === 'CRYPTO_BTC'
                  ? <span className="font-monospace" style={{ fontSize: 11.5 }}>{o.txid ? `TXID ${o.txid.slice(0, 18)}…` : 'BTC — awaiting TXID'}</span>
                  : o.payment ? `${o.payment.cardBrand || o.payment.reference} ${o.payment.cardLast4 ? `••••${o.payment.cardLast4}` : ''}` : '—'}
              </td>
              <td><StatusBadge status={o.status} /></td>
              <td className="pb-muted">{fmtDate(o.createdAt)}</td>
              <td className="text-end">
                {o.paymentMethod === 'CRYPTO_BTC' && o.status === 'PENDING' && (
                  <Link to={`/order/${o.number}`} className="btn btn-pb-gold btn-sm"><i className="bi bi-currency-bitcoin me-1" />Complete BTC payment</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AccountInvoices() {
  const [rows, setRows] = useState<{ id: string; number: string; amount: number; currency: string; status: string; issuedAt: string; order: { number: string; plan: { name: string } } }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    get<{ rows: typeof rows }>('/api/invoices').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (!rows.length) return <Empty icon="bi-file-earmark-text" text="No invoices yet." />;
  return (
    <div className="pb-glass table-responsive">
      <table className="pb-table">
        <thead><tr><th>Invoice</th><th>Order</th><th>Plan</th><th>Amount</th><th>Status</th><th>Issued</th></tr></thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td className="fw-semibold">{i.number}</td>
              <td className="pb-muted">{i.order.number}</td>
              <td>{i.order.plan.name}</td>
              <td>{fmtMoney(i.amount, i.currency)}</td>
              <td><StatusBadge status={i.status} /></td>
              <td className="pb-muted">{fmtDate(i.issuedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AccountTickets() {
  const [rows, setRows] = useState<{ id: string; number: string; subject: string; category: string; priority: string; status: string; updatedAt: string }[]>([]);
  const [open, setOpen] = useState<{ id: string; number: string; subject: string } | null>(null);
  const [thread, setThread] = useState<{ messages: { id: string; body: string; authorRole: string; authorName: string; createdAt: string }[] } | null>(null);
  const [form, setForm] = useState({ subject: '', category: 'Technical', priority: 'NORMAL', message: '' });
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useApp();

  const load = () => {
    get<{ rows: typeof rows }>('/api/support').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openThread = async (t: { id: string }) => {
    const row = rows.find((r) => r.id === t.id);
    if (row) setOpen({ id: row.id, number: row.number, subject: row.subject });
    const r = await get<typeof thread>(`/api/support/${t.id}`);
    setThread(r);
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post('/api/support', form);
      toast('ok', 'Ticket created');
      setForm({ subject: '', category: 'Technical', priority: 'NORMAL', message: '' });
      load();
    } catch (ex) {
      toast('err', (ex as Error).message);
    }
  };
  const sendReply = async () => {
    if (!open) return;
    await post(`/api/support/${open.id}`, { body: reply });
    setReply('');
    openThread(open);
    toast('ok', 'Reply sent');
  };

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <form className="pb-glass p-4 mb-3" onSubmit={create}>
          <h6 className="pb-eyebrow mb-3">New ticket</h6>
          <Field label="Subject"><input className="form-control" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          <div className="row">
            <div className="col-7">
              <Field label="Category">
                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {['Technical', 'Billing', 'Account', 'Channels', 'General'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-5">
              <Field label="Priority">
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <Field label="Message"><textarea className="form-control" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <button className="btn btn-pb w-100">Create ticket</button>
        </form>
      </div>
      <div className="col-lg-7">
        {loading && <Spinner />}
        {!loading && (
          <div className="d-grid gap-2">
            {rows.map((t) => (
              <button key={t.id} className="pb-glass p-3 text-start" onClick={() => openThread(t)}>
                <div className="d-flex justify-content-between gap-2">
                  <span className="fw-semibold">{t.number} · {t.subject}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="pb-muted" style={{ fontSize: 12.5 }}>{t.category} · {t.priority} · updated {fmtDateTime(t.updatedAt)}</div>
              </button>
            ))}
            {!rows.length && <Empty icon="bi-life-preserver" text="No tickets — all quiet." />}
          </div>
        )}
        {open && thread && (
          <div className="pb-glass p-4 mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold m-0">{open.number} · {open.subject}</h6>
              <button className="btn btn-pb-ghost btn-sm" onClick={() => { setOpen(null); setThread(null); }}>Close</button>
            </div>
            <div className="d-grid gap-2 mb-3">
              {thread.messages.map((m) => (
                <div key={m.id} className={`p-3 ${m.authorRole === 'CUSTOMER' ? '' : 'pb-epg-now'}`} style={{ background: 'rgba(255,255,255,.03)', borderRadius: 12 }}>
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold" style={{ fontSize: 13 }}>{m.authorName} <Badge kind="gray">{m.authorRole}</Badge></span>
                    <span className="pb-muted" style={{ fontSize: 12 }}>{fmtDateTime(m.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 14 }}>{m.body}</div>
                </div>
              ))}
            </div>
            <div className="input-group">
              <input className="form-control" placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="btn btn-pb" onClick={sendReply} disabled={!reply.trim()}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountProfile() {
  const { session, refreshSession, toast } = useApp();
  const [form, setForm] = useState({ name: session?.user?.name || '', phone: '', address: '', city: '', country: '', zip: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    get<{ user: { name: string; phone: string; billing: Record<string, string> } | null }>('/api/auth/me').then((s) => {
      if (s.user) {
        const b = s.user.billing || {};
        setForm({ name: s.user.name, phone: s.user.phone || '', address: b.address || '', city: b.city || '', country: b.country || '', zip: b.zip || '' });
      }
    }).catch(() => null);
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await patch('/api/auth/me', {
        name: form.name,
        phone: form.phone,
        billing: { address: form.address, city: form.city, country: form.country, zip: form.zip },
      });
      await refreshSession();
      toast('ok', 'Profile saved');
    } catch (ex) {
      toast('err', (ex as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pb-glass p-4" style={{ maxWidth: 640 }} onSubmit={save}>
      <div className="row">
        <div className="col-md-6"><Field label="Full name"><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
        <div className="col-md-6"><Field label="Phone"><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field></div>
        <div className="col-md-6"><Field label="Address"><input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
        <div className="col-md-6"><Field label="City"><input className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field></div>
        <div className="col-md-6"><Field label="Country"><input className="form-control" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field></div>
        <div className="col-md-6"><Field label="ZIP"><input className="form-control" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field></div>
      </div>
      <button className="btn btn-pb" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

export function AccountPassword() {
  const { toast, refreshSession } = useApp();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await patch('/api/auth/me', form);
      toast('ok', 'Password changed — other sessions revoked');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refreshSession();
    } catch (ex) {
      toast('err', (ex as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pb-glass p-4" style={{ maxWidth: 480 }} onSubmit={submit}>
      <Field label="Current password"><input type="password" className="form-control" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></Field>
      <Field label="New password" hint="8+ characters with letters and numbers"><input type="password" className="form-control" required value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></Field>
      <Field label="Confirm new password"><input type="password" className="form-control" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></Field>
      <button className="btn btn-pb" disabled={busy}>{busy ? 'Updating…' : 'Change password'}</button>
    </form>
  );
}
