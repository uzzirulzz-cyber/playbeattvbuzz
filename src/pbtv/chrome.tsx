'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Link, navigate, useHashRoute } from './router';
import { useApp } from './store';

// ─── Public navigation ──────────────────────────────────────

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Live TV', to: '/live-tv' },
  { label: 'Movies', to: '/movies' },
  { label: 'Series', to: '/series' },
  { label: 'Sports', to: '/sports' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Devices', to: '/devices' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="d-flex align-items-center gap-2" ariaLabel="PLAYBEATTV home">
      <span
        className="d-grid place-items-center"
        style={{
          width: small ? 30 : 36, height: small ? 30 : 36, borderRadius: 11,
          background: 'linear-gradient(135deg, var(--pb-blue), #1a5fc0)',
          boxShadow: '0 4px 18px rgba(46,144,250,.45)',
          display: 'grid', placeItems: 'center',
        }}
      >
        <i className="bi bi-play-fill" style={{ fontSize: small ? 17 : 21, color: '#fff' }} />
      </span>
      <span className="fw-bold" style={{ letterSpacing: '0.04em', fontSize: small ? 15 : 17 }}>
        PLAYBEAT<span style={{ color: 'var(--pb-blue-soft)' }}>TV</span>
      </span>
    </Link>
  );
}

