'use client';

import { useCallback, useEffect, useState } from 'react';
import { del as apiDelete, get, patch, post, put } from '../api';
import { AdminShell, ADMIN_MODULES } from '../chrome';
import { navigate } from '../router';
import { useApp } from '../store';
import { Badge, Empty, Field, Kpi, Modal, Pagination, Spinner, StatusBadge, fmtDate, fmtDateTime, fmtMoney } from '../ui';
import {
  ResourceView, statusRender, moneyRender, thumbRender,
  type ResourceConfig,
} from './adminResources';
import { AdminXtream } from './iptv';

// ─── Router over admin modules ──────────────────────────────

export function AdminApp({ section }: { section: string }) {
  const { session, sessionLoading } = useApp();
  useEffect(() => {
    if (!sessionLoading && !session?.user) navigate('/login?next=/admin');
  }, [sessionLoading, session]);

  if (sessionLoading) return <Spinner />;
  if (!session?.user) return null;
  if (!['SUPERADMIN', 'ADMIN', 'STAFF'].includes(session.user.role)) {
    return (
      <div className="pb-container mt-5">
        <Empty icon="bi-shield-lock" text="403 — Admin access is restricted to authorized staff accounts.">
          <button className="btn btn-pb btn-sm mt-2" onClick={() => navigate('/')}>Back to site</button>
        </Empty>
      </div>
    );
  }

  const mod = ADMIN_MODULES.flatMap((g) => g.items).find((i) => i.key === section);
  const title = mod?.label || 'Dashboard';

  const views: Record<string, React.ReactNode> = {
    '': <AdminDashboard />,
    analytics: <AdminAnalytics />,
    'website-builder': <WebsiteBuilder />,
    customers: <AdminCustomers />,
    subscriptions: <AdminSubscriptions />,
    orders: <AdminOrders />,
    devices: <AdminDevices />,
    channels: <ResourceView cfg={channelsCfg} />,
    'channel-categories': <ResourceView cfg={categoriesCfg} />,
    epg: <AdminEpg />,
    movies: <ResourceView cfg={moviesCfg} />,
    series: <AdminSeries />,
    sports: <ResourceView cfg={sportsCfg} />,
    plans: <ResourceView cfg={plansCfg} />,
    coupons: <ResourceView cfg={couponsCfg} />,
    payments: <AdminPayments />,
    invoices: <AdminInvoices />,
    tickets: <AdminTickets />,
    notifications: <AdminNotifications />,
    'email-templates': <AdminEmailTemplates />,
    'content-providers': <ResourceView cfg={providersCfg} />,
    'streaming-sources': <ResourceView cfg={sourcesCfg} />,
    'api-integrations': <AdminIntegrations />,
    'iptv-lines': <AdminXtream />,
    'users-roles': <AdminUsers />,
    security: <AdminSecurity />,
    'audit-logs': <AdminAudit />,
    settings: <AdminSettings />,
  };

  return (
    <AdminShell active={section} title={title}>
      {views[section] ?? <AdminDashboard />}
    </AdminShell>
  );
}

// ─── Dashboard ──────────────────────────────────────────────

type DashData = {
  kpis: Record<string, number>;
  recentOrders: { id: string; number: string; status: string; total: number; currency: string; createdAt: string; user: { name: string; email: string }; plan: { name: string } }[];
  recentAudit: { id: string; action: string; actorEmail: string; entity: string; createdAt: string }[];
  recentActivity: { id: string; label: string; user: { name: string }; updatedAt: string; secondsWatched: number }[];
};

