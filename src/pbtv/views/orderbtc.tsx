'use client';

import { useEffect, useState } from 'react';
import { get, post } from '../api';
import { Link, navigate } from '../router';
import { useApp } from '../store';
import { Crumb, Empty, Field, SectionTitle, Spinner, StatusBadge, fmtDateTime, fmtMoney } from '../ui';

type OrderInfo = {
  number: string; status: string; paymentMethod: string; txid: string;
  total: number; currency: string; createdAt: string;
  plan: { id: string; name: string; billingPeriod: string };
  payment?: { provider: string; status: string; reference: string } | null;
};

/**
 * Bitcoin payment page: shows the operator's public BTC address + QR for the
 * exact USD amount, and lets the customer submit their transaction ID (TXID).
 * The subscription is activated once the operator verifies the payment
 * (Admin → Orders → "Verify & give subscription").
 */
export function BtcOrderPage({ number }: { number: string }) {
  const { toast } = useApp();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [btc, setBtc] = useState<{ address: string; network: string; note: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [txid, setTxid] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      get<{ order: OrderInfo }>(`/api/orders/number/${encodeURIComponent(number)}`),
      get<{ address: string; network: string; note: string }>('/api/payments/btc'),
    ])
      .then(([o, b]) => {
        setOrder(o.order);
        setBtc(b);
        if (o.order.txid) { setTxid(o.order.txid); setDone(true); }
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <Spinner />;
  if (err || !order) {
    return (
      <Empty icon="bi-receipt" text={err || 'Order not found.'}>
        <Link to="/account/orders" className="btn btn-pb btn-sm mt-2">My orders</Link>
      </Empty>
    );
  }

  const completed = order.status === 'COMPLETED' || order.status === 'PAID';
  const failed = order.status === 'FAILED' || order.status === 'CANCELLED';
  const verifying = order.status === 'PENDING' && !!order.txid;
  const qrText = btc?.address ? `bitcoin:${btc.address}?label=PLAYBEATTV%20${encodeURIComponent(order.number)}` : '';

  const submitTxid = async () => {
    setBusy(true);
    setErr('');
    try {
      await post('/api/orders/txid', { orderNumber: order.number, txid: txid.trim() });
      setDone(true);
      toast('ok', 'TXID submitted — your payment is now being verified.');
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyAddress = async () => {
    if (!btc?.address) return;
    try {
      await navigator.clipboard.writeText(btc.address);
      toast('ok', 'BTC address copied');
    } catch {
      toast('err', 'Copy failed — select the address manually.');
    }
  };

  return (
    <>
      <Crumb items={[{ label: 'Pricing', to: '/pricing' }, { label: 'Checkout', to: '/checkout' }, { label: 'Bitcoin payment' }]} />
      <SectionTitle eyebrow={`Order ${order.number}`} title="Pay with Bitcoin" />

      <div className="row g-4 justify-content-center">
        <div className="col-lg-5">
          <div className="pb-glass p-4 pb-gold-line text-center">
            <div className="pb-eyebrow mb-3">Scan or copy the address</div>
            {qrText ? (
              <div className="bg-white rounded-4 p-3 d-inline-block" style={{ lineHeight: 0 }}>
                <img
                  src={`/api/payments/btc/qr?text=${encodeURIComponent(qrText)}`}
                  alt={`Bitcoin payment QR for order ${order.number}`}
                  width={220} height={220} style={{ display: 'block' }}
                />
              </div>
            ) : <Spinner />}
            <Field label="BTC address (Bitcoin mainnet)">
              <div className="input-group">
                <input className="form-control font-monospace" style={{ fontSize: 12 }} readOnly value={btc?.address || ''} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn btn-pb-ghost" onClick={copyAddress} type="button"><i className="bi bi-clipboard me-1" />Copy</button>
              </div>
            </Field>
            <div className="pb-glass p-3 mt-2 text-start" style={{ fontSize: 13 }}>
              <div className="d-flex justify-content-between py-1">
                <span className="pb-muted">Plan</span><span className="fw-semibold">{order.plan.name}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="pb-muted">Amount due</span>
                <span className="fw-bold" style={{ color: 'var(--pb-gold, #fbbf24)', fontSize: 16 }}>{fmtMoney(order.total, order.currency)}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="pb-muted">Network</span><span>{btc?.network || 'Bitcoin (BTC)'}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="pb-muted">Placed</span><span>{fmtDateTime(order.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="pb-glass p-4">
            {completed ? (
              <>
                <i className="bi bi-check-circle-fill" style={{ fontSize: 46, color: '#34d399' }} />
                <h4 className="fw-bold mt-3">Payment verified — you're all set!</h4>
                <p className="pb-muted">Your <b>{order.plan.name}</b> subscription is active. Everything is unlocked, including the 18+ section.</p>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-pb-gold" onClick={() => navigate('/live-tv')}>Start watching</button>
                  <Link to="/account/subscription" className="btn btn-pb-ghost">My subscription</Link>
                </div>
              </>
            ) : failed ? (
              <>
                <i className="bi bi-x-circle-fill" style={{ fontSize: 46, color: '#ff3b48' }} />
                <h4 className="fw-bold mt-3">Payment not verified</h4>
                <p className="pb-muted">This order was marked as unverified. Double-check your TXID and contact <Link to="/contact" className="pb-nav-link">24/7 support</Link> — we'll sort it out.</p>
                <Link to="/pricing" className="btn btn-pb">Back to pricing</Link>
              </>
            ) : (
              <>
                {verifying ? (
                  <div className="alert alert-warning py-3" style={{ background: 'rgba(251,191,36,.08)', borderColor: 'rgba(251,191,36,.3)', color: '#fcd34d' }}>
                    <i className="bi bi-hourglass-split me-2" /><b>Verifying your payment…</b><br />
                    TXID <span className="font-monospace" style={{ fontSize: 12 }}>{order.txid.slice(0, 24)}…</span> received. Your All-Access subscription is activated right after verification — usually within minutes of 1 confirmation.
                  </div>
                ) : (
                  <div className="alert alert-info py-3" style={{ background: 'rgba(46,144,250,.08)', borderColor: 'rgba(46,144,250,.3)', color: '#9ecbff' }}>
                    <i className="bi bi-1-circle me-2" />Send <b>exactly {fmtMoney(order.total, order.currency)}</b> worth of BTC to the address (mainnet only — other networks are lost).<br />
                    <i className="bi bi-2-circle me-2 mt-2" />Paste your transaction ID (TXID) below so we can match your transfer.<br />
                    <i className="bi bi-3-circle me-2 mt-2" />We verify and unlock your subscription — everything included.
                  </div>
                )}
                {btc?.note && !verifying && <p className="pb-muted" style={{ fontSize: 13 }}>{btc.note}</p>}
                {!verifying && (
                  <>
                    <Field label="Transaction ID (TXID)" hint="Find it in your wallet under the transaction details — a long hexadecimal string.">
                      <input
                        className="form-control font-monospace" style={{ fontSize: 12.5 }}
                        placeholder="e.g. 9f2c7b… (64 hex characters)"
                        value={txid} onChange={(e) => setTxid(e.target.value)}
                      />
                    </Field>
                    {err && <div className="alert alert-danger py-2" style={{ background: 'rgba(255,59,72,.1)', borderColor: 'rgba(255,59,72,.3)', color: '#ff8a91' }}>{err}</div>}
                    <button className="btn btn-pb-gold w-100 mt-2" onClick={submitTxid} disabled={busy || txid.trim().length < 16}>
                      <i className="bi bi-send me-2" />{busy ? 'Submitting…' : 'Submit TXID for verification'}
                    </button>
                  </>
                )}
                {verifying && (
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-pb-ghost" onClick={() => navigate('/live-tv')}>Browse catalog</button>
                    <Link to="/account/orders" className="btn btn-pb-ghost">My orders</Link>
                  </div>
                )}
                <p className="pb-muted text-center mt-3 mb-0" style={{ fontSize: 12 }}>
                  <i className="bi bi-shield-check me-1" />Payment status: <StatusBadge status={order.payment?.status || order.status} /> — keep this page or your TXID handy.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
