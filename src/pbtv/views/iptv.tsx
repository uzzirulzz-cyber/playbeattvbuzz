'use client';

import { useCallback, useEffect, useState } from 'react';
import { get, post } from '../api';
import { useApp } from '../store';
import { Badge, Empty, Field, Kpi, Spinner, StatusBadge, fmtDate, fmtDateTime } from '../ui';

type LineView = {
  id: string;
  type: string;
  username: string;
  password: string | null;
  plan: number;
  connections: number;
  status: string;
  providerMsg: string;
  expiresAt: string | null;
  links: { m3u: string; epg: string; webplayer: string; portal: string } | null;
};

const PLAN_LABEL: Record<number, string> = { 11: '24h Trial', 1: '1 Month', 2: '3 Months', 3: '6 Months', 4: '12 Months' };

// ─── Customer view ──────────────────────────────────────────

export function AccountIptv() {
  const [data, setData] = useState<{ lines: LineView[]; subscriptionLines: { subscriptionId: string; plan: string; status: string; lineStatus: string; lineMsg: string; username: string; password: string; expiresAt: string; links: LineView['links'] | null }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    get<typeof data>('/api/lines').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const anyLine = data.lines.length > 0 || data.subscriptionLines.some((s) => s.lineStatus === 'PROVISIONED');
  if (!anyLine) {
    return (
      <Empty icon="bi-hdmi" text="No IPTV line on your account yet — it is generated automatically when you subscribe to a plan.">
      </Empty>
    );
  }

  const LineCard = ({ username, password, planLabel, connections, expiresAt, links, status }: {
    username: string; password: string | null; planLabel: string; connections?: number; expiresAt: string | null; links: LineView['links']; status: string;
  }) => (
    <div className="pb-glass p-4 mb-3">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <div className="pb-eyebrow mb-1">Your IPTV line</div>
          <div className="fw-bold" style={{ fontSize: 18 }}>{planLabel}</div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Badge kind="gray">{connections ? `${connections} connection${connections > 1 ? 's' : ''}` : '1 connection'}</Badge>
          {expiresAt && <Badge kind={new Date(expiresAt) > new Date() ? 'green' : 'gray'}>expires {fmtDate(expiresAt)}</Badge>}
          {status && <StatusBadge status={status} />}
        </div>
      </div>
      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <div className="pb-muted" style={{ fontSize: 12 }}>Username</div>
          <div className="d-flex align-items-center gap-2"><code className="fw-bold" style={{ fontSize: 14 }}>{username}</code><CopyBtn text={username} /></div>
        </div>
        {password && (
          <div className="col-md-6">
            <div className="pb-muted" style={{ fontSize: 12 }}>Password</div>
            <div className="d-flex align-items-center gap-2"><code className="fw-bold" style={{ fontSize: 14 }}>{password}</code><CopyBtn text={password} /></div>
          </div>
        )}
      </div>
      {links ? (
        <>
          <div className="pb-eyebrow mb-2">Playlist & apps</div>
          <div className="d-grid gap-2">
            <LinkRow icon="bi-list-ul" label="M3U playlist (m3u_plus)" url={links.m3u} />
            <LinkRow icon="bi-calendar3" label="EPG guide (XMLTV)" url={links.epg} />
            <LinkRow icon="bi-globe" label="Player API" url={links.portal} />
            <LinkRow icon="bi-play-btn" label="Web player" url={links.webplayer} />
          </div>
          <p className="pb-muted mt-3 mb-0" style={{ fontSize: 12.5 }}>
            Works with any Xtream-compatible app (IPTV Smarters, TiviMate, VLC, Smart TV portals). Enter the username + password with the portal shown in Player API.
          </p>
        </>
      ) : (
        <div className="alert alert-warning py-2 mb-0" style={{ background: 'rgba(245,179,1,.08)', borderColor: 'rgba(245,179,1,.3)', color: '#ffd66b', fontSize: 13.5 }}>
          <i className="bi bi-hourglass-split me-2" />Line is being activated — refresh in a minute, or contact support if it stays pending.
        </div>
      )}
    </div>
  );

  return (
    <div>
      {data.lines.map((l) => (
        <LineCard
          key={l.id}
          username={l.username}
          password={l.password}
          planLabel={PLAN_LABEL[l.plan] || `Plan ${l.plan}`}
          connections={l.connections}
          expiresAt={l.expiresAt}
          links={l.links}
          status={l.status}
        />
      ))}
      {data.subscriptionLines.filter((s) => s.lineStatus === 'PROVISIONED' && !data.lines.some((l) => l.username === s.username)).map((s) => (
        <LineCard key={s.subscriptionId} username={s.username} password={s.password} planLabel={s.plan} expiresAt={s.expiresAt} links={s.links} status={s.status === 'ACTIVE' ? 'ACTIVE' : s.status} />
      ))}
      {data.subscriptionLines.filter((s) => s.lineStatus === 'FAILED').map((s) => (
        <div className="pb-glass p-3 mb-3" key={s.subscriptionId} style={{ borderColor: 'rgba(255,59,72,.35)' }}>
          <i className="bi bi-exclamation-triangle text-danger me-2" />
          Line activation failed for {s.plan} — our team has been notified and will retry shortly. {s.lineMsg}
        </div>
      ))}
    </div>
  );
}

function LinkRow({ icon, label, url }: { icon: string; label: string; url: string }) {
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 13 }}>
      <i className={`bi ${icon} pb-muted`} style={{ width: 18 }} />
      <span className="pb-muted" style={{ width: 170 }}>{label}</span>
      <code className="flex-fill text-truncate" style={{ fontSize: 12 }}>{url}</code>
      <CopyBtn text={url} />
      <a className="btn btn-pb-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label}`}>
        <i className="bi bi-box-arrow-up-right" />
      </a>
    </div>
  );
}

