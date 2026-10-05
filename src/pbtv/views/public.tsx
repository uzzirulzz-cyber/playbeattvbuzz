'use client';

import { useEffect, useState } from 'react';
import { get, post } from '../api';
import { Link, navigate } from '../router';
import { useApp } from '../store';
import { Badge, Empty, ErrorState, Field, SectionTitle, Spinner, fmtDate } from '../ui';

// ─── HOME ───────────────────────────────────────────────────

type SiteContent = {
  brand: string;
  tagline: string;
  domain: string;
  hero: { title: string; subtitle: string; text: string };
  stats: { value: string; label: string; note: string }[];
  contact: { email: string; whatsapp: string; hours: string };
  legalNote: string;
};

const DEFAULT_SITE: SiteContent = {
  brand: 'PLAYBEATTV',
  tagline: 'Your Gateway to Premium Digital Entertainment',
  domain: 'playbeattv.buzz',
  hero: {
    title: 'PLAYBEATTV',
    subtitle: 'Premium Entertainment. One Powerful Platform.',
    text: 'Access your authorized live television, sports, entertainment, news, movies and other digital entertainment services from one modern platform.',
  },
  stats: [
    { value: '15,000+', label: 'Live Channels*', note: 'Configurable marketing placeholder' },
    { value: '20,000+', label: 'Movies & Series*', note: 'Configurable marketing placeholder' },
    { value: 'HD / 4K*', label: 'Streaming Quality Ready', note: 'Where the licensed source provides it' },
    { value: 'Multi-Device', label: 'TV · Mobile · Web · Tablet', note: 'Watch anywhere on your devices' },
  ],
  contact: { email: 'support@playbeattv.buzz', whatsapp: '+1 555 0100', hours: '24/7 support desk' },
  legalNote: '* Channel, movie and series counts are configurable marketing placeholders, not live inventory counts.',
};