export function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    get<DashData>('/api/admin/dashboard').then(setData).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);
  if (err) return <Empty icon="bi-exclamation-triangle" text={err} />;
  if (!data) return <Spinner />;
  const k = data.kpis;
  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-people" label="Customers" value={k.totalCustomers} /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-arrow-repeat" label="Active Subscriptions" value={k.activeSubscriptions} gold /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-pause-circle" label="Expired Subs" value={k.expiredSubscriptions} /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-receipt" label="Today's Orders" value={k.todayOrders} /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-cash-stack" label="Monthly Revenue" value={fmtMoney(k.monthlyRevenue)} gold /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-x-octagon" label="Failed Payments" value={k.failedPayments} /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-tv" label="Active Devices" value={k.activeDevices} /></div>
        <div className="col-6 col-md-4 col-xl-3"><Kpi icon="bi-life-preserver" label="Open Tickets" value={k.openTickets} /></div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-4"><Kpi icon="bi-broadcast" label="Live Channels" value={k.liveChannels} /></div>
        <div className="col-md-4"><Kpi icon="bi-film" label="Movies" value={k.movies} /></div>
        <div className="col-md-4"><Kpi icon="bi-stack" label="Series" value={k.series} /></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="pb-glass p-3">
            <div className="pb-eyebrow mb-2">Recent orders</div>
            <table className="pb-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Plan</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">{o.number}</td>
                    <td className="pb-muted">{o.user.name}</td>
                    <td>{o.plan.name}</td>
                    <td>{fmtMoney(o.total, o.currency)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="pb-glass p-3 mb-3">
            <div className="pb-eyebrow mb-2">Latest admin activity</div>
            {data.recentAudit.map((a) => (
              <div key={a.id} className="d-flex justify-content-between py-1" style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span><Badge kind="gray">{a.action}</Badge> <span className="pb-muted">{a.actorEmail}</span></span>
                <span className="pb-muted">{fmtDateTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
          <div className="pb-glass p-3">
            <div className="pb-eyebrow mb-2">Who's watching</div>
            {data.recentActivity.map((h) => (
              <div key={h.id} className="d-flex justify-content-between py-1" style={{ fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span>{h.user?.name} <span className="pb-muted">· {h.label}</span></span>
                <span className="pb-muted">{Math.round(h.secondsWatched / 60)} min · {fmtDateTime(h.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Analytics ──────────────────────────────────────────────

type AnalyticsData = {
  series: { date: string; revenue: number; orders: number; subs: number; customers: number }[];
  deviceUsage: Record<string, number>;
  popularChannels: { name: string; watchSeconds: number }[];
  popularCategories: Record<string, number>;
  conversion: { orders: number; completed: number; rate: number; revenue: number };
};

export function AdminAnalytics() {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    get<AnalyticsData>(`/api/admin/analytics?range=${range}`).then(setData).catch((e) => setErr(e.message));
  }, [range]);
  if (err) return <Empty icon="bi-exclamation-triangle" text={err} />;
  if (!data) return <Spinner />;

  const maxRev = Math.max(...data.series.map((s) => s.revenue), 1);
  return (
    <>
      <div className="pb-glass p-3 mb-3 d-flex gap-2 align-items-center flex-wrap">
        <span className="pb-eyebrow">Date range</span>
        {['7', '30', '90', '365'].map((r) => (
          <button key={r} className={`btn btn-sm ${range === r ? 'btn-pb' : 'btn-pb-ghost'}`} onClick={() => setRange(r)}>
            {r === '365' ? '12 Months' : `${r} Days`}
          </button>
        ))}
        <div className="flex-fill" />
        <span className="pb-badge gold">Revenue {fmtMoney(data.conversion.revenue)}</span>
        <span className="pb-badge">Conversion {data.conversion.rate}%</span>
      </div>
      <div className="pb-glass p-4 mb-3">
        <div className="pb-eyebrow mb-3">Revenue trend</div>
        <svg viewBox="0 0 700 180" style={{ width: '100%', height: 180 }} preserveAspectRatio="none" role="img" aria-label="Revenue chart">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(46,144,250,0.5)" />
              <stop offset="100%" stopColor="rgba(46,144,250,0)" />
            </linearGradient>
          </defs>
          {(() => {
            const n = data.series.length;
            const pts = data.series.map((s, i) => `${(i / Math.max(1, n - 1)) * 700},${170 - (s.revenue / maxRev) * 150}`).join(' ');
            return (
              <>
                <polyline points={`0,180 ${pts} 700,180`} fill="url(#revGrad)" stroke="none" />
                <polyline points={pts} fill="none" stroke="var(--pb-blue)" strokeWidth="2.5" />
              </>
            );
          })()}
        </svg>
        <div className="d-flex justify-content-between pb-muted" style={{ fontSize: 11 }}>
          <span>{data.series[0]?.date}</span><span>{data.series[data.series.length - 1]?.date}</span>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="pb-glass p-4 h-100">
            <div className="pb-eyebrow mb-3">Orders · Subscriptions · New customers (daily)</div>
            {data.series.slice(-14).reverse().map((s) => (
              <div key={s.date} className="pb-bar-row">
                <span className="pb-muted" style={{ width: 86, fontSize: 11.5 }}>{s.date.slice(5)}</span>
                <div className="pb-bar-track"><div className="pb-bar-fill" style={{ width: `${Math.min(100, (s.orders / Math.max(1, Math.max(...data.series.map((x) => x.orders)))) * 100)}%` }} /></div>
                <span style={{ fontSize: 11.5, width: 90 }} className="pb-muted">{s.orders}o · {s.subs}s · {s.customers}c</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="pb-glass p-4 mb-3">
            <div className="pb-eyebrow mb-3">Device usage</div>
            {Object.entries(data.deviceUsage).sort((a, b) => b[1] - a[1]).map(([platform, n]) => (
              <div key={platform} className="pb-bar-row">
                <span style={{ width: 130, fontSize: 12.5 }}>{platform}</span>
                <div className="pb-bar-track"><div className="pb-bar-fill" style={{ width: `${(n / Math.max(1, Object.values(data.deviceUsage).reduce((a, x) => a + x, 0))) * 100}%` }} /></div>
                <span className="pb-muted" style={{ fontSize: 12 }}>{n}</span>
              </div>
            ))}
          </div>
          <div className="pb-glass p-4">
            <div className="pb-eyebrow mb-3">Popular channels (watch time)</div>
            {data.popularChannels.map((c) => (
              <div key={c.name} className="pb-bar-row">
                <span style={{ width: 140, fontSize: 12.5 }} className="text-truncate">{c.name}</span>
                <div className="pb-bar-track"><div className="pb-bar-fill" style={{ width: `${(c.watchSeconds / Math.max(1, Math.max(...data.popularChannels.map((x) => x.watchSeconds)))) * 100}%` }} /></div>
                <span className="pb-muted" style={{ fontSize: 12 }}>{Math.round(c.watchSeconds / 60)}m</span>
              </div>
            ))}
            {!data.popularChannels.length && <p className="pb-muted mb-0" style={{ fontSize: 13 }}>No watch data yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Website Builder (CMS) ──────────────────────────────────

export function WebsiteBuilder() {
  const { toast } = useApp();
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [footer, setFooter] = useState<Record<string, unknown> | null>(null);
  const [banners, setBanners] = useState<{ text: string; href: string; active: boolean }[]>([]);
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);
  const [seo, setSeo] = useState<Record<string, string> | null>(null);
  const [hero, setHero] = useState<Record<string, string> | null>(null);
  const [stats, setStats] = useState<{ value: string; label: string; note: string }[]>([]);
  const [contact, setContact] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    get<{ settings: Record<string, unknown> }>('/api/admin/settings').then((r) => {
      const s = r.settings;
      const sc = s['site.content'] as Record<string, unknown> | undefined;
      setSite(sc || null);
      setHero((sc?.hero as Record<string, string>) || null);
      setStats((sc?.stats as typeof stats) || []);
      setContact((sc?.contact as Record<string, string>) || null);
      setFooter(s['cms.footer'] as Record<string, unknown> | null);
      setBanners(s['cms.banners'] as typeof banners || []);
      setFaq(s['faq.items'] as typeof faq || []);
      setSeo(s['seo.meta'] as Record<string, string> | null);
    }).catch((e) => toast('err', e.message));
  }, [toast]);

  const save = async (patchObj: Record<string, unknown>) => {
    try {
      await put('/api/admin/settings', { values: patchObj });
      toast('ok', 'Published to the live site');
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  if (!site) return <Spinner />;
  const J = (v: unknown, key: string, def = '') => String((v as Record<string, string>)?.[key] ?? def);
  return (
    <div className="row g-3">
      <div className="col-lg-6">
        <div className="pb-glass p-4">
          <div className="pb-eyebrow mb-3">Homepage hero</div>
          <Field label="Hero title"><input className="form-control" value={J(hero, 'title')} onChange={(e) => setHero({ ...hero, title: e.target.value })} /></Field>
          <Field label="Hero subtitle"><input className="form-control" value={J(hero, 'subtitle')} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} /></Field>
          <Field label="Hero text"><textarea className="form-control" rows={3} value={J(hero, 'text')} onChange={(e) => setHero({ ...hero, text: e.target.value })} /></Field>
          <div className="pb-eyebrow mb-2 mt-2">Stats section</div>
          {stats.map((s, i) => (
            <div className="row g-2 mb-2" key={i}>
              <div className="col-4"><input className="form-control form-control-sm" value={s.value} onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} /></div>
              <div className="col-8"><input className="form-control form-control-sm" value={s.label} onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></div>
              <div className="col-12"><input className="form-control form-control-sm pb-muted" style={{ fontSize: 12 }} value={s.note} onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} /></div>
            </div>
          ))}
          <div className="pb-eyebrow mb-2 mt-2">Contact block</div>
          <div className="row">
            <div className="col-6"><Field label="Email"><input className="form-control" value={J(contact, 'email')} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></Field></div>
            <div className="col-6"><Field label="WhatsApp"><input className="form-control" value={J(contact, 'whatsapp')} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} /></Field></div>
          </div>
          <button className="btn btn-pb-gold" onClick={() => save({ 'site.content': { ...site, hero, stats, contact } })}>
            <i className="bi bi-cloud-arrow-up me-1" /> Publish home changes
          </button>
        </div>
      </div>
      <div className="col-lg-6">
        <div className="pb-glass p-4 mb-3">
          <div className="pb-eyebrow mb-3">Announcement banners</div>
          {banners.map((b, i) => (
            <div className="row g-2 mb-2 align-items-center" key={i}>
              <div className="col-6"><input className="form-control form-control-sm" value={b.text} onChange={(e) => setBanners(banners.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} /></div>
              <div className="col-3"><input className="form-control form-control-sm" value={b.href} onChange={(e) => setBanners(banners.map((x, j) => j === i ? { ...x, href: e.target.value } : x))} /></div>
              <div className="col-2"><input type="checkbox" className="form-check-input" checked={b.active} onChange={(e) => setBanners(banners.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} /> <span className="pb-muted" style={{ fontSize: 12 }}>active</span></div>
              <div className="col-1"><button className="btn btn-pb-danger btn-sm" onClick={() => setBanners(banners.filter((_, j) => j !== i))}><i className="bi bi-x" /></button></div>
            </div>
          ))}
          <button className="btn btn-pb-ghost btn-sm mb-3" onClick={() => setBanners([...banners, { text: 'New banner', href: '#/pricing', active: true }])}>
            <i className="bi bi-plus" /> Add banner
          </button>
          <div className="pb-eyebrow mb-2">SEO metadata</div>
          <Field label="Title"><input className="form-control" value={J(seo, 'title')} onChange={(e) => setSeo({ ...seo, title: e.target.value })} /></Field>
          <Field label="Description"><textarea className="form-control" rows={2} value={J(seo, 'description')} onChange={(e) => setSeo({ ...seo, description: e.target.value })} /></Field>
          <Field label="Keywords"><input className="form-control" value={J(seo, 'keywords')} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} /></Field>
          <button className="btn btn-pb-gold" onClick={() => save({ 'cms.banners': banners, 'seo.meta': seo })}>
            <i className="bi bi-cloud-arrow-up me-1" /> Publish banners + SEO
          </button>
        </div>
        <div className="pb-glass p-4">
          <div className="pb-eyebrow mb-3">FAQ editor</div>
          {faq.map((f, i) => (
            <div className="mb-2" key={i}>
              <input className="form-control form-control-sm mb-1" value={f.q} onChange={(e) => setFaq(faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
              <textarea className="form-control form-control-sm" rows={2} value={f.a} onChange={(e) => setFaq(faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
            </div>
          ))}
          <button className="btn btn-pb-ghost btn-sm me-2" onClick={() => setFaq([...faq, { q: 'New question', a: 'Answer' }])}><i className="bi bi-plus" /> Add FAQ</button>
          <button className="btn btn-pb-gold btn-sm" onClick={() => save({ 'faq.items': faq })}>Publish FAQ</button>
        </div>
      </div>
    </div>
  );
}

// ─── Orders / Subscriptions / Payments / Invoices ───────────

export function AdminOrders() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useApp();
  const size = 20;

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/orders?${qs}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page, q, status]);
  useEffect(load, [load]);

  const setStatusFor = async (id: string, next: string) => {
    try {
      await patch(`/api/admin/orders/${id}`, { status: next });
      toast('ok', `Order marked ${next}`);
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  const cryptoAction = async (id: string, action: 'verify_crypto' | 'reject_crypto') => {
    try {
      if (action === 'verify_crypto') {
        await patch(`/api/admin/orders/${id}`, { action });
        toast('ok', 'Payment verified — subscription given ✅');
      } else {
        await patch(`/api/admin/orders/${id}`, { action });
        toast('ok', 'Payment rejected — customer notified');
      }
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  return (
    <>
      <div className="pb-glass p-3 mb-3 d-flex gap-2 flex-wrap">
        <input className="form-control" style={{ maxWidth: 240 }} placeholder="Order #, customer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="form-select" style={{ maxWidth: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex-fill" />
        <span className="pb-badge">{total} orders</span>
      </div>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Payment / TXID</th><th>Status</th><th>Created</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((o) => {
              const payment = o.payment as { reference?: string; cardBrand?: string; cardLast4?: string } | null;
              const isCrypto = o.paymentMethod === 'CRYPTO_BTC';
              const txid = String(o.txid || '');
              return (
                <tr key={String(o.id)}>
                  <td className="fw-semibold">{String(o.number)}</td>
                  <td>{(o.user as { name: string }).name}<div className="pb-muted" style={{ fontSize: 11.5 }}>{(o.user as { email: string }).email}</div></td>
                  <td>{(o.plan as { name: string }).name}</td>
                  <td>{fmtMoney(Number(o.total), String(o.currency))}</td>
                  <td className="pb-muted" style={{ fontSize: 12 }}>
                    {isCrypto
                      ? <span className="font-monospace" title={txid || payment?.reference}>{txid ? `${txid.slice(0, 20)}…` : (payment?.reference || 'awaiting TXID')}</span>
                      : payment?.cardBrand ? `${payment.cardBrand} ••••${payment.cardLast4}` : payment?.reference || '—'}
                  </td>
                  <td>{statusRender(o.status)}</td>
                  <td className="pb-muted">{fmtDateTime(String(o.createdAt))}</td>
                  <td className="text-end">
                    {isCrypto && o.status === 'PENDING' ? (
                      <div className="d-flex gap-1 justify-content-end">
                        <button className="btn btn-pb-gold btn-sm text-nowrap" onClick={() => cryptoAction(String(o.id), 'verify_crypto')} title="Confirm the BTC payment and give the subscription">
                          <i className="bi bi-check2-circle me-1" />Verify &amp; give sub
                        </button>
                        <button className="btn btn-pb-danger btn-sm" onClick={() => cryptoAction(String(o.id), 'reject_crypto')} title="Reject the submitted TXID">
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                    ) : (
                      <select className="form-select form-select-sm" style={{ minWidth: 130 }} value={String(o.status)} onChange={(e) => setStatusFor(String(o.id), e.target.value)}>
                        {['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-receipt" text="No orders match." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </>
  );
}

export function AdminSubscriptions() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useApp();
  const size = 20;

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) qs.set('status', status);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/subscriptions?${qs}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page, status]);
  useEffect(load, [load]);

  const act = async (id: string, body: Record<string, unknown>) => {
    try {
      await patch(`/api/admin/subscriptions/${id}`, body);
      toast('ok', 'Subscription updated');
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  return (
    <>
      <div className="pb-glass p-3 mb-3 d-flex gap-2">
        <select className="form-select" style={{ maxWidth: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'SUSPENDED'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex-fill" />
        <span className="pb-badge">{total} subscriptions</span>
      </div>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>Starts</th><th>Expires</th><th>Auto-renew</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={String(s.id)}>
                <td>{(s.user as { name: string }).name}<div className="pb-muted" style={{ fontSize: 11.5 }}>{(s.user as { email: string }).email}</div></td>
                <td>{(s.plan as { name: string }).name}</td>
                <td>{statusRender(s.status)}</td>
                <td className="pb-muted">{fmtDate(String(s.startsAt))}</td>
                <td className="pb-muted">{fmtDate(String(s.expiresAt))}</td>
                <td>{s.autoRenew ? <Badge kind="green">On</Badge> : <Badge kind="gray">Off</Badge>}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-pb-ghost btn-sm me-1" onClick={() => act(String(s.id), { extendDays: 30 })}>+30d</button>
                  {s.status !== 'SUSPENDED'
                    ? <button className="btn btn-pb-danger btn-sm me-1" onClick={() => act(String(s.id), { status: 'SUSPENDED' })}>Suspend</button>
                    : <button className="btn btn-pb btn-sm me-1" onClick={() => act(String(s.id), { status: 'ACTIVE' })}>Activate</button>}
                  <button className="btn btn-pb-ghost btn-sm" onClick={() => act(String(s.id), { autoRenew: !s.autoRenew })}>Auto</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-arrow-repeat" text="No subscriptions match." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </>
  );
}

export function AdminPayments() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const size = 20;
  useEffect(() => {
    setLoading(true);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/payments?page=${page}&size=${size}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page]);
  return (
    <>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Reference</th><th>Order</th><th>Customer</th><th>Amount</th><th>Card</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {rows.map((p) => {
              const order = p.order as { number: string; user: { name: string; email: string } } | undefined;
              return (
                <tr key={String(p.id)}>
                  <td className="fw-semibold" style={{ fontSize: 12.5 }}>{String(p.reference)}</td>
                  <td>{order?.number}</td>
                  <td className="pb-muted">{order?.user.email}</td>
                  <td>{fmtMoney(Number(p.amount), String(p.currency))}</td>
                  <td className="pb-muted">{p.cardBrand ? `${p.cardBrand} ••••${p.cardLast4}` : '—'}</td>
                  <td>{statusRender(p.status)}</td>
                  <td className="pb-muted">{fmtDateTime(String(p.createdAt))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-credit-card" text="No payments yet." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </>
  );
}

export function AdminInvoices() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const size = 20;
  useEffect(() => {
    setLoading(true);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/invoices?page=${page}&size=${size}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page]);
  return (
    <>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Issued</th></tr></thead>
          <tbody>
            {rows.map((i) => {
              const order = i.order as { number: string; user: { email: string } } | undefined;
              return (
                <tr key={String(i.id)}>
                  <td className="fw-semibold">{String(i.number)}</td>
                  <td>{order?.number}</td>
                  <td className="pb-muted">{order?.user.email}</td>
                  <td>{fmtMoney(Number(i.amount), String(i.currency))}</td>
                  <td>{statusRender(i.status)}</td>
                  <td className="pb-muted">{fmtDate(String(i.issuedAt))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-file-earmark-text" text="No invoices yet." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </>
  );
}

// ─── Customers ──────────────────────────────────────────────

export function AdminCustomers() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantNote, setGrantNote] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const { toast } = useApp();
  const size = 20;

  const load = useCallback(() => {
    setLoading(true);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/customers?page=${page}&size=${size}&q=${encodeURIComponent(q)}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page, q]);
  useEffect(load, [load]);

  const act = async (id: string, action: string) => {
    try {
      const r = await patch<{ tempPassword?: string }>(`/api/admin/customers/${id}`, { action });
      if (r.tempPassword) toast('ok', `Temp password (copy now): ${r.tempPassword}`);
      else toast('ok', `Customer ${action}d`);
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  const grantSubscription = async () => {
    const id = String((detail?.user as { id?: string })?.id || '');
    if (!id) return;
    setGrantBusy(true);
    try {
      const r = await patch<{ expiresAt: string }>(`/api/admin/customers/${id}`, { action: 'grant_subscription', months: grantMonths, note: grantNote });
      toast('ok', `Subscription given — active until ${new Date(r.expiresAt).toDateString()}`);
      setGrantNote('');
      setGrantMonths(1);
      get(`/api/admin/customers/${id}`).then(setDetail).catch(() => null);
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    } finally {
      setGrantBusy(false);
    }
  };

  return (
    <>
      <div className="pb-glass p-3 mb-3 d-flex gap-2 flex-wrap">
        <input className="form-control" style={{ maxWidth: 260 }} placeholder="Name, email, phone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <div className="flex-fill" />
        <span className="pb-badge">{total} customers</span>
      </div>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Customer</th><th>Plan</th><th>LTV</th><th>Devices</th><th>Tickets</th><th>Status</th><th>Joined</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={String(c.id)}>
                <td className="fw-semibold">{String(c.name)}<div className="pb-muted" style={{ fontSize: 11.5 }}>{String(c.email)}</div></td>
                <td>{c.activePlan ? <Badge kind="green">{String(c.activePlan)}</Badge> : <span className="pb-muted">—</span>}</td>
                <td>{fmtMoney(Number(c.lifetimeValue))}</td>
                <td>{String(c.devicesCount)}</td>
                <td>{String(c.ticketsCount)}</td>
                <td>{statusRender(c.status)}</td>
                <td className="pb-muted">{fmtDate(String(c.createdAt))}</td>
                <td className="text-end text-nowrap">
                  <button className="btn btn-pb-ghost btn-sm me-1" onClick={() => get(`/api/admin/customers/${c.id}`).then(setDetail).catch((e) => toast('err', e.message))}>
                    <i className="bi bi-eye" />
                  </button>
                  {c.status === 'ACTIVE'
                    ? <button className="btn btn-pb-danger btn-sm me-1" onClick={() => act(String(c.id), 'suspend')}><i className="bi bi-pause" /></button>
                    : <button className="btn btn-pb btn-sm me-1" onClick={() => act(String(c.id), 'activate')}><i className="bi bi-play" /></button>}
                  <button className="btn btn-pb-ghost btn-sm" onClick={() => act(String(c.id), 'reset-password')} title="Reset password"><i className="bi bi-key" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-people" text="No customers match." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Customer · ${(detail?.user as { name?: string })?.name || ''}`} wide>
        {detail && (
          <div className="row g-3">
            <div className="col-md-4">
              <div className="pb-eyebrow mb-2">Profile</div>
              <div style={{ fontSize: 13.5 }}>{String((detail.user as { name: string }).name)}</div>
              <div className="pb-muted" style={{ fontSize: 13 }}>{String((detail.user as { email: string }).email)}</div>
              <div className="pb-muted" style={{ fontSize: 13 }}>{String((detail.user as { phone?: string }).phone || '—')}</div>
              <div className="pb-muted" style={{ fontSize: 13 }}>Joined {fmtDate(String((detail.user as { createdAt: string }).createdAt))}</div>
            </div>
            <div className="col-md-4">
              <div className="pb-eyebrow mb-2">Subscriptions</div>
              {(detail.subscriptions as { id: string; status: string; expiresAt: string; plan: { name: string } }[]).map((s) => (
                <div key={s.id} className="d-flex justify-content-between py-1" style={{ fontSize: 13 }}>
                  <span>{s.plan.name}</span><StatusBadge status={s.status} />
                </div>
              ))}
              <div className="pb-glass p-3 mt-2">
                <div className="pb-eyebrow mb-2">Give subscription</div>
                <div className="d-flex gap-2 align-items-end">
                  <div style={{ width: 90 }}>
                    <Field label="Months">
                      <input type="number" min={1} max={36} className="form-control form-control-sm" value={grantMonths} onChange={(e) => setGrantMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))} />
                    </Field>
                  </div>
                  <button className="btn btn-pb-gold btn-sm mb-1" onClick={grantSubscription} disabled={grantBusy}>
                    <i className="bi bi-gift me-1" />{grantBusy ? 'Granting…' : 'Grant'}
                  </button>
                </div>
                <Field label="Note (internal, optional)">
                  <input className="form-control form-control-sm" placeholder="e.g. reseller sale, comp, good-will" value={grantNote} onChange={(e) => setGrantNote(e.target.value)} />
                </Field>
                <div className="pb-muted" style={{ fontSize: 11.5 }}>Creates a completed admin-grant order + active subscription + notification. Audited.</div>
              </div>
              <div className="pb-eyebrow mb-2 mt-3">Devices</div>
              {(detail.devices as { id: string; name: string; status: string }[]).map((d) => (
                <div key={d.id} className="d-flex justify-content-between py-1" style={{ fontSize: 13 }}>
                  <span>{d.name}</span><StatusBadge status={d.status} />
                </div>
              ))}
            </div>
            <div className="col-md-4">
              <div className="pb-eyebrow mb-2">Orders</div>
              {(detail.orders as { id: string; number: string; total: number; currency: string; status: string; plan: { name: string } }[]).map((o) => (
                <div key={o.id} className="d-flex justify-content-between py-1" style={{ fontSize: 13 }}>
                  <span>{o.number} · {o.plan.name}</span>
                  <span>{fmtMoney(o.total, o.currency)} <StatusBadge status={o.status} /></span>
                </div>
              ))}
              <div className="pb-eyebrow mb-2 mt-3">Tickets</div>
              {(detail.tickets as { id: string; number: string; subject: string; status: string }[]).map((t) => (
                <div key={t.id} className="d-flex justify-content-between py-1" style={{ fontSize: 13 }}>
                  <span>{t.number}</span><StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── EPG admin ──────────────────────────────────────────────

export function AdminEpg() {
  const { toast } = useApp();
  const [channels, setChannels] = useState<{ id: string; name: string; epgId: string; _count: { epgPrograms: number } }[]>([]);
  const [logs, setLogs] = useState<{ id: string; source: string; status: string; message: string; programsImported: number; channelsMapped: number; createdAt: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [programs, setPrograms] = useState<{ id: string; title: string; startsAt: string; endsAt: string }[]>([]);
  const [xml, setXml] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    get<{ channels: typeof channels; logs: typeof logs; programs: typeof programs }>(`/api/admin/epg${selected ? `?channelId=${selected}` : ''}`)
      .then((r) => { setChannels(r.channels); setLogs(r.logs); setPrograms(r.programs); })
      .catch((e) => toast('err', e.message));
  }, [selected, toast]);
  useEffect(load, [load]);

  const importXml = async () => {
    setBusy(true);
    try {
      const r = await post<{ imported: number; mapped: number; unmatched: number }>('/api/admin/epg', xml.trim() ? { xml } : { url });
      toast('ok', `Imported ${r.imported} programs across ${r.mapped} channels (${r.unmatched} unmatched)`);
      setXml('');
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="pb-glass p-4 mb-3">
          <div className="pb-eyebrow mb-3">XMLTV import</div>
          <Field label="Or fetch from URL">
            <input className="form-control" placeholder="https://example.com/epg.xml" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="…or paste XMLTV XML">
            <textarea className="form-control font-monospace" rows={6} value={xml} onChange={(e) => setXml(e.target.value)} placeholder={'<tv>\n  <programme channel="pbtv.pulse-news-24" start="20260105120000" stop="20260105130000">…'} />
          </Field>
          <button className="btn btn-pb w-100" onClick={importXml} disabled={busy || (!xml.trim() && !url.trim())}>
            {busy ? 'Importing…' : 'Import EPG'}
          </button>
        </div>
        <div className="pb-glass p-4">
          <div className="pb-eyebrow mb-3">Sync logs</div>
          {logs.map((l) => (
            <div key={l.id} className="py-1" style={{ fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <Badge kind={l.status === 'OK' ? 'green' : 'red'}>{l.status}</Badge> <span className="pb-muted">{l.source}</span>
              <div className="pb-muted">{l.message} · {fmtDateTime(l.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="col-lg-7">
        <div className="pb-glass p-3 mb-3">
          <div className="d-flex gap-2 align-items-end flex-wrap">
            <div style={{ flex: 1, minWidth: 200 }}>
              <Field label="Channel mapping & schedule">
                <select className="form-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">Select a channel…</option>
                  {channels.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.epgId || 'no epg id'}) — {c._count.epgPrograms} programs</option>)}
                </select>
              </Field>
            </div>
            {selected && (
              <button
                className="btn btn-pb-danger mb-3"
                onClick={async () => {
                  await apiDelete(`/api/admin/epg?channelId=${selected}`);
                  toast('ok', 'Schedule purged');
                  load();
                }}
              >
                <i className="bi bi-trash me-1" /> Purge schedule
              </button>
            )}
          </div>
          {selected && programs.length > 0 && (
            <div className="table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="pb-table">
                <thead><tr><th>Start</th><th>End</th><th>Program</th></tr></thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.id}>
                      <td className="pb-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDateTime(p.startsAt)}</td>
                      <td className="pb-muted" style={{ fontSize: 12.5 }}>{fmtDateTime(p.endsAt)}</td>
                      <td>{p.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selected && !programs.length && <Empty icon="bi-calendar3" text="No programs for this channel — import or extend the EPG window." />}
          {!selected && <Empty icon="bi-calendar3" text="Select a channel to inspect its EPG schedule." />}
        </div>
      </div>
    </div>
  );
}

// ─── Support admin ──────────────────────────────────────────

export function AdminTickets() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ticket: Record<string, unknown>; messages: { id: string; body: string; authorRole: string; authorName: string; isInternal: boolean; createdAt: string }[] } | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const { toast } = useApp();

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (status) qs.set('status', status);
    get<{ rows: Record<string, unknown>[] }>(`/api/admin/tickets?${qs}`)
      .then((r) => setRows(r.rows))
      .finally(() => setLoading(false));
  }, [q, status]);
  useEffect(load, [load]);

  const openThread = async (id: string) => {
    setOpenId(id);
    const r = await get<{ ticket: Record<string, unknown>; messages: typeof thread extends null ? never : NonNullable<typeof thread>['messages'] }>(`/api/admin/tickets/${id}`);
    setThread(r as never);
  };

  const send = async () => {
    if (!openId) return;
    await post(`/api/admin/tickets/${openId}`, { body: reply, isInternal: internal });
    setReply('');
    toast('ok', internal ? 'Internal note added' : 'Reply sent');
    openThread(openId);
    load();
  };

  const update = async (id: string, body: Record<string, unknown>) => {
    await patch(`/api/admin/tickets/${id}`, body);
    toast('ok', 'Ticket updated');
    load();
  };

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="pb-glass p-3 mb-3 d-flex gap-2">
          <input className="form-control" placeholder="Ticket #, subject, customer…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="form-select" style={{ maxWidth: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {loading && <Spinner />}
        <div className="d-grid gap-2">
          {rows.map((t) => {
            const user = t.user as { name: string; email: string };
            return (
              <button key={String(t.id)} className={`pb-glass p-3 text-start ${openId === t.id ? 'pb-epg-now' : ''}`} onClick={() => openThread(String(t.id))}>
                <div className="d-flex justify-content-between gap-2">
                  <span className="fw-semibold" style={{ fontSize: 13.5 }}>{String(t.number)} · {String(t.subject)}</span>
                  {statusRender(t.status)}
                </div>
                <div className="pb-muted" style={{ fontSize: 12 }}>{user.name} · {String(t.category)} · {String(t.priority)} · {fmtDateTime(String(t.updatedAt))}</div>
              </button>
            );
          })}
          {!loading && !rows.length && <Empty icon="bi-life-preserver" text="No tickets match." />}
        </div>
      </div>
      <div className="col-lg-7">
        {openId && thread ? (
          <div className="pb-glass p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h6 className="fw-bold m-0">{String(thread.ticket.number)} · {String(thread.ticket.subject)}</h6>
              <div className="d-flex gap-2">
                <select className="form-select form-select-sm" style={{ width: 140 }} value={String(thread.ticket.status)} onChange={(e) => update(String(thread.ticket.id), { status: e.target.value })}>
                  {['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className="form-select form-select-sm" style={{ width: 120 }} value={String(thread.ticket.priority)} onChange={(e) => update(String(thread.ticket.id), { priority: e.target.value })}>
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="d-grid gap-2 mb-3" style={{ maxHeight: 380, overflowY: 'auto' }}>
              {thread.messages.map((m) => (
                <div key={m.id} className="p-3" style={{ background: m.isInternal ? 'rgba(245,179,1,.06)' : 'rgba(255,255,255,.03)', borderRadius: 12, borderLeft: `3px solid ${m.isInternal ? 'var(--pb-gold)' : m.authorRole === 'CUSTOMER' ? 'transparent' : 'var(--pb-blue)'}` }}>
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold" style={{ fontSize: 13 }}>{m.authorName} <Badge kind={m.authorRole === 'CUSTOMER' ? 'gray' : ''}>{m.authorRole}</Badge>{m.isInternal && <Badge kind="gold">Internal</Badge>}</span>
                    <span className="pb-muted" style={{ fontSize: 12 }}>{fmtDateTime(m.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 14 }}>{m.body}</div>
                </div>
              ))}
            </div>
            <div className="d-flex gap-2 align-items-center">
              <input type="checkbox" className="form-check-input" checked={internal} onChange={(e) => setInternal(e.target.checked)} id="internal-note" />
              <label htmlFor="internal-note" className="pb-muted" style={{ fontSize: 13 }}>Internal note (hidden from customer)</label>
            </div>
            <div className="input-group mt-2">
              <input className="form-control" placeholder={internal ? 'Internal note…' : 'Reply to customer…'} value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="btn btn-pb" onClick={send} disabled={!reply.trim()}>Send</button>
            </div>
          </div>
        ) : (
          <Empty icon="bi-chat-left-text" text="Select a ticket to open the conversation." />
        )}
      </div>
    </div>
  );
}

// ─── Users / Security / Audit / Settings / Integrations / Notifications / Templates / Series ──

export function AdminUsers() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'STAFF', twoFactor: false });
  const { toast, session } = useApp();
  const load = useCallback(() => {
    get<{ rows: Record<string, unknown>[] }>('/api/admin/users').then((r) => setRows(r.rows)).catch((e) => toast('err', e.message));
  }, [toast]);
  useEffect(load, [load]);

  const act = async (id: string, body: Record<string, unknown>) => {
    try {
      await patch(`/api/admin/users/${id}`, body);
      toast('ok', 'User updated');
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-pb btn-sm" onClick={() => setCreating(true)}><i className="bi bi-plus-lg me-1" /> New staff account</button>
      </div>
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>User</th><th>Role</th><th>2FA</th><th>Status</th><th>Last login</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={String(u.id)}>
                <td className="fw-semibold">{String(u.name)}<div className="pb-muted" style={{ fontSize: 11.5 }}>{String(u.email)}</div></td>
                <td><Badge kind={u.role === 'SUPERADMIN' ? 'gold' : ''}>{String((u.role as { name: string }).name)}</Badge></td>
                <td>{u.twoFactor ? <Badge kind="green">On</Badge> : <Badge kind="gray">Off</Badge>}</td>
                <td>{statusRender(u.status)}</td>
                <td className="pb-muted">{u.lastLoginAt ? fmtDateTime(String(u.lastLoginAt)) : '—'}</td>
                <td className="text-end text-nowrap">
                  {u.status === 'ACTIVE'
                    ? <button className="btn btn-pb-danger btn-sm me-1" onClick={() => act(String(u.id), { status: 'SUSPENDED' })}>Suspend</button>
                    : <button className="btn btn-pb btn-sm me-1" onClick={() => act(String(u.id), { status: 'ACTIVE' })}>Activate</button>}
                  <button className="btn btn-pb-ghost btn-sm me-1" onClick={() => act(String(u.id), { twoFactor: !u.twoFactor })}>2FA</button>
                  {String(u.id) !== session?.user?.id && (
                    <button className="btn btn-pb-danger btn-sm" onClick={async () => { await apiDelete(`/api/admin/users/${u.id}`); toast('ok', 'Account deactivated'); load(); }}>
                      <i className="bi bi-trash" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="New staff account">
        <div className="row">
          <div className="col-md-6"><Field label="Name"><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
          <div className="col-md-6"><Field label="Email"><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field></div>
          <div className="col-md-6"><Field label="Phone"><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field></div>
          <div className="col-md-6"><Field label="Password"><input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field></div>
          <div className="col-md-6">
            <Field label="Role">
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {['STAFF', 'ADMIN', 'SUPERADMIN'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <button
          className="btn btn-pb"
          onClick={async () => {
            try {
              await post('/api/admin/users', form);
              toast('ok', 'Staff account created');
              setCreating(false);
              setForm({ name: '', email: '', phone: '', password: '', role: 'STAFF', twoFactor: false });
              load();
            } catch (e) {
              toast('err', (e as Error).message);
            }
          }}
        >
          Create account
        </button>
      </Modal>
    </>
  );
}

export function AdminSecurity() {
  const { toast } = useApp();
  const [data, setData] = useState<{
    users: { id: string; email: string; name: string; role: { name: string }; status: string; twoFactor: boolean; lastLoginAt: string | null }[];
    sessions: { activeDevices: number };
    twoFactorAdoption: number;
    loginEvents: { id: string; action: string; actorEmail: string; ip: string; createdAt: string }[];
    securityActions: { id: string; action: string; actorEmail: string; entity: string; createdAt: string }[];
  } | null>(null);
  useEffect(() => {
    get<typeof data>('/api/admin/security').then(setData).catch((e) => toast('err', e.message));
  }, [toast]);
  if (!data) return <Spinner />;
  const act = async (userId: string, action: string) => {
    await post('/api/admin/security', { userId, action });
    toast('ok', action === 'revoke-sessions' ? 'All sessions revoked' : '2FA toggled');
    get<typeof data>('/api/admin/security').then(setData);
  };
  return (
    <div className="row g-3">
      <div className="col-md-4"><Kpi icon="bi-tv" label="Active device sessions" value={data.sessions.activeDevices} /></div>
      <div className="col-md-4"><Kpi icon="bi-shield-check" label="2FA enabled accounts" value={`${data.twoFactorAdoption}/${data.users.length}`} gold /></div>
      <div className="col-md-4"><Kpi icon="bi-person-lock" label="Staff accounts" value={data.users.length} /></div>
      <div className="col-lg-6">
        <div className="pb-glass p-3">
          <div className="pb-eyebrow mb-2">Account controls</div>
          <table className="pb-table">
            <thead><tr><th>User</th><th>Role</th><th>Sessions</th></tr></thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}<div className="pb-muted" style={{ fontSize: 11.5 }}>{u.email}</div></td>
                  <td><Badge kind={u.role.name === 'SUPERADMIN' ? 'gold' : ''}>{u.role.name}</Badge></td>
                  <td className="text-end">
                    <button className="btn btn-pb-ghost btn-sm me-1" onClick={() => act(u.id, 'revoke-sessions')} title="Revoke all sessions"><i className="bi bi-x-octagon" /> Revoke</button>
                    <button className="btn btn-pb-ghost btn-sm" onClick={() => act(u.id, 'toggle-2fa')}>2FA</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="col-lg-6">
        <div className="pb-glass p-3 mb-3">
          <div className="pb-eyebrow mb-2">Login events</div>
          {data.loginEvents.slice(0, 8).map((l) => (
            <div key={l.id} className="d-flex justify-content-between py-1" style={{ fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <span><Badge kind="gray">{l.action}</Badge> {l.actorEmail}</span>
              <span className="pb-muted">{fmtDateTime(l.createdAt)}</span>
            </div>
          ))}
        </div>
        <div className="pb-glass p-3">
          <div className="pb-eyebrow mb-2">Security-relevant actions</div>
          {data.securityActions.slice(0, 8).map((l) => (
            <div key={l.id} className="d-flex justify-content-between py-1" style={{ fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <span><Badge kind="gold">{l.action}</Badge> {l.actorEmail}</span>
              <span className="pb-muted">{fmtDateTime(l.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminAudit() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const size = 30;
  useEffect(() => {
    setLoading(true);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/audit?page=${page}&size=${size}&q=${encodeURIComponent(q)}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page, q]);
  return (
    <>
      <div className="pb-glass p-3 mb-3">
        <input className="form-control" placeholder="Filter by actor, action, entity…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th><th>Meta</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={String(a.id)}>
                <td className="pb-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(String(a.createdAt))}</td>
                <td>{String(a.actorEmail)}</td>
                <td><Badge kind="gray">{String(a.action)}</Badge></td>
                <td className="pb-muted">{String(a.entity)}{a.entityId ? ` · ${String(a.entityId).slice(0, 8)}` : ''}</td>
                <td className="pb-muted">{String(a.ip)}</td>
                <td className="pb-muted" style={{ fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(a.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-journal-text" text="No audit entries match." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </>
  );
}

export function AdminSettings() {
  const { toast } = useApp();
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    get<{ settings: Record<string, unknown> }>('/api/admin/settings').then((r) => setSettings(r.settings)).catch((e) => toast('err', e.message));
  }, [toast]);
  if (!settings) return <Spinner />;
  return (
    <>
      <div className="alert alert-info py-2" style={{ background: 'rgba(46,144,250,.08)', borderColor: 'rgba(46,144,250,.25)', color: '#9ecbff', fontSize: 13.5 }}>
        These are the platform-level settings (raw JSON). Use <b>Website Builder</b> for friendly marketing-content editing.
      </div>
      <div className="d-grid gap-3">
        {Object.entries(settings).map(([key, value]) => (
          <div className="pb-glass p-3" key={key}>
            <div className="pb-eyebrow mb-2">{key}</div>
            <textarea
              className="form-control font-monospace"
              rows={Math.min(12, JSON.stringify(value, null, 2).split('\n').length)}
              defaultValue={JSON.stringify(value, null, 2)}
              onBlur={async (e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  await put('/api/admin/settings', { values: { [key]: parsed } });
                  toast('ok', `${key} saved`);
                } catch {
                  toast('err', 'Invalid JSON — not saved');
                }
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminNotifications() {
  const { toast } = useApp();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({ title: '', body: '', channel: 'INAPP', userIds: '' });
  const load = useCallback(() => {
    get<{ rows: Record<string, unknown>[] }>('/api/admin/notifications').then((r) => setRows(r.rows)).catch((e) => toast('err', e.message));
  }, [toast]);
  useEffect(load, [load]);
  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="pb-glass p-4">
          <div className="pb-eyebrow mb-3">Send notification</div>
          <Field label="Title"><input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Message"><textarea className="form-control" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <Field label="Channel">
            <select className="form-select" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option>INAPP</option><option>EMAIL</option>
            </select>
          </Field>
          <Field label="Target user IDs (comma separated)" hint="Leave empty to broadcast to ALL active customers.">
            <input className="form-control" value={form.userIds} onChange={(e) => setForm({ ...form, userIds: e.target.value })} />
          </Field>
          <button
            className="btn btn-pb w-100"
            onClick={async () => {
              try {
                const r = await post<{ delivered: number }>('/api/admin/notifications', {
                  title: form.title, body: form.body, channel: form.channel,
                  userIds: form.userIds ? form.userIds.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
                });
                toast('ok', `Delivered to ${r.delivered} recipient(s)`);
                setForm({ title: '', body: '', channel: 'INAPP', userIds: '' });
                load();
              } catch (e) {
                toast('err', (e as Error).message);
              }
            }}
            disabled={!form.title.trim() || !form.body.trim()}
          >
            <i className="bi bi-send me-1" /> Send
          </button>
        </div>
      </div>
      <div className="col-lg-8">
        <div className="pb-glass table-responsive">
          <table className="pb-table">
            <thead><tr><th>Title</th><th>Body</th><th>Channel</th><th>Recipient</th><th>Sent</th><th></th></tr></thead>
            <tbody>
              {rows.map((n) => (
                <tr key={String(n.id)}>
                  <td className="fw-semibold">{String(n.title)}</td>
                  <td className="pb-muted" style={{ fontSize: 12.5, maxWidth: 260 }}>{String(n.body).slice(0, 80)}</td>
                  <td><Badge kind={n.channel === 'EMAIL' ? 'gold' : ''}>{String(n.channel)}</Badge></td>
                  <td className="pb-muted" style={{ fontSize: 12.5 }}>{n.user ? String((n.user as { email: string }).email) : 'Broadcast'}</td>
                  <td className="pb-muted">{fmtDateTime(String(n.createdAt))}</td>
                  <td><button className="btn btn-pb-danger btn-sm" onClick={async () => { await apiDelete(`/api/admin/notifications/${n.id}`); load(); }}><i className="bi bi-trash" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminEmailTemplates() {
  const { toast } = useApp();
  const [rows, setRows] = useState<{ id: string; key: string; subject: string; bodyHtml: string }[]>([]);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState({ subject: '', bodyHtml: '' });
  const load = useCallback(() => {
    get<{ rows: typeof rows }>('/api/admin/email-templates').then((r) => setRows(r.rows)).catch((e) => toast('err', e.message));
  }, [toast]);
  useEffect(load, [load]);
  return (
    <div className="row g-3">
      {rows.map((t) => (
        <div className="col-lg-6" key={t.id}>
          <div className="pb-glass p-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Badge kind="gold">{t.key}</Badge>
              {editKey !== t.key && <button className="btn btn-pb-ghost btn-sm" onClick={() => { setEditKey(t.key); setDraft({ subject: t.subject, bodyHtml: t.bodyHtml }); }}>Edit</button>}
            </div>
            {editKey === t.key ? (
              <>
                <Field label="Subject"><input className="form-control" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></Field>
                <Field label="HTML body" hint="Placeholders like {{name}}, {{order}}, {{total}}"><textarea className="form-control font-monospace" rows={5} value={draft.bodyHtml} onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })} /></Field>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-pb btn-sm"
                    onClick={async () => {
                      await put('/api/admin/email-templates', { key: t.key, ...draft });
                      toast('ok', 'Template saved');
                      setEditKey(null);
                      load();
                    }}
                  >Save</button>
                  <button className="btn btn-pb-ghost btn-sm" onClick={() => setEditKey(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5 }} className="fw-semibold">{t.subject}</div>
                <div className="pb-muted" style={{ fontSize: 12.5 }}>{t.bodyHtml.replace(/<[^>]+>/g, ' ').slice(0, 120)}…</div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminIntegrations() {
  const { toast } = useApp();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const load = useCallback(() => {
    get<{ rows: Record<string, unknown>[] }>('/api/admin/integrations').then((r) => setRows(r.rows)).catch((e) => toast('err', e.message));
  }, [toast]);
  useEffect(load, [load]);
  return (
    <>
      <div className="alert alert-info py-2" style={{ background: 'rgba(46,144,250,.08)', borderColor: 'rgba(46,144,250,.25)', color: '#9ecbff', fontSize: 13.5 }}>
        Secrets are stored by <b>reference</b> (environment variable names) and masked on display — raw secrets never enter the database or the browser.
      </div>
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Name</th><th>Kind</th><th>Config</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td className="fw-semibold">{String(r.name)}</td>
                <td><Badge kind="gray">{String(r.kind)}</Badge></td>
                <td className="pb-muted font-monospace" style={{ fontSize: 12 }}>{String(r.config)}</td>
                <td>{statusRender(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminDevices() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useApp();
  const size = 20;
  const load = useCallback(() => {
    setLoading(true);
    get<{ rows: Record<string, unknown>[]; total: number }>(`/api/admin/devices?page=${page}&size=${size}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [page]);
  useEffect(load, [load]);
  return (
    <>
      {loading && <Spinner />}
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Device</th><th>Platform</th><th>Customer</th><th>Last active</th><th>IP</th><th>Status</th><th className="text-end">Action</th></tr></thead>
          <tbody>
            {rows.map((d) => {
              const user = d.user as { name: string; email: string } | undefined;
              return (
                <tr key={String(d.id)}>
                  <td className="fw-semibold">{String(d.name)}</td>
                  <td>{String(d.platform)}</td>
                  <td className="pb-muted">{user?.email}</td>
                  <td className="pb-muted">{fmtDateTime(String(d.lastActiveAt))}</td>
                  <td className="pb-muted">{String(d.lastIp)}</td>
                  <td>{statusRender(d.status)}</td>
                  <td className="text-end">
                    {d.status === 'ACTIVE'
                      ? <button className="btn btn-pb-danger btn-sm" onClick={async () => { await patch(`/api/admin/devices/${d.id}`, { status: 'REVOKED' }); toast('ok', 'Device revoked'); load(); }}>Revoke</button>
                      : <button className="btn btn-pb-ghost btn-sm" onClick={async () => { await patch(`/api/admin/devices/${d.id}`, { status: 'ACTIVE' }); load(); }}>Restore</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !rows.length && <Empty icon="bi-tv" text="No devices registered." />}
      </div>
      <Pagination page={page} size={size} total={total} onPage={setPage} />
    </>
  );
}

// ─── Series admin with seasons/episodes editor ──────────────

type SeasonInput = { number: number; title: string; episodes: { number: number; title: string; description: string; durationMin: number; playbackUrl: string }[] };

export function AdminSeries() {
  const { toast } = useApp();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [seasons, setSeasons] = useState<SeasonInput[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    get<{ rows: Record<string, unknown>[] }>('/api/admin/series?size=50').then((r) => setRows(r.rows)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const open = (row: Record<string, unknown> | null) => {
    setEditing(row || { title: '', description: '', genres: '', language: 'English', year: 2026, quality: 'HD', status: 'PUBLISHED' });
    const s = (row?.seasons as { number: number; title: string; episodes: { number: number; title: string; description: string; durationMin: number; playbackUrl: string }[] }[]) || [];
    setSeasons(s.length ? s.map((x) => ({ number: x.number, title: x.title, episodes: x.episodes })) : [{ number: 1, title: 'Season 1', episodes: [] }]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.target as HTMLFormElement);
    const base: Record<string, unknown> = {
      title: fd.get('title'), description: fd.get('description'), genres: fd.get('genres'),
      language: fd.get('language'), year: Number(fd.get('year')), quality: fd.get('quality'), status: fd.get('status'),
    };
    try {
      if (editing.id) await patch(`/api/admin/series/${editing.id}`, { ...base, seasons });
      else await post('/api/admin/series', { ...base, seasons });
      toast('ok', 'Series saved');
      setEditing(null);
      load();
    } catch (ex) {
      toast('err', (ex as Error).message);
    }
  };

  if (loading) return <Spinner />;
  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-pb btn-sm" onClick={() => open(null)}><i className="bi bi-plus-lg me-1" /> New series</button>
      </div>
      <div className="pb-glass table-responsive">
        <table className="pb-table">
          <thead><tr><th>Art</th><th>Title</th><th>Seasons/Episodes</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {rows.map((s) => {
              const seasons = (s.seasons as { episodes: unknown[] }[]) || [];
              return (
                <tr key={String(s.id)}>
                  <td style={{ width: 100 }}>{thumbRender('posterSeed', 'title')(s)}</td>
                  <td className="fw-semibold">{String(s.title)}<div className="pb-muted" style={{ fontSize: 11.5 }}>{String(s.genres)} · {String(s.year)}</div></td>
                  <td>{seasons.length} / {seasons.reduce((a, x) => a + x.episodes.length, 0)}</td>
                  <td>{statusRender(s.status)}</td>
                  <td className="text-end">
                    <button className="btn btn-pb-ghost btn-sm" onClick={() => open(s)}><i className="bi bi-pencil" /> Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? `Edit ${editing.title}` : 'New series'} wide>
          <form onSubmit={save}>
            <div className="row">
              <div className="col-md-6"><Field label="Title *"><input name="title" className="form-control" required defaultValue={String(editing.title || '')} /></Field></div>
              <div className="col-md-6"><Field label="Genres (comma separated)"><input name="genres" className="form-control" defaultValue={String(editing.genres || '')} /></Field></div>
              <div className="col-12"><Field label="Description"><textarea name="description" className="form-control" rows={2} defaultValue={String(editing.description || '')} /></Field></div>
              <div className="col-md-3"><Field label="Language"><input name="language" className="form-control" defaultValue={String(editing.language || 'English')} /></Field></div>
              <div className="col-md-3"><Field label="Year"><input name="year" type="number" className="form-control" defaultValue={String(editing.year || 2026)} /></Field></div>
              <div className="col-md-3">
                <Field label="Quality">
                  <select name="quality" className="form-select" defaultValue={String(editing.quality || 'HD')}>{['HD', '4K'].map((q) => <option key={q}>{q}</option>)}</select>
                </Field>
              </div>
              <div className="col-md-3">
                <Field label="Status">
                  <select name="status" className="form-select" defaultValue={String(editing.status || 'PUBLISHED')}>{['PUBLISHED', 'DRAFT'].map((q) => <option key={q}>{q}</option>)}</select>
                </Field>
              </div>
            </div>
            <div className="pb-eyebrow mb-2">Seasons & episodes</div>
            {seasons.map((sn, si) => (
              <div className="pb-glass p-3 mb-2" key={si}>
                <div className="d-flex gap-2 mb-2 align-items-center">
                  <input className="form-control form-control-sm" style={{ maxWidth: 200 }} value={sn.title} onChange={(e) => setSeasons(seasons.map((x, j) => j === si ? { ...x, title: e.target.value } : x))} />
                  <button type="button" className="btn btn-pb-ghost btn-sm" onClick={() => setSeasons(seasons.map((x, j) => j === si ? { ...x, episodes: [...x.episodes, { number: x.episodes.length + 1, title: `Episode ${x.episodes.length + 1}`, description: '', durationMin: 25, playbackUrl: '' }] } : x))}>
                    <i className="bi bi-plus" /> Episode
                  </button>
                  <div className="flex-fill" />
                  <button type="button" className="btn btn-pb-danger btn-sm" onClick={() => setSeasons(seasons.filter((_, j) => j !== si))}><i className="bi bi-trash" /></button>
                </div>
                {sn.episodes.map((ep, ei) => (
                  <div className="row g-1 mb-1" key={ei}>
                    <div className="col-1"><input className="form-control form-control-sm" value={ep.number} onChange={(e) => setSeasons(seasons.map((x, j) => j === si ? { ...x, episodes: x.episodes.map((y, k) => k === ei ? { ...y, number: Number(e.target.value) } : y) } : x))} /></div>
                    <div className="col-3"><input className="form-control form-control-sm" placeholder="Title" value={ep.title} onChange={(e) => setSeasons(seasons.map((x, j) => j === si ? { ...x, episodes: x.episodes.map((y, k) => k === ei ? { ...y, title: e.target.value } : y) } : x))} /></div>
                    <div className="col-3"><input className="form-control form-control-sm" placeholder="Authorized source URL" value={ep.playbackUrl} onChange={(e) => setSeasons(seasons.map((x, j) => j === si ? { ...x, episodes: x.episodes.map((y, k) => k === ei ? { ...y, playbackUrl: e.target.value } : y) } : x))} /></div>
                    <div className="col-1"><input className="form-control form-control-sm" value={ep.durationMin} onChange={(e) => setSeasons(seasons.map((x, j) => j === si ? { ...x, episodes: x.episodes.map((y, k) => k === ei ? { ...y, durationMin: Number(e.target.value) } : y) } : x))} /></div>
                    <div className="col-1"><button type="button" className="btn btn-pb-danger btn-sm w-100" onClick={() => setSeasons(seasons.map((x, j) => j === si ? { ...x, episodes: x.episodes.filter((_, k) => k !== ei) } : x))}><i className="bi bi-x" /></button></div>
                  </div>
                ))}
              </div>
            ))}
            <button type="button" className="btn btn-pb-ghost btn-sm mb-3" onClick={() => setSeasons([...seasons, { number: seasons.length + 1, title: `Season ${seasons.length + 1}`, episodes: [] }])}>
              <i className="bi bi-plus" /> Add season
            </button>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-pb-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-pb">Save series</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Resource configs (generic CRUD) ────────────────────────

export const channelsCfg: ResourceConfig = {
  entity: 'channel',
  title: 'Channels',
  endpoint: '/api/admin/channels',
  searchPlaceholder: 'Name, country, EPG id…',
  thumb: (row) => ({ seed: String(row.logoSeed || row.name), title: String(row.name) }),
  columns: [
    { name: 'name', label: 'Channel', render: (row) => <span className="fw-semibold">{String(row.name)}</span> },
    { name: 'category', label: 'Category', render: (row) => String((row.category as { name?: string })?.name || '—') },
    { name: 'country', label: 'Country' },
    { name: 'language', label: 'Language' },
    { name: 'quality', label: 'Quality', render: (row) => <Badge kind={row.quality === '4K' ? 'gold' : ''}>{String(row.quality)}</Badge> },
    { name: 'isFree', label: 'Free', render: (row) => (row.isFree ? <Badge kind="green">Free</Badge> : <Badge kind="gray">Sub only</Badge>) },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
  ],
  fields: [
    { name: 'name', label: 'Channel name', required: true },
    { name: 'categoryId', label: 'Category ID', required: true, hint: 'Copy an id from Channel Categories module' },
    { name: 'country', label: 'Country' },
    { name: 'language', label: 'Language' },
    { name: 'quality', label: 'Quality', type: 'select', options: ['SD', 'HD', '4K'] },
    { name: 'epgId', label: 'EPG ID', hint: 'Matches channel attr in XMLTV' },
    { name: 'streamType', label: 'Stream type', type: 'select', options: ['HLS', 'DASH', 'MP4'] },
    { name: 'streamUrl', label: 'Authorized stream source URL', span: 12, hint: 'Server-side only — never exposed to the browser catalog API' },
    { name: 'isFree', label: 'Free channel (no subscription needed)', type: 'boolean' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'description', label: 'Description', type: 'textarea', span: 12 },
  ],
};

export const categoriesCfg: ResourceConfig = {
  entity: 'category',
  title: 'Channel Categories',
  endpoint: '/api/admin/categories',
  columns: [
    { name: 'name', label: 'Name', render: (row) => <span className="fw-semibold">{String(row.name)}</span> },
    { name: 'slug', label: 'Slug' },
    { name: 'sortOrder', label: 'Order' },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
  ],
};

export const moviesCfg: ResourceConfig = {
  entity: 'movie',
  title: 'Movies',
  endpoint: '/api/admin/movies',
  searchPlaceholder: 'Title, genre…',
  thumb: (row) => ({ seed: String(row.posterSeed || row.title), title: String(row.title) }),
  columns: [
    { name: 'title', label: 'Title', render: (row) => <span className="fw-semibold">{String(row.title)}</span> },
    { name: 'year', label: 'Year' },
    { name: 'genres', label: 'Genres' },
    { name: 'quality', label: 'Quality', render: (row) => <Badge kind={row.quality === '4K' ? 'gold' : ''}>{String(row.quality)}</Badge> },
    { name: 'durationMin', label: 'Minutes' },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true },
    { name: 'genres', label: 'Genres (comma separated)' },
    { name: 'language', label: 'Language' },
    { name: 'year', label: 'Year', type: 'number' },
    { name: 'durationMin', label: 'Duration (minutes)', type: 'number' },
    { name: 'quality', label: 'Quality', type: 'select', options: ['HD', '4K'] },
    { name: 'rating', label: 'Age rating', type: 'select', options: ['PG', '13+', '16+'] },
    { name: 'trailerUrl', label: 'Trailer URL', span: 12 },
    { name: 'playbackUrl', label: 'Authorized playback source', span: 12 },
    { name: 'featured', label: 'Featured', type: 'boolean' },
    { name: 'trending', label: 'Trending rank', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: ['PUBLISHED', 'DRAFT'] },
    { name: 'description', label: 'Description', type: 'textarea', span: 12 },
  ],
};

export const sportsCfg: ResourceConfig = {
  entity: 'event',
  title: 'Sports Events',
  endpoint: '/api/admin/sports',
  columns: [
    { name: 'title', label: 'Event', render: (row) => <span className="fw-semibold">{String(row.title)}</span> },
    { name: 'category', label: 'Category' },
    { name: 'startsAt', label: 'Starts', render: (row) => fmtDateTime(String(row.startsAt)) },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
  ],
  fields: [
    { name: 'title', label: 'Event title', required: true, span: 12 },
    { name: 'category', label: 'Category', type: 'select', options: ['Football', 'Cricket', 'Tennis', 'Basketball', 'Motorsports', 'Combat Sports', 'Other'] },
    { name: 'homeTeam', label: 'Home side' },
    { name: 'awayTeam', label: 'Away side' },
    { name: 'startsAt', label: 'Starts at', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['UPCOMING', 'LIVE', 'FINISHED'] },
    { name: 'channelId', label: 'Channel ID', hint: 'Broadcast channel for this event' },
  ],
};

export const plansCfg: ResourceConfig = {
  entity: 'plan',
  title: 'Packages / Plans',
  endpoint: '/api/admin/plans',
  columns: [
    { name: 'name', label: 'Plan', render: (row) => <span className="fw-semibold">{String(row.name)}</span> },
    { name: 'price', label: 'Price', render: (row: Record<string, unknown>) => moneyRender('USD')(row.price) },
    { name: 'billingPeriod', label: 'Billing' },
    { name: 'deviceLimit', label: 'Devices' },
    { name: 'quality', label: 'Quality', render: (row) => <Badge kind={row.quality === '4K' ? 'gold' : ''}>{String(row.quality)}</Badge> },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
  ],
  fields: [
    { name: 'name', label: 'Plan name', required: true },
    { name: 'price', label: 'Price (USD)', type: 'number', required: true },
    { name: 'billingPeriod', label: 'Billing period', type: 'select', options: ['MONTHLY', 'QUARTERLY', 'YEARLY'] },
    { name: 'deviceLimit', label: 'Device limit', type: 'number' },
    { name: 'quality', label: 'Quality', type: 'select', options: ['HD', 'FULL HD', '4K'] },
    { name: 'trialDays', label: 'Trial days', type: 'number' },
    { name: 'autoRenewal', label: 'Auto-renewal', type: 'boolean' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'features', label: 'Features (JSON array)', type: 'json', span: 12, hint: '["1 device","HD streaming"]' },
    { name: 'description', label: 'Description', type: 'textarea', span: 12 },
  ],
};

export const couponsCfg: ResourceConfig = {
  entity: 'coupon',
  title: 'Coupons',
  endpoint: '/api/admin/coupons',
  columns: [
    { name: 'code', label: 'Code', render: (row) => <Badge kind="gold">{String(row.code)}</Badge> },
    { name: 'type', label: 'Type' },
    { name: 'value', label: 'Value' },
    { name: 'usedCount', label: 'Used' },
    { name: 'maxUses', label: 'Max uses' },
    { name: 'expiresAt', label: 'Expires', render: (row) => (row.expiresAt ? fmtDate(String(row.expiresAt)) : 'Never') },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
  ],
  fields: [
    { name: 'code', label: 'Code', required: true },
    { name: 'type', label: 'Type', type: 'select', options: ['PERCENT', 'FIXED'] },
    { name: 'value', label: 'Value', type: 'number', required: true },
    { name: 'maxUses', label: 'Max uses (0 = unlimited)', type: 'number' },
    { name: 'perCustomerLimit', label: 'Per-customer limit', type: 'number' },
    { name: 'minAmount', label: 'Minimum order amount', type: 'number' },
    { name: 'planId', label: 'Restrict to plan ID', hint: 'Empty = all plans' },
    { name: 'expiresAt', label: 'Expires at', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
  ],
};

export const providersCfg: ResourceConfig = {
  entity: 'provider',
  title: 'Content Providers',
  endpoint: '/api/admin/providers',
  columns: [
    { name: 'name', label: 'Provider', render: (row) => <span className="fw-semibold">{String(row.name)}</span> },
    { name: 'type', label: 'Type' },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
    { name: 'notes', label: 'Notes' },
  ],
  fields: [
    { name: 'name', label: 'Provider name', required: true },
    { name: 'type', label: 'Type', type: 'select', options: ['IPTV', 'EPG', 'VOD'] },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
    { name: 'notes', label: 'Notes', type: 'textarea', span: 12 },
  ],
};

export const sourcesCfg: ResourceConfig = {
  entity: 'source',
  title: 'Streaming Sources',
  endpoint: '/api/admin/sources',
  columns: [
    { name: 'label', label: 'Source', render: (row) => <span className="fw-semibold">{String(row.label)}</span> },
    { name: 'protocol', label: 'Protocol' },
    { name: 'baseUrl', label: 'Base URL' },
    { name: 'credentialsRef', label: 'Credentials ref', render: (row) => <span className="font-monospace" style={{ fontSize: 12 }}>{String(row.credentialsRef || '—')}</span> },
    { name: 'status', label: 'Status', render: (row: Record<string, unknown>) => statusRender(row.status) },
  ],
  fields: [
    { name: 'label', label: 'Label', required: true },
    { name: 'providerId', label: 'Provider ID' },
    { name: 'protocol', label: 'Protocol', type: 'select', options: ['HLS', 'DASH', 'RTMP'] },
    { name: 'baseUrl', label: 'Base URL', span: 12 },
    { name: 'credentialsRef', label: 'Credentials reference (ENV VAR NAME)', span: 12, hint: 'Store the actual secret in environment variables — never here' },
    { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
  ],
};