export function CopyBtn({ text, label }: { text: string; label?: string }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-pb-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast('err', 'Clipboard unavailable');
        }
      }}
      aria-label={label || 'Copy'}
    >
      <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`} />
    </button>
  );
}

// ─── Admin console ──────────────────────────────────────────

type AdminData = {
  configured: boolean;
  info: { allow_trial?: string; used_trial?: string; user_credit?: string; api_username?: string; is_monthly?: string; monthly_max_lines?: string; api_status?: string; next_renewal?: string; total_paid_lines?: string } | null;
  infoMsg: string;
  logs: { log_id: string; info: string; date: string; credits_charge: string; credits_left: string }[];
  lines: { id: string; type: string; username: string; password: string; xtreamPlan: number; connections: number; status: string; providerMsg: string; notice: string; createdAt: string; user: { name: string; email: string } | null }[];
};

export function AdminXtream() {
  const { toast } = useApp();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: 'XTREAM', username: '', password: '', mac: '', plan: 1, connections: 1, notice: '' });

  const load = useCallback(() => {
    setLoading(true);
    get<AdminData>('/api/admin/xtream').then(setData).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const act = async (body: Record<string, unknown>, okMsg: string) => {
    setBusy(true);
    try {
      const r = await post<{ ok?: boolean; message?: string; providerMessage?: string }>('/api/admin/xtream', body);
      toast('ok', r.message || r.providerMessage || okMsg);
      load();
    } catch (e) {
      toast('err', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <>
      {!data.configured && (
        <div className="pb-glass p-3 mb-3" style={{ borderColor: 'rgba(255,59,72,.4)' }}>
          <i className="bi bi-plug me-2 text-danger" />
          The reseller API key is not configured. Set the <code>XTREAM_API_KEY</code> (and optionally <code>XTREAM_API_URL</code>, <code>XTREAM_PORTAL_HOST</code>) environment variable on the host, then reload.
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-3"><Kpi icon="bi-coin" label="Credits available" value={data.info?.user_credit ?? '—'} gold /></div>
        <div className="col-md-3"><Kpi icon="bi-people" label="Paid lines" value={data.info?.total_paid_lines ?? '—'} /></div>
        <div className="col-md-3"><Kpi icon="bi-gift" label="Trials used" value={`${data.info?.used_trial ?? '—'} / ${data.info?.allow_trial ?? '—'}`} /></div>
        <div className="col-md-3"><Kpi icon="bi-calendar-check" label="Plan renews" value={data.info?.next_renewal && data.info.next_renewal !== '0' ? data.info.next_renewal : '—'} /></div>
      </div>

      <div className="pb-glass p-3 mb-3 d-flex gap-2 align-items-center flex-wrap">
        <span>Provider account: <b>{data.info?.api_username || '—'}</b></span>
        <span className="pb-badge">{data.info?.is_monthly === '1' ? 'Monthly plan' : 'Credit plan'}</span>
        <span className={`pb-badge ${data.info?.api_status === '1' ? 'green' : 'red'}`}>API {data.info?.api_status === '1' ? 'online' : 'unknown'}</span>
        <div className="flex-fill" />
        <button className="btn btn-pb-ghost btn-sm" disabled={busy} onClick={() => act({ action: 'check' }, 'Connection checked')}>
          <i className="bi bi-arrow-repeat me-1" /> Check connection
        </button>
        {!data.info && <span className="pb-muted" style={{ fontSize: 12.5 }}>{data.infoMsg}</span>}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="pb-glass table-responsive mb-3">
            <table className="pb-table">
              <thead><tr><th>Line</th><th>Type</th><th>Plan</th><th>Owner</th><th>Status</th><th>Created</th><th className="text-end">Actions</th></tr></thead>
              <tbody>
                {data.lines.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code className="fw-bold" style={{ fontSize: 12.5 }}>{l.username}</code>
                      {l.notice && <div className="pb-muted" style={{ fontSize: 11 }}>{l.notice}</div>}
                    </td>
                    <td><Badge kind="gray">{l.type}</Badge></td>
                    <td>{PLAN_LABEL[l.xtreamPlan] || l.xtreamPlan} · {l.connections}×</td>
                    <td className="pb-muted" style={{ fontSize: 12 }}>{l.user ? l.user.email : 'manual'}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td className="pb-muted" style={{ fontSize: 12 }}>{fmtDateTime(l.createdAt)}</td>
                    <td className="text-end text-nowrap">
                      {l.status !== 'DELETED' && (
                        <>
                          <select
                            className="form-select form-select-sm d-inline-block me-1"
                            style={{ width: 92 }}
                            defaultValue="1"
                            onChange={(e) => act({ action: 'extend', lineId: l.id, plan: Number(e.target.value) }, 'Line extended')}
                            aria-label={`Extend ${l.username}`}
                          >
                            <option value="">Extend…</option>
                            <option value="1">+1 mo</option>
                            <option value="2">+3 mo</option>
                            <option value="3">+6 mo</option>
                            <option value="4">+12 mo</option>
                          </select>
                          <button
                            className="btn btn-pb-danger btn-sm"
                            disabled={busy}
                            title="Delete line (force refunds remaining credit)"
                            onClick={() => act({ action: 'delete', lineId: l.id, force: true }, 'Line deleted')}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.lines.length && <Empty icon="bi-hdmi" text="No lines provisioned yet — they are generated automatically on checkout." />}
          </div>

          <div className="pb-glass p-3">
            <div className="pb-eyebrow mb-2">Credit history (provider)</div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="pb-table">
                <thead><tr><th>Date</th><th>Activity</th><th>Charge</th><th>Balance</th></tr></thead>
                <tbody>
                  {(data.logs || []).slice(0, 40).map((l) => (
                    <tr key={l.log_id}>
                      <td className="pb-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{l.date}</td>
                      <td style={{ fontSize: 12.5 }}>{l.info}</td>
                      <td style={{ color: String(l.credits_charge).startsWith('+') ? '#34d399' : '#ff6b74', fontSize: 12.5 }}>{l.credits_charge}</td>
                      <td className="pb-muted" style={{ fontSize: 12.5 }}>{l.credits_left}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(data.logs || []).length && <Empty icon="bi-journal" text={data.logMsg || 'No credit activity yet.'} />}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="pb-glass p-4">
            <div className="pb-eyebrow mb-3">Create line manually</div>
            <Field label="Type">
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="XTREAM">Xtream user</option>
                <option value="ACTIVECODE">ActiveCode</option>
                <option value="MAC">MAC address</option>
              </select>
            </Field>
            {form.type === 'MAC' ? (
              <Field label="MAC address" hint="00:AA:BB:CC:DD:11">
                <input className="form-control" value={form.mac} onChange={(e) => setForm({ ...form, mac: e.target.value })} />
              </Field>
            ) : (
              <>
                {form.type === 'XTREAM' && (
                  <>
                    <Field label="Username (auto if empty)"><input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
                    <Field label="Password (auto if empty)"><input className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
                  </>
                )}
                <Field label="Connections (1–4)"><input type="number" min={1} max={4} className="form-control" value={form.connections} onChange={(e) => setForm({ ...form, connections: Number(e.target.value) })} /></Field>
              </>
            )}
            <Field label="Package">
              <select className="form-select" value={form.plan} onChange={(e) => setForm({ ...form, plan: Number(e.target.value) })}>
                <option value={11}>24h Trial (0 credits)</option>
                <option value={1}>1 Month (1 credit)</option>
                <option value={2}>3 Months (3 credits)</option>
                <option value={3}>6 Months (5 credits)</option>
                <option value={4}>12 Months (10 credits)</option>
              </select>
            </Field>
            <Field label="Notice"><input className="form-control" value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} /></Field>
            <button
              className="btn btn-pb w-100"
              disabled={busy}
              onClick={() => act({ action: 'create', type: form.type, username: form.username, password: form.password, mac: form.mac, plan: form.plan, connections: form.connections, notice: form.notice }, 'Line created')}
            >
              <i className="bi bi-plus-circle me-1" /> Create line
            </button>
            <p className="pb-muted mt-3 mb-0" style={{ fontSize: 12 }}>
              Package: worldwide Channels + Movies + Series (no adult). Content flags follow the operator's reseller agreement.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