export function PublicNav() {
  const { path } = useHashRoute();
  const { session, isAdmin, logout } = useApp();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [path]);

  return (
    <header className="pb-nav">
      <div className="pb-container d-flex align-items-center gap-2 py-2">
        <Logo />
        <nav className="d-none d-xl-flex align-items-center ms-3" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`pb-nav-link ${path === n.to ? 'active' : ''}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex-fill" />
        <SearchButton />
        {session?.user ? (
          <div className="d-none d-md-flex align-items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="btn btn-pb-ghost btn-sm">
                <i className="bi bi-shield-lock me-1" /> Admin
              </Link>
            )}
            <Link to="/account" className="btn btn-pb-ghost btn-sm">
              <i className="bi bi-person-circle me-1" /> Account
            </Link>
            <button className="btn btn-pb-ghost btn-sm" onClick={() => logout().then(() => navigate('/'))}>
              <i className="bi bi-box-arrow-right me-1" /> Logout
            </button>
          </div>
        ) : (
          <div className="d-none d-md-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-pb-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-pb btn-sm">Sign Up</Link>
          </div>
        )}
        <button className="btn btn-pb-ghost btn-sm d-xl-none" onClick={() => setDrawer((v) => !v)} aria-label="Menu" aria-expanded={drawer}>
          <i className={`bi ${drawer ? 'bi-x-lg' : 'bi-list'}`} />
        </button>
      </div>
      {drawer && (
        <div className="pb-container pb-3 d-xl-none">
          <div className="pb-glass p-3 d-grid gap-1">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={`pb-nav-link ${path === n.to ? 'active' : ''}`}>{n.label}</Link>
            ))}
            <hr className="my-2" style={{ borderColor: 'var(--pb-line)' }} />
            {session?.user ? (
              <>
                <Link to="/account" className="pb-nav-link"><i className="bi bi-person me-2" />My Account</Link>
                {isAdmin && <Link to="/admin" className="pb-nav-link"><i className="bi bi-shield-lock me-2" />Admin Panel</Link>}
                <button className="pb-nav-link btn text-start" onClick={() => logout().then(() => navigate('/'))}>
                  <i className="bi bi-box-arrow-right me-2" />Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="pb-nav-link">Login</Link>
                <Link to="/register" className="pb-nav-link">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  if (!open) {
    return (
      <button className="btn btn-pb-ghost btn-sm" onClick={() => setOpen(true)} aria-label="Search">
        <i className="bi bi-search" />
      </button>
    );
  }
  return (
    <form
      className="d-flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        navigate(`/live-tv?q=${encodeURIComponent(q)}`);
      }}
      role="search"
    >
      <input
        autoFocus
        className="form-control form-control-sm"
        placeholder="Search channels… (⌘K)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: 180 }}
      />
      <button className="btn btn-pb btn-sm" type="submit"><i className="bi bi-search" /></button>
    </form>
  );
}

// ─── Footer ─────────────────────────────────────────────────

type FooterCms = { about: string; columns: { title: string; links: { label: string; href: string }[] }[] };

export function Footer() {
  const [cms, setCms] = useState<FooterCms | null>(null);
  const [contact, setContact] = useState<{ email: string; whatsapp: string; hours: string } | null>(null);
  useEffect(() => {
    fetch('/api/cms')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setCms(j.data.footer);
          setContact(j.data.site?.contact ?? null);
        }
      })
      .catch(() => null);
  }, []);
  return (
    <footer className="pb-footer">
      <div className="pb-container">
        <div className="row g-4">
          <div className="col-lg-4">
            <Logo small />
            <p className="pb-muted mt-3 mb-2" style={{ fontSize: 14, maxWidth: 340 }}>{cms?.about || 'PLAYBEATTV — Your Gateway to Premium Digital Entertainment.'}</p>
            {contact && (
              <p className="pb-muted mb-0" style={{ fontSize: 13 }}>
                <i className="bi bi-envelope me-2" />{contact.email}
                <span className="mx-2">·</span>
                <i className="bi bi-clock me-1" />{contact.hours}
              </p>
            )}
          </div>
          {(cms?.columns || []).map((col) => (
            <div className="col-6 col-lg-2" key={col.title}>
              <h6 className="text-uppercase pb-muted" style={{ fontSize: 11, letterSpacing: '0.14em' }}>{col.title}</h6>
              <ul className="list-unstyled d-grid gap-2 mb-0">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href.replace(/^#/, '')} className="pb-muted" style={{ fontSize: 14 }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-lg-2">
            <h6 className="text-uppercase pb-muted" style={{ fontSize: 11, letterSpacing: '0.14em' }}>Legal</h6>
            <p className="pb-muted mb-0" style={{ fontSize: 12 }}>
              Only authorized/licensed streams are distributed. Channel & title counts shown as marketing placeholders.
            </p>
          </div>
        </div>
        <hr style={{ borderColor: 'var(--pb-line)' }} className="mt-4" />
        <div className="d-flex flex-wrap justify-content-between gap-2">
          <span className="pb-muted" style={{ fontSize: 13 }}>© 2026 PLAYBEATTV · playbeattv.buzz</span>
          <span className="pb-muted" style={{ fontSize: 12, letterSpacing: '0.1em' }}>PREMIUM ENTERTAINMENT. ONE POWERFUL PLATFORM.</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Admin shell ────────────────────────────────────────────

export const ADMIN_MODULES: { group: string; items: { key: string; label: string; icon: string }[] }[] = [
  {
    group: 'Overview',
    items: [
      { key: '', label: 'Dashboard', icon: 'bi-speedometer2' },
      { key: 'analytics', label: 'Analytics', icon: 'bi-graph-up-arrow' },
      { key: 'website-builder', label: 'Website Builder', icon: 'bi-layout-wtf' },
    ],
  },
  {
    group: 'Customers',
    items: [
      { key: 'customers', label: 'Customers', icon: 'bi-people' },
      { key: 'subscriptions', label: 'Subscriptions', icon: 'bi-arrow-repeat' },
      { key: 'orders', label: 'Orders', icon: 'bi-receipt' },
      { key: 'devices', label: 'Devices', icon: 'bi-tv' },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { key: 'channels', label: 'Channels', icon: 'bi-broadcast' },
      { key: 'channel-categories', label: 'Channel Categories', icon: 'bi-collection-play' },
      { key: 'epg', label: 'EPG Management', icon: 'bi-calendar3' },
      { key: 'movies', label: 'Movies', icon: 'bi-film' },
      { key: 'series', label: 'Series', icon: 'bi-stack' },
      { key: 'sports', label: 'Sports', icon: 'bi-trophy' },
    ],
  },
  {
    group: 'Commerce',
    items: [
      { key: 'plans', label: 'Packages / Plans', icon: 'bi-box-seam' },
      { key: 'coupons', label: 'Coupons', icon: 'bi-ticket-perforated' },
      { key: 'payments', label: 'Payments', icon: 'bi-credit-card' },
      { key: 'invoices', label: 'Invoices', icon: 'bi-file-earmark-text' },
    ],
  },
  {
    group: 'Support & Messaging',
    items: [
      { key: 'tickets', label: 'Support Tickets', icon: 'bi-life-preserver' },
      { key: 'notifications', label: 'Notifications', icon: 'bi-bell' },
      { key: 'email-templates', label: 'Email Templates', icon: 'bi-envelope-paper' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { key: 'content-providers', label: 'Content Providers', icon: 'bi-diagram-3' },
      { key: 'streaming-sources', label: 'Streaming Sources', icon: 'bi-hdd-network' },
      { key: 'api-integrations', label: 'API Integrations', icon: 'bi-plug' },
      { key: 'iptv-lines', label: 'IPTV Lines', icon: 'bi-hdmi' },
      { key: 'users-roles', label: 'Users & Roles', icon: 'bi-person-badge' },
      { key: 'security', label: 'Security', icon: 'bi-shield-check' },
      { key: 'audit-logs', label: 'Audit Logs', icon: 'bi-journal-text' },
      { key: 'settings', label: 'Settings', icon: 'bi-gear' },
    ],
  },
];

export function AdminShell({ active, title, actions, children }: { active: string; title: string; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { session, logout } = useApp();
  useEffect(() => setOpen(false), [active]);
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <aside className={`pb-side ${open ? 'open' : ''}`} aria-label="Admin sidebar">
        <div className="mb-2 px-2"><Logo small /></div>
        <div className="pb-eyebrow px-2 mb-2" style={{ fontSize: 10 }}>Admin Console</div>
        {ADMIN_MODULES.map((g) => (
          <div key={g.group}>
            <div className="pb-side-group">{g.group}</div>
            {g.items.map((it) => (
              <Link key={it.key} to={`/admin/${it.key}`.replace('/admin/', '/admin')} className={`pb-side-link ${active === it.key ? 'active' : ''}`}>
                <i className={`bi ${it.icon}`} />
                {it.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="mt-auto pt-3 px-2">
          <div className="pb-muted" style={{ fontSize: 12 }}>{session?.user?.email}</div>
          <div className="d-flex gap-2 mt-2">
            <Link to="/" className="btn btn-pb-ghost btn-sm w-100"><i className="bi bi-house me-1" />Site</Link>
            <button className="btn btn-pb-ghost btn-sm w-100" onClick={() => logout().then(() => navigate('/login'))}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="pb-modal-backdrop d-lg-none" onClick={() => setOpen(false)} />}
      <div className="flex-fill" style={{ minWidth: 0 }}>
        <div className="pb-container py-4">
          <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-pb-ghost btn-sm d-lg-none" onClick={() => setOpen(true)} aria-label="Toggle sidebar">
                <i className="bi bi-list" />
              </button>
              <h1 className="fw-bold m-0" style={{ fontSize: 24 }}>{title}</h1>
            </div>
            <div className="d-flex gap-2">{actions}</div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
