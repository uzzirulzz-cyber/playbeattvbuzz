'use client';

import { useCallback, useEffect, useState } from 'react';
import { del as apiDelete, get, patch, post } from '../api';
import { useApp } from '../store';
import { Badge, Empty, Field, Modal, Pagination, Spinner, StatusBadge, ThumbArt, fmtDate, fmtDateTime, fmtMoney } from '../ui';

// ─── Config-driven generic admin resource ───────────────────

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'date' | 'json';
  options?: string[];
  required?: boolean;
  hint?: string;
  /** hide in form (e.g. server-generated) */
  noForm?: boolean;
  render?: (row: Record<string, unknown>) => React.ReactNode;
  span?: 6 | 12;
};

export type ResourceConfig = {
  entity: string;
  title: string;
  endpoint: string;
  fields: FieldDef[];
  columns: FieldDef[];
  searchPlaceholder?: string;
  thumb?: (row: Record<string, unknown>) => { seed: string; title: string } | null;
};

export function ResourceView({ cfg }: { cfg: ResourceConfig }) {
  const { toast } = useApp();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const size = 20;

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) qs.set('q', q);
    get<{ rows: Record<string, unknown>[]; total: number }>(`${cfg.endpoint}?${qs}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); setErr(''); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [cfg.endpoint, page, q]);

  useEffect(load, [load]);

  const save = async (form: Record<string, unknown>) => {
    try {
      if (editing?.id) await patch(`${cfg.endpoint}/${editing.id}`, form);
      else await post(cfg.endpoint, form);
      toast('ok', `${cfg.entity} ${editing?.id ? 'updated' : 'created'}`);
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  const remove = async (row: Record<string, unknown>) => {
    try {
      await apiDelete(`${cfg.endpoint}/${row.id}`);
      toast('ok', `${cfg.entity} deleted`);
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    }
  };

  return (
    <>
      <div className="pb-glass p-3 mb-3 d-flex gap-2 flex-wrap align-items-center">
        <input className="form-control" style={{ maxWidth: 260 }} placeholder={cfg.searchPlaceholder || 'Search…'} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <div className="flex-fill" />
        <span className="pb-badge">{total} records</span>
        <button className="btn btn-pb btn-sm" onClick={() => { setCreating(true); setEditing({}); }}>
          <i className="bi bi-plus-lg me-1" /> New {cfg.entity}
        </button>
      </div>
      {loading && <Spinner />}
      {err && <Empty icon="bi-exclamation-triangle" text={err} />}
      {!loading && !err && rows.length === 0 && <Empty icon="bi-inbox" text={`No ${cfg.entity} records yet.`} />}
      {!loading && !err && rows.length > 0 && (
        <>
          <div className="pb-glass table-responsive">
            <table className="pb-table">
              <thead>
                <tr>
                  {cfg.columns.map((c) => <th key={c.name}>{c.label}</th>)}
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    {cfg.columns.map((c) => (
                      <td key={c.name}>{c.render ? c.render(row) : renderCell(row[c.name])}</td>
                    ))}
                    <td className="text-end text-nowrap">
                      <button className="btn btn-pb-ghost btn-sm me-1" onClick={() => { setEditing(row); setCreating(false); }} aria-label="Edit">
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-pb-danger btn-sm" onClick={() => remove(row)} aria-label="Delete">
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} size={size} total={total} onPage={setPage} />
        </>
      )}
      {(editing || creating) && (
        <ResourceForm
          cfg={cfg}
          row={creating ? {} : editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={save}
        />
      )}
    </>
  );
}

function renderCell(v: unknown): React.ReactNode {
  if (typeof v === 'boolean') return <Badge kind={v ? 'green' : 'gray'}>{v ? 'Yes' : 'No'}</Badge>;
  if (v === null || v === undefined || v === '') return <span className="pb-muted">—</span>;
  const s = String(v);
  if (s.length > 60) return <span title={s}>{s.slice(0, 60)}…</span>;
  return s;
}

export function ResourceForm({ cfg, row, onClose, onSave }: {
  cfg: ResourceConfig;
  row: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (form: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const init: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      if (f.noForm) continue;
      const v = row?.[f.name];
      if (f.type === 'json') init[f.name] = typeof v === 'string' && v ? v : v === undefined ? '' : JSON.stringify(v, null, 2);
      else if (f.type === 'date') init[f.name] = v ? String(v).slice(0, 16) : '';
      else init[f.name] = v ?? '';
    }
    setForm(init);
  }, [cfg.fields, row]);

  return (
    <Modal open onClose={onClose} title={`${row?.id ? 'Edit' : 'New'} ${cfg.entity}`} wide>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(form);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="row">
          {cfg.fields.filter((f) => !f.noForm).map((f) => (
            <div className={`col-md-${f.span || 6}`} key={f.name}>
              <Field label={f.label + (f.required ? ' *' : '')} hint={f.hint}>
                {f.type === 'textarea' ? (
                  <textarea className="form-control" rows={3} required={f.required} value={String(form[f.name] ?? '')} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select className="form-select" value={String(form[f.name] ?? '')} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value="">—</option>
                    {f.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === 'boolean' ? (
                  <input type="checkbox" className="form-check-input" style={{ width: 20, height: 20 }} checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />
                ) : f.type === 'json' ? (
                  <textarea className="form-control font-monospace" rows={4} value={String(form[f.name] ?? '')} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                ) : (
                  <input
                    className="form-control"
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'datetime-local' : 'text'}
                    step="any"
                    required={f.required}
                    value={String(form[f.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
        <div className="d-flex justify-content-end gap-2 mt-2">
          <button type="button" className="btn btn-pb-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-pb" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Channel-specific: category select needs remote options ──

export function useCategoryOptions() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    get<{ rows: { id: string; name: string }[] }>('/api/admin/categories?size=50').then((r) => setCats(r.rows)).catch(() => null);
  }, []);
  return cats;
}

// shared status renderer
export const statusRender = (s: unknown) => <StatusBadge status={String(s)} />;
export const moneyRender = (cur: string) => (v: unknown) => fmtMoney(Number(v || 0), cur);
export const dateRender = (v: unknown) => fmtDate(String(v || ''));
export const thumbRender = (seedKey: string, titleKey: string) => (row: Record<string, unknown>) => (
  <span style={{ display: 'block', width: 92, borderRadius: 8, overflow: 'hidden' }}>
    <ThumbArt seed={String(row[seedKey] || 'x')} title={String(row[titleKey] || '')} />
  </span>
);