export function Home() {
  const [site, setSite] = useState<SiteContent | null>(null);
  const [plans, setPlans] = useState<{ id: string; name: string; price: number; billingPeriod: string }[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string; quality: string; category: string; logoSeed: string }[]>([]);
  const [banner, setBanner] = useState<{ text: string; href: string } | null>(null);
  const [dbDown, setDbDown] = useState(false);

  useEffect(() => {
    get<{ 'site.content': SiteContent; 'cms.banners': { text: string; href: string; active: boolean }[] }>('/api/cms')
      .then((cms) => {
        setSite(cms['site.content']);
        const b = (cms['cms.banners'] || []).find((x) => x.active);
        if (b) setBanner(b);
      })
      .catch(() => {
        // graceful degraded mode (production: DATABASE_URL not yet connected)
        setSite(DEFAULT_SITE);
        setDbDown(true);
      });
    get<{ rows: typeof plans }>('/api/plans').then((r) => setPlans(r.rows.filter((p) => p.price > 0).slice(0, 3))).catch(() => null);
    get<{ rows: typeof channels }>('/api/channels?size=12').then((r) => setChannels(r.rows)).catch(() => null);
  }, []);

  if (!site) return <Spinner />;
  return (
    <>
      {dbDown && (
        <div className="pb-container mt-3">
          <div className="pb-glass p-3" style={{ borderColor: 'rgba(245,179,1,.4)', fontSize: 13.5 }}>
            <i className="bi bi-database-gear me-2" style={{ color: 'var(--pb-gold)' }} />
            <b>Setup mode:</b> the platform is live but its database isn't connected yet. Add a <code>DATABASE_URL</code> environment variable on the hosting provider (any PostgreSQL, e.g. Neon/Supabase), run <code>prisma db push</code> + <code>bun scripts/seed.ts</code>, and the full catalog, accounts, billing and admin console activate automatically.
          </div>
        </div>
      )}
      {banner && (
        <div className="pb-container mt-3">
          <Link to={banner.href.replace(/^#/, '')} className="pb-glass d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13.5 }}>
            <i className="bi bi-megaphone" style={{ color: 'var(--pb-gold)' }} />
            {banner.text}
          </Link>
        </div>
      )}
      <section className="pb-container">
        <div className="pb-hero row g-4 align-items-center">
          <div className="col-lg-6">
            <div className="pb-eyebrow mb-2">{site.brand}</div>
            <h1 className="pb-display" style={{ fontSize: 'clamp(30px, 4.6vw, 54px)' }}>
              {site.hero.subtitle}
            </h1>
            <p className="pb-muted mt-3 mb-4" style={{ fontSize: 15.5, maxWidth: 520 }}>{site.hero.text}</p>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/pricing" className="btn btn-pb-gold btn-lg">Explore Plans</Link>
              <Link to="/live-tv" className="btn btn-pb-ghost btn-lg">View Channels</Link>
              <Link to="/register" className="btn btn-pb btn-lg">Get Started</Link>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="pb-hero-screen p-3">
              <div className="row g-2">
                {channels.slice(0, 6).map((c) => (
                  <div className="col-4" key={c.id}>
                    <div
                      className="d-grid position-relative"
                      style={{
                        aspectRatio: '16/10', borderRadius: 10, placeItems: 'center',
                        background: `linear-gradient(${120 + c.name.length * 13}deg, hsl(${210 + c.name.length * 17} 60% 24%), hsl(${230 + c.name.length * 11} 55% 12%))`,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '0 4px' }}>{c.name}</span>
                      <span className="position-absolute" style={{ top: 6, right: 8, fontSize: 9, color: 'var(--pb-gold)', fontWeight: 700 }}>{c.quality}</span>
                    </div>
                  </div>
                ))}
                <div className="col-12 d-flex align-items-center justify-content-between px-2 pt-1">
                  <span className="pb-muted" style={{ fontSize: 11 }}><span className="pb-live-dot me-2" />LIVE — streaming preview</span>
                  <span className="pb-muted" style={{ fontSize: 11 }}>EPG synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-container mt-4">
        <div className="row g-3">
          {site.stats.map((s) => (
            <div className="col-6 col-lg-3" key={s.label}>
              <div className="pb-glass pb-kpi h-100" title={s.note}>
                <i className={`bi ${s.value.includes('Channel') ? 'bi-broadcast' : s.value.includes('4K') || s.value.includes('HD') ? 'bi-badge-4k' : 'bi-collection-play'}`} />
                <div className="pb-kpi-value mt-2">{s.value}</div>
                <div className="pb-kpi-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="pb-muted mt-2 mb-0" style={{ fontSize: 12 }}>
          <i className="bi bi-info-circle me-1" />{site.legalNote}
        </p>
      </section>

      <section className="pb-container">
        <SectionTitle eyebrow="Pricing" title="Choose your plan" right={<Link to="/pricing" className="btn btn-pb-ghost btn-sm">All plans</Link>} />
        <div className="row g-3">
          {plans.map((p) => (
            <div className="col-md-4" key={p.id}>
              <div className="pb-glass pb-price-card h-100">
                <h5 className="fw-bold">{p.name}</h5>
                <div className="pb-price-value">
                  ${p.price.toFixed(2)}<span className="pb-muted" style={{ fontSize: 14 }}>/{p.billingPeriod.toLowerCase().replace('ly', '')}</span>
                </div>
                <Link to={`/checkout?plan=${p.id}`} className="btn btn-pb w-100 mt-3">Buy Now</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ─── PRICING ────────────────────────────────────────────────

type Plan = {
  id: string; name: string; description: string; price: number; currency: string;
  billingPeriod: string; deviceLimit: number; quality: string; features: string[];
  trialDays: number; autoRenewal: boolean;
};

export function Pricing() {
  const { session, setCartPlanId, toast } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    get<{ rows: Plan[] }>('/api/plans')
      .then((r) => setPlans(r.rows))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const buy = (planId: string) => {
    setCartPlanId(planId);
    if (!session?.user) {
      toast('info', 'Sign in (or create an account) to continue to checkout.');
      navigate('/login?next=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <>
      <SectionTitle eyebrow="One membership · Everything included" title="All-Access — $12/month" />
      <p className="pb-muted">
        No tiers, no upsells: one membership unlocks <b>every channel, movie, series and the 18+ section</b>.
        Pay with <i className="bi bi-currency-bitcoin" /> <b>Bitcoin</b> — your subscription is activated right after payment verification.
      </p>
      {loading && <Spinner />}
      {err && <ErrorState message={err} onRetry={load} />}
      {!loading && !err && (
        <div className="row g-3">
          {plans.map((p) => {
            const featured = plans.length === 1 || p.price === Math.max(...plans.map((x) => x.price));
            return (
              <div className={plans.length === 1 ? 'col-md-8 col-lg-6 mx-auto' : 'col-md-6 col-xl-4'} key={p.id}>
                <div className={`pb-glass pb-price-card h-100 ${featured ? 'featured' : ''}`}>
                  {featured && <span className="pb-badge gold position-absolute" style={{ top: 16, right: 16 }}><i className="bi bi-star-fill" /> Everything included</span>}
                  <h5 className="fw-bold mb-1">{p.name}</h5>
                  <div className="pb-muted mb-3" style={{ fontSize: 13.5 }}>{p.description}</div>
                  <div className="pb-price-value">
                    {p.price === 0 ? 'Free' : `$${p.price.toFixed(2)}`}
                    {p.price > 0 && <span className="pb-muted" style={{ fontSize: 14 }}>/{p.billingPeriod === 'MONTHLY' ? 'mo' : p.billingPeriod === 'QUARTERLY' ? '3 mo' : 'yr'}</span>}
                  </div>
                  <div className="d-flex gap-2 my-3 flex-wrap">
                    <span className="pb-badge"><i className="bi bi-tv" /> {p.deviceLimit} device{p.deviceLimit > 1 ? 's' : ''}</span>
                    <span className="pb-badge gold">{p.quality}</span>
                    <span className="pb-badge"><i className="bi bi-currency-bitcoin" /> Bitcoin accepted</span>
                  </div>
                  <ul className="pb-feature-list">
                    {(p.features || []).map((f) => (
                      <li key={f}><i className="bi bi-check-circle-fill" /> {f}</li>
                    ))}
                    <li><i className="bi bi-shield-check" /> Activated after BTC payment verification</li>
                  </ul>
                  <button className="btn btn-pb-gold w-100 mt-3" onClick={() => buy(p.id)}>
                    Get All-Access — ${p.price.toFixed(0)}/mo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── DEVICES (info page) ────────────────────────────────────

const DEVICE_LIST = [
  { icon: 'bi-tv', name: 'Android TV', note: 'Sideloading not required — open playbeattv.buzz in the TV browser.' },
  { icon: 'bi-display', name: 'Smart TV', note: 'Samsung Tizen, LG webOS, and any modern TV browser.' },
  { icon: 'bi-phone', name: 'Android Phone', note: 'Chrome and Firefox fully supported with adaptive HLS.' },
  { icon: 'bi-apple', name: 'iPhone / iPad', note: 'Native HLS playback via Safari.' },
  { icon: 'bi-laptop', name: 'Windows / macOS', note: 'Full portal + picture-in-picture support.' },
  { icon: 'bi-fire', name: 'Fire TV', note: 'Silk/Firefox browser supported.' },
];

export function DevicesPage() {
  return (
    <>
      <SectionTitle eyebrow="Multi-Device" title="Watch on every screen you own" />
      <p className="pb-muted mb-4">Your plan determines how many devices can stream at once. Manage and remove sessions any time from Account → My Devices.</p>
      <div className="row g-3">
        {DEVICE_LIST.map((d) => (
          <div className="col-md-6 col-lg-4" key={d.name}>
            <div className="pb-glass p-4 h-100">
              <i className={`bi ${d.icon}`} style={{ fontSize: 26, color: 'var(--pb-blue)' }} />
              <h5 className="fw-bold mt-3 mb-1">{d.name}</h5>
              <p className="pb-muted mb-0" style={{ fontSize: 13.5 }}>{d.note}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── FAQ ────────────────────────────────────────────────────

export function Faq() {
  const [items, setItems] = useState<{ q: string; a: string }[]>([]);
  const [open, setOpen] = useState(0);
  useEffect(() => {
    get<{ 'faq.items': { q: string; a: string }[] }>('/api/cms')
      .then((c) => setItems(c['faq.items'] || []))
      .catch(() => null);
  }, []);
  return (
    <>
      <SectionTitle eyebrow="Help Center" title="Frequently asked questions" />
      <div className="d-grid gap-2">
        {items.map((it, i) => (
          <div className="pb-glass p-3" key={i}>
            <button className="btn w-100 text-start p-0 d-flex justify-content-between align-items-center" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span className="fw-semibold">{it.q}</span>
              <i className={`bi ${open === i ? 'bi-dash-lg' : 'bi-plus-lg'} pb-muted`} />
            </button>
            {open === i && <p className="pb-muted mb-0 mt-2" style={{ fontSize: 14 }}>{it.a}</p>}
          </div>
        ))}
        {!items.length && <Empty icon="bi-question-circle" text="FAQ is being updated." />}
      </div>
    </>
  );
}

// ─── CONTACT ────────────────────────────────────────────────

export function Contact() {
  const { toast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await post<{ mode: string; number?: string }>('/api/contact', form);
      setDone(r.mode === 'ticket' ? `Ticket ${r.number} created — check Account → Support Tickets for replies.` : 'Message received — our team will reach out to your email.');
      setForm({ name: '', email: '', subject: '', message: '' });
      toast('ok', 'Message sent');
    } catch (err) {
      toast('err', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SectionTitle eyebrow="Contact" title="Talk to the 24/7 desk" />
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="pb-glass p-4 h-100">
            <h5 className="fw-bold">Support channels</h5>
            <p className="pb-muted" style={{ fontSize: 14 }}><i className="bi bi-envelope me-2" />support@playbeattv.buzz</p>
            <p className="pb-muted" style={{ fontSize: 14 }}><i className="bi bi-whatsapp me-2" />+1 555 0100 (WhatsApp)</p>
            <p className="pb-muted" style={{ fontSize: 14 }}><i className="bi bi-clock me-2" />Open 24/7 — average first reply under 30 minutes.</p>
            <hr style={{ borderColor: 'var(--pb-line)' }} />
            <p className="pb-muted mb-0" style={{ fontSize: 13 }}>
              Existing customers get faster handling by opening a ticket from <Link to="/account/tickets" className="pb-nav-link p-0">Account → Support Tickets</Link>.
            </p>
          </div>
        </div>
        <div className="col-lg-7">
          <form className="pb-glass p-4" onSubmit={submit}>
            {done && <div className="alert alert-success py-2" style={{ background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.3)', color: '#34d399' }}>{done}</div>}
            <div className="row">
              <div className="col-md-6"><Field label="Your name">
                <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field></div>
              <div className="col-md-6"><Field label="Email">
                <input type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field></div>
            </div>
            <Field label="Subject">
              <input className="form-control" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Message">
              <textarea className="form-control" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </Field>
            <button className="btn btn-pb" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── LOGIN / REGISTER ───────────────────────────────────────

/** Bot verification challenge (stateless signed SVG captcha). */
export function CaptchaField({ value, onChange, refreshKey }: {
  value: { token: string; answer: string };
  onChange: (v: { token: string; answer: string }) => void;
  refreshKey?: number;
}) {
  const [svg, setSvg] = useState('');
  const load = () => {
    get<{ svg: string; token: string }>('/api/captcha')
      .then((r) => { setSvg(r.svg); onChange({ token: r.token, answer: '' }); })
      .catch(() => null);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [refreshKey]);
  return (
    <Field label="Bot verification — enter the code">
      <div className="d-flex gap-2 align-items-center flex-wrap">
        <div className="bg-white rounded-3 p-1" style={{ lineHeight: 0, flex: '0 0 auto' }}>
          {svg
            ? <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="verification code" width={180} height={60} style={{ display: 'block' }} />
            : <span className="d-inline-block" style={{ width: 180, height: 60 }}><Spinner /></span>}
        </div>
        <button type="button" className="btn btn-pb-ghost btn-sm" onClick={load} title="Get a new code" aria-label="Refresh security code"><i className="bi bi-arrow-clockwise" /></button>
        <input
          className="form-control" required maxLength={6} placeholder="6-character code"
          aria-label="Security code"
          value={value.answer} onChange={(e) => onChange({ ...value, answer: e.target.value.toUpperCase() })}
          style={{ textTransform: 'uppercase', letterSpacing: 3, flex: 1, minWidth: 150 }}
        />
      </div>
    </Field>
  );
}

export function Login({ params }: { params: Record<string, string> }) {
  const { refreshSession, toast } = useApp();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [captcha, setCaptcha] = useState({ token: '', answer: '' });
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await post<{ redirect: string }>('/api/auth/login', { ...form, captchaToken: captcha.token, captchaAnswer: captcha.answer });
      await refreshSession();
      toast('ok', 'Welcome back!');
      navigate(params.next || r.redirect);
    } catch (ex) {
      const msg = (ex as Error).message;
      if (/security code|bot verification/i.test(msg)) setCaptchaKey((k) => k + 1);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row justify-content-center mt-4">
      <div className="col-md-8 col-lg-5">
        <div className="pb-glass p-4 p-md-5">
          <div className="pb-eyebrow mb-2">Welcome back</div>
          <h1 className="pb-display mb-4" style={{ fontSize: 30 }}>Sign in to PLAYBEATTV</h1>
          {err && <div className="alert alert-danger py-2" style={{ background: 'rgba(255,59,72,.1)', borderColor: 'rgba(255,59,72,.3)', color: '#ff8a91' }}>{err}</div>}
          {!forgot ? (
            <form onSubmit={submit}>
              <Field label="Email">
                <input type="email" className="form-control" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Password">
                <input type="password" className="form-control" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="d-flex gap-2 align-items-center pb-muted" style={{ fontSize: 13.5 }}>
                  <input type="checkbox" className="form-check-input m-0" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} /> Remember me
                </label>
                <button type="button" className="btn btn-link p-0" style={{ fontSize: 13.5 }} onClick={() => setForgot(true)}>Forgot password?</button>
              </div>
              <CaptchaField value={captcha} onChange={setCaptcha} refreshKey={captchaKey} />
              <button className="btn btn-pb w-100 mt-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
            </form>
          ) : (
            <ForgotForm onBack={() => setForgot(false)} />
          )}
          <hr style={{ borderColor: 'var(--pb-line)' }} className="my-4" />
          <p className="pb-muted mb-0 text-center" style={{ fontSize: 14 }}>
            New to PLAYBEATTV? <Link to="/register" className="fw-semibold">Create an account</Link>
          </p>
          <div className="pb-glass p-3 mt-4" style={{ fontSize: 12.5 }}>
            <div className="pb-eyebrow mb-2">Demo accounts</div>
            <div className="pb-muted">Customer: customer@playbeattv.buzz / Customer@2026!</div>
            <div className="pb-muted">Admin: admin@playbeattv.buzz / Admin@2026!</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const { toast } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return sent ? (
    <div className="alert alert-info py-3" style={{ background: 'rgba(46,144,250,.1)', borderColor: 'rgba(46,144,250,.3)', color: '#9ecbff' }}>
      If an account exists for <b>{email}</b>, a reset link has been sent (check the email template in Admin → Email Templates). <button className="btn btn-link p-0" onClick={onBack}>Back to sign in</button>
    </div>
  ) : (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        // Rate-limited; never reveals whether the account exists
        await post('/api/auth/forgot', { email }).catch(() => null);
        setSent(true);
        toast('info', 'Reset request processed');
      }}
    >
      <Field label="Account email" hint="We never reveal whether an email is registered.">
        <input type="email" className="form-control" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <button className="btn btn-pb w-100">Send reset link</button>
      <button type="button" className="btn btn-pb-ghost w-100 mt-2" onClick={onBack}>Back to sign in</button>
    </form>
  );
}

export function Register() {
  const { refreshSession, toast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', country: '', address: '', city: '', zip: '', terms: false });
  const [captcha, setCaptcha] = useState({ token: '', answer: '' });
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await post('/api/auth/register', { ...form, captchaToken: captcha.token, captchaAnswer: captcha.answer });
      await refreshSession();
      toast('ok', 'Account created — welcome!');
      navigate('/pricing');
    } catch (ex) {
      const msg = (ex as Error).message;
      if (/security code|bot verification/i.test(msg)) setCaptchaKey((k) => k + 1);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="row justify-content-center mt-4">
      <div className="col-md-10 col-lg-7">
        <div className="pb-glass p-4 p-md-5">
          <div className="pb-eyebrow mb-2">Create account</div>
          <h1 className="pb-display mb-4" style={{ fontSize: 30 }}>Join PLAYBEATTV</h1>
          {err && <div className="alert alert-danger py-2" style={{ background: 'rgba(255,59,72,.1)', borderColor: 'rgba(255,59,72,.3)', color: '#ff8a91' }}>{err}</div>}
          <form onSubmit={submit}>
            <div className="row">
              <div className="col-md-6"><Field label="Full name"><input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Email"><input type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Phone"><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Country"><input className="form-control" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Password" hint="8+ characters, letters and numbers"><input type="password" className="form-control" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field></div>
              <div className="col-md-6"><Field label="Confirm password"><input type="password" className="form-control" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></Field></div>
            </div>
            <label className="d-flex gap-2 align-items-start pb-muted mb-3" style={{ fontSize: 13.5 }}>
              <input type="checkbox" className="form-check-input m-0 mt-1" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
              <span>I accept the Terms of Service and Privacy Policy, and I understand PLAYBEATTV only distributes authorized streams.</span>
            </label>
            <CaptchaField value={captcha} onChange={setCaptcha} refreshKey={captchaKey} />
            <button className="btn btn-pb-gold w-100 mt-3" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          </form>
          <hr style={{ borderColor: 'var(--pb-line)' }} className="my-4" />
          <p className="pb-muted mb-0 text-center" style={{ fontSize: 14 }}>
            Already have an account? <Link to="/login" className="fw-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Generic subscription status helpers reused by account views ──

export function SubStatePill({ expiresAt, status }: { expiresAt: string | Date; status: string }) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400e3);
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <Badge kind={status === 'ACTIVE' ? 'green' : 'gray'}>{status}</Badge>
      {status === 'ACTIVE' && (
        <span className="pb-muted" style={{ fontSize: 13 }}>
          {days <= 3 ? <span className="text-warning"><i className="bi bi-exclamation-triangle me-1" />expires in {days} day{days === 1 ? '' : 's'}</span> : `renews ${fmtDate(expiresAt)}`}
        </span>
      )}
    </div>
  );
}
