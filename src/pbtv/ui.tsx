'use client';

import { useEffect, type ReactNode } from 'react';
import { Link } from './router';

// ─── Basic building blocks on Bootstrap 5 markup ────────────

export function Badge({ kind = '', children }: { kind?: '' | 'gold' | 'green' | 'red' | 'gray'; children: ReactNode }) {
  return <span className={`pb-badge ${kind}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="pb-modal-backdrop" onClick={onClose} />
      <div className={`pb-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: '1px solid var(--pb-line)' }}>
          <h5 className="m-0 fw-bold">{title}</h5>
          <button className="btn btn-pb-ghost btn-sm" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}

export function Spinner() {
  return <div className="pb-spinner" role="status" aria-label="Loading" />;
}

export function Empty({ icon = 'bi-inbox', text, children }: { icon?: string; text: string; children?: ReactNode }) {
  return (
    <div className="pb-empty">
      <i className={`bi ${icon}`} />
      <p className="mb-2">{text}</p>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="pb-empty">
      <i className="bi bi-wifi-off" />
      <p className="mb-2 text-danger">{message}</p>
      {onRetry && (
        <button className="btn btn-pb-ghost btn-sm" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" /> Retry
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { kind: '' | 'gold' | 'green' | 'red' | 'gray'; label: string }> = {
    ACTIVE: { kind: 'green', label: 'Active' },
    PAID: { kind: 'green', label: 'Paid' },
    COMPLETED: { kind: 'green', label: 'Completed' },
    PUBLISHED: { kind: 'green', label: 'Published' },
    LIVE: { kind: 'red', label: 'Live' },
    OPEN: { kind: 'gold', label: 'Open' },
    PENDING: { kind: 'gold', label: 'Pending' },
    IN_PROGRESS: { kind: 'gold', label: 'In Progress' },
    PROCESSING: { kind: 'gold', label: 'Processing' },
    UPCOMING: { kind: '', label: 'Upcoming' },
    EXPIRED: { kind: 'gray', label: 'Expired' },
    CANCELLED: { kind: 'gray', label: 'Cancelled' },
    SUSPENDED: { kind: 'gray', label: 'Suspended' },
    FAILED: { kind: 'red', label: 'Failed' },
    REFUNDED: { kind: 'red', label: 'Refunded' },
    CLOSED: { kind: 'gray', label: 'Closed' },
    RESOLVED: { kind: 'green', label: 'Resolved' },
    REVOKED: { kind: 'red', label: 'Revoked' },
    INACTIVE: { kind: 'gray', label: 'Inactive' },
    DRAFT: { kind: 'gray', label: 'Draft' },
    VOID: { kind: 'gray', label: 'Void' },
    ARCHIVED: { kind: 'gray', label: 'Archived' },
  };
  const cfg = map[status] || { kind: 'gray' as const, label: status };
  return <Badge kind={cfg.kind}>{cfg.label}</Badge>;
}

export function Kpi({ icon, label, value, gold }: { icon: string; label: string; value: ReactNode; gold?: boolean }) {
  return (
    <div className={`pb-glass pb-kpi ${gold ? 'gold' : ''}`}>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="pb-kpi-value">{value}</div>
          <div className="pb-kpi-label mt-1">{label}</div>
        </div>
        <i className={`bi ${icon}`} />
      </div>
    </div>
  );
}

export function Pagination({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return (
    <nav className="d-flex gap-2 justify-content-center align-items-center mt-3" aria-label="Pagination">
      <button className="btn btn-pb-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <i className="bi bi-chevron-left" />
      </button>
      <span className="pb-muted small">
        Page {page} of {pages} · {total} records
      </span>
      <button className="btn btn-pb-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        <i className="bi bi-chevron-right" />
      </button>
    </nav>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="d-block">
        <span className="form-label d-block">{label}</span>
        {children}
      </label>
      {hint && <div className="form-text pb-muted" style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}

/** Deterministic gradient art from a seed — zero copyrighted assets */
export function ThumbArt({ seed, title, tall }: { seed: string; title: string; tall?: boolean }) {
  const [h1, h2, angle] = artFor(seed);
  return (
    <div className="pb-thumb" style={{ aspectRatio: tall ? '2/3' : '16/9' }}>
      <div className="pb-thumb-art" style={{ background: `linear-gradient(${angle}deg, ${h1}, ${h2})` }} />
      <span className={`pb-thumb-title ${tall ? 'fs-6' : ''}`}>{title}</span>
    </div>
  );
}

function artFor(seed: string): [string, string, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 40 + (h % 80)) % 360;
  return [`hsl(${a} 70% ${28 + (h % 14)}%)`, `hsl(${b} 65% ${12 + (h % 10)}%)`, 120 + (h % 100)];
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="d-flex align-items-end justify-content-between mb-3 mt-4 flex-wrap gap-2">
      <div>
        {eyebrow && <div className="pb-eyebrow mb-1">{eyebrow}</div>}
        <h2 className="fw-bold m-0" style={{ fontSize: 'clamp(20px, 2.6vw, 28px)' }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Crumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-3">
      <ol className="breadcrumb m-0" style={{ fontSize: 13 }}>
        {items.map((it, i) => (
          <li key={i} className={`breadcrumb-item ${i === items.length - 1 ? 'active' : ''}`}>
            {it.to ? <Link to={it.to} className="pb-muted">{it.label}</Link> : <span>{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtMoney(v: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v);
}

export function fmtTime(v: string | Date): string {
  return new Date(v).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
