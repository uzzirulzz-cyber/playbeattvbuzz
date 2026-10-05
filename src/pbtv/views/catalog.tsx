'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, patch, post } from '../api';
import { HlsPlayer } from '../player';
import { Link, navigate } from '../router';
import { useApp } from '../store';
import { Badge, Crumb, Empty, ErrorState, Field, SectionTitle, Spinner, StatusBadge, ThumbArt, fmtDateTime, fmtTime } from '../ui';

// ─── LIVE TV browser ────────────────────────────────────────

type ChannelRow = {
  id: string; name: string; slug: string; description: string; logoSeed: string;
  category: string; categorySlug: string; country: string; language: string;
  quality: string; isFree: boolean; epgId: string;
};
type Facets = { categories: { name: string; slug: string }[]; countries: string[]; languages: string[]; qualities: string[] };

export function LiveTV({ params }: { params: Record<string, string> }) {
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    q: params.q || '', category: '', country: '', language: '', quality: '', page: 1,
  });
  const [recent, setRecent] = useState<{ refId: string; label: string }[]>([]);
  const { favSet } = useApp();

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(f.page), size: '24' });
    if (f.q) qs.set('q', f.q);
    if (f.category) qs.set('category', f.category);
    if (f.country) qs.set('country', f.country);
    if (f.language) qs.set('language', f.language);
    if (f.quality) qs.set('quality', f.quality);
    setLoading(true);
    get<{ rows: ChannelRow[]; total: number; facets: Facets }>(`/api/channels?${qs}`)
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setFacets(r.facets);
        setErr('');
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [f]);

  useEffect(() => {
    get<{ rows: { refId: string; label: string }[] }>('/api/history')
      .then((r) => setRecent(r.rows.filter((x) => x.refType === 'CHANNEL').slice(0, 8)))
      .catch(() => null);
  }, []);

  const favOnly = useMemo(() => rows.filter((r) => favSet.has(`CHANNEL:${r.id}`)), [rows, favSet]);

  return (
    <>
      <SectionTitle eyebrow="Live Television" title="Channel browser" right={<span className="pb-badge">{total} channels</span>} />
      <div className="row g-3">
        <div className="col-lg-3">
          <div className="pb-glass p-3 d-grid gap-3">
            <Field label="Search">
              <input className="form-control" placeholder="Channel name…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
            </Field>
            <Field label="Category">
              <select className="form-select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, page: 1 })}>
                <option value="">All categories</option>
                {facets?.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <select className="form-select" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value, page: 1 })}>
                <option value="">All countries</option>
                {facets?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select className="form-select" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value, page: 1 })}>
                <option value="">All languages</option>
                {facets?.languages.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Quality">
              <div className="d-flex gap-2">
                {['', 'SD', 'HD', '4K'].map((q) => (
                  <button key={q} className={`btn btn-sm ${f.quality === q ? 'btn-pb' : 'btn-pb-ghost'}`} onClick={() => setF({ ...f, quality: q, page: 1 })}>
                    {q || 'ALL'}
                  </button>
                ))}
              </div>
            </Field>
            {(f.q || f.category || f.country || f.language || f.quality) && (
              <button className="btn btn-pb-ghost btn-sm" onClick={() => setF({ q: '', category: '', country: '', language: '', quality: '', page: 1 })}>
                <i className="bi bi-x-circle me-1" /> Clear filters
              </button>
            )}
          </div>
          {recent.length > 0 && (
            <div className="pb-glass p-3 mt-3">
              <div className="pb-eyebrow mb-2">Recently watched</div>
              {recent.map((r) => (
                <Link key={r.refId} to={`/watch/${r.refId}`} className="d-block pb-muted py-1" style={{ fontSize: 13.5 }}>
                  <i className="bi bi-clock-history me-2" />{r.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="col-lg-9">
          {loading && <Spinner />}
          {err && <ErrorState message={err} onRetry={() => setF({ ...f })} />}
          {!loading && !err && rows.length === 0 && <Empty icon="bi-broadcast" text="No channels match these filters." />}
          {!loading && !err && (
            <div className="row g-3">
              {rows.map((c) => (
                <div className="col-sm-6 col-xl-4" key={c.id}>
                  <div className="pb-card h-100">
                    <Link to={`/watch/${c.id}`} ariaLabel={`Watch ${c.name}`}>
                      <ThumbArt seed={c.logoSeed} title={c.name} />
                    </Link>
                    <div className="pb-meta">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <Link to={`/watch/${c.id}`} className="fw-bold" style={{ fontSize: 14.5 }}>{c.name}</Link>
                        <Badge kind={c.quality === '4K' ? 'gold' : ''}>{c.quality}</Badge>
                      </div>
                      <div className="pb-muted" style={{ fontSize: 12.5 }}>
                        {c.category} · {c.country} · {c.language}
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <span className="pb-live-dot" style={{ width: 6, height: 6 }} />
                        <span className="pb-muted" style={{ fontSize: 12 }}>EPG: now/next available</span>
                        {favSet.has(`CHANNEL:${c.id}`) && <i className="bi bi-heart-fill ms-auto" style={{ color: '#ff6b74', fontSize: 12 }} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {favOnly.length > 0 && (
            <div className="pb-glass p-3 mt-4">
              <div className="pb-eyebrow mb-2"><i className="bi bi-heart-fill me-1" /> Your favorites on this page</div>
              <div className="d-flex flex-wrap gap-2">
                {favOnly.map((c) => <Link key={c.id} to={`/watch/${c.id}`} className="pb-badge">{c.name}</Link>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── CHANNEL / MOVIE / EPISODE PLAYER ───────────────────────

type NowNext = {
  current: { title: string; description: string; startsAt: string; endsAt: string } | null;
  next: { title: string; startsAt: string; endsAt: string } | null;
};

export function WatchPage({ id }: { id: string }) {
  const { session, hasActiveSub, favSet, toggleFavorite, toast, refreshSession } = useApp();
  const [ch, setCh] = useState<{
    channel: ChannelRow & { epgId: string }; nowNext: NowNext; schedule: { id: string; title: string; description: string; startsAt: string; endsAt: string }[];
  } | null>(null);
  const [stream, setStream] = useState<{ url: string; type: string; label: string } | null>(null);
  const [playErr, setPlayErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [others, setOthers] = useState<ChannelRow[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  const openStream = useCallback(async () => {
    setPlayErr('');
    try {
      const r = await post<{ stream: { url: string; type: string; label: string } }>(`/api/play/channel/${id}`, {});
      setStream(r.stream);
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'SUBSCRIPTION_REQUIRED' || err.code === 'UNAUTHORIZED') {
        setPlayErr(err.message);
      } else {
        setPlayErr(err.message);
      }
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setStream(null);
    Promise.all([
      get<typeof ch>(`/api/channels/${id}`),
      get<{ rows: ChannelRow[] }>('/api/channels?size=8'),
    ])
      .then(([detail, list]) => {
        setCh(detail);
        setOthers((list.rows || []).filter((x) => x.id !== id).slice(0, 6));
        if (detail?.channel?.isFree || hasActiveSub) openStream();
      })
      .catch((e) => setPlayErr(e.message))
      .finally(() => setLoading(false));
  }, [id, hasActiveSub, openStream]);

  const pingProgress = useCallback((seconds: number) => {
    post('/api/history', { refType: 'CHANNEL', refId: id, label: ch?.channel.name, secondsWatched: seconds }).catch(() => null);
  }, [id, ch]);

  if (loading) return <Spinner />;
  if (!ch) {
    return (
      <div>
        <Crumb items={[{ label: 'Home', to: '/' }, { label: 'Live TV', to: '/live-tv' }, { label: 'Not found' }]} />
        <Empty icon="bi-broadcast" text="Channel not found.">
          <Link to="/live-tv" className="btn btn-pb btn-sm mt-2">Back to channels</Link>
        </Empty>
      </div>
    );
  }
  const c = ch.channel;
  const isFav = favSet.has(`CHANNEL:${c.id}`);

  return (
    <>
      <Crumb items={[{ label: 'Home', to: '/' }, { label: 'Live TV', to: '/live-tv' }, { label: c.name }]} />
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="pb-player-shell">
            {stream ? (
              <HlsPlayer src={stream.url} streamType={stream.type} onProgress={pingProgress} />
            ) : (
              <div className="d-grid" style={{ aspectRatio: '16/9', placeItems: 'center' }}>
                <div className="text-center px-4">
                  <ThumbArt seed={c.logoSeed} title={c.name} />
                  {playErr && (
                    <div className="mt-3">
                      <p className="text-warning mb-2" style={{ fontSize: 14 }}><i className="bi bi-lock me-1" />{playErr}</p>
                      {!session?.user ? (
                        <Link to={`/login?next=/watch/${c.id}`} className="btn btn-pb btn-sm">Sign in to watch</Link>
                      ) : !hasActiveSub ? (
                        <Link to="/pricing" className="btn btn-pb-gold btn-sm">Choose a plan</Link>
                      ) : (
                        <button className="btn btn-pb btn-sm" onClick={openStream}>Try again</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="d-flex align-items-start justify-content-between gap-3 mt-3 flex-wrap">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="pb-live-dot" />
                <h1 className="fw-bold m-0" style={{ fontSize: 24 }}>{c.name}</h1>
                <Badge kind={c.quality === '4K' ? 'gold' : ''}>{c.quality}</Badge>
                {c.isFree && <Badge kind="green">Free channel</Badge>}
              </div>
              <div className="pb-muted" style={{ fontSize: 13.5 }}>{c.category} · {c.country} · {c.language} · EPG {c.epgId}</div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-pb-ghost btn-sm" onClick={() => toggleFavorite('CHANNEL', c.id, c.name)}>
                <i className={`bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} me-1`} style={isFav ? { color: '#ff6b74' } : {}} />
                {isFav ? 'Favorited' : 'Favorite'}
              </button>
              <button className="btn btn-pb-ghost btn-sm" onClick={() => setReportOpen(true)}>
                <i className="bi bi-flag me-1" /> Report a problem
              </button>
            </div>
          </div>
          <p className="pb-muted mt-2" style={{ fontSize: 14 }}>{c.description}</p>

          {/* EPG */}
          <div className="pb-glass p-3 mt-3">
            <div className="pb-eyebrow mb-2">Program schedule (EPG)</div>
            {ch.nowNext.current ? (
              <div className="pb-epg-now ps-3 mb-2">
                <div className="fw-bold" style={{ fontSize: 14.5 }}>
                  NOW · {fmtTime(ch.nowNext.current.startsAt)}–{fmtTime(ch.nowNext.current.endsAt)} — {ch.nowNext.current.title}
                </div>
                <div className="pb-muted" style={{ fontSize: 13 }}>{ch.nowNext.current.description}</div>
              </div>
            ) : (
              <div className="pb-muted mb-2" style={{ fontSize: 13.5 }}>No program on air right now.</div>
            )}
            {ch.nowNext.next && (
              <div className="ps-3 mb-2" style={{ borderLeft: '3px solid var(--pb-line)' }}>
                <div className="fw-semibold" style={{ fontSize: 13.5 }}>
                  NEXT · {fmtTime(ch.nowNext.next.startsAt)} — {ch.nowNext.next.title}
                </div>
              </div>
            )}
            <div className="table-responsive">
              <table className="pb-table">
                <thead><tr><th>Time</th><th>Program</th><th>Description</th></tr></thead>
                <tbody>
                  {ch.schedule.map((p) => (
                    <tr key={p.id}>
                      <td className="pb-muted" style={{ whiteSpace: 'nowrap' }}>{fmtTime(p.startsAt)} – {fmtTime(p.endsAt)}</td>
                      <td className="fw-semibold">{p.title}</td>
                      <td className="pb-muted">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="pb-eyebrow mb-2">Other channels</div>
          <div className="d-grid gap-2">
            {others.map((o) => (
              <Link key={o.id} to={`/watch/${o.id}`} className="pb-glass d-flex align-items-center gap-3 p-2">
                <span style={{ width: 64, height: 40, borderRadius: 9, overflow: 'hidden', display: 'block' }}>
                  <ThumbArt seed={o.logoSeed} title="" />
                </span>
                <span className="min-w-0">
                  <span className="fw-semibold d-block" style={{ fontSize: 13.5 }}>{o.name}</span>
                  <span className="pb-muted d-block" style={{ fontSize: 12 }}>{o.category} · {o.quality}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ModalReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        subject={`Stream problem: ${c.name}`}
        onSubmit={async (msg) => {
          await post('/api/support', { subject: `Stream problem: ${c.name}`, category: 'Technical', priority: 'HIGH', message: msg });
          toast('ok', 'Problem reported — our team is on it');
          setReportOpen(false);
        }}
        message={reportMsg}
        setMessage={setReportMsg}
      />
    </>
  );
}

function ModalReport({ open, onClose, subject, onSubmit, message, setMessage }: {
  open: boolean; onClose: () => void; subject: string;
  onSubmit: (msg: string) => Promise<void>; message: string; setMessage: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  return (
    <>
      <div className="pb-modal-backdrop" onClick={onClose} />
      <div className="pb-modal" role="dialog" aria-modal="true">
        <div className="px-4 py-3 fw-bold" style={{ borderBottom: '1px solid var(--pb-line)' }}>{subject}</div>
        <div className="p-4">
          <Field label="What happened?" hint="Your session details are attached automatically.">
            <textarea className="form-control" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Stream buffers constantly after 10 minutes…" />
          </Field>
          <div className="d-flex gap-2 justify-content-end">
            <button className="btn btn-pb-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-pb"
              disabled={busy || message.trim().length < 5}
              onClick={async () => {
                setBusy(true);
                try { await onSubmit(message); } finally { setBusy(false); }
              }}
            >
              {busy ? 'Sending…' : 'Submit report'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MOVIES ─────────────────────────────────────────────────

type Movie = {
  id: string; title: string; slug: string; description: string; posterSeed: string;
  genres: string; language: string; year: number; durationMin: number; quality: string; rating: string; featured: boolean;
};

export function Movies({ params }: { params: Record<string, string> }) {
  const [rows, setRows] = useState<Movie[]>([]);
  const [facets, setFacets] = useState<{ genres: string[]; languages: string[]; years: number[]; qualities: string[] } | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ q: params.q || '', genre: '', language: '', year: '', quality: '', sort: 'trending', page: 1 });

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(f.page), size: '18', sort: f.sort });
    Object.entries({ q: f.q, genre: f.genre, language: f.language, year: f.year, quality: f.quality }).forEach(([k, v]) => v && qs.set(k, v));
    setLoading(true);
    get<{ rows: Movie[]; total: number; facets: NonNullable<typeof facets> }>(`/api/movies?${qs}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); setFacets(r.facets); setErr(''); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [f]);

  return (
    <>
      <SectionTitle eyebrow="Movies" title="Movie catalog" right={<span className="pb-badge">{total} titles</span>} />
      <div className="pb-glass p-3 mb-3 d-flex gap-2 flex-wrap align-items-end">
        <div style={{ minWidth: 180, flex: 1 }}>
          <Field label="Search"><input className="form-control" placeholder="Title…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} /></Field>
        </div>
        <div style={{ width: 150 }}>
          <Field label="Genre">
            <select className="form-select" value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value, page: 1 })}>
              <option value="">All</option>
              {facets?.genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ width: 140 }}>
          <Field label="Language">
            <select className="form-select" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value, page: 1 })}>
              <option value="">All</option>
              {facets?.languages.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ width: 110 }}>
          <Field label="Year">
            <select className="form-select" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value, page: 1 })}>
              <option value="">All</option>
              {facets?.years.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ width: 120 }}>
          <Field label="Quality">
            <select className="form-select" value={f.quality} onChange={(e) => setF({ ...f, quality: e.target.value, page: 1 })}>
              <option value="">All</option>
              {facets?.qualities.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ width: 150 }}>
          <Field label="Sort">
            <select className="form-select" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value, page: 1 })}>
              <option value="trending">Trending</option>
              <option value="newest">Newest</option>
              <option value="az">A–Z</option>
            </select>
          </Field>
        </div>
      </div>
      {loading && <Spinner />}
      {err && <ErrorState message={err} onRetry={() => setF({ ...f })} />}
      {!loading && !err && rows.length === 0 && <Empty icon="bi-film" text="No movies match your filters." />}
      {!loading && !err && (
        <div className="row g-3">
          {rows.map((m) => <MovieCard key={m.id} m={m} />)}
        </div>
      )}
    </>
  );
}

export function MovieCard({ m }: { m: Movie }) {
  const { session, hasActiveSub } = useApp();
  const watch = async () => {
    if (!session?.user) {
      navigate(`/login?next=/movies`);
      return;
    }
    if (!hasActiveSub) {
      navigate('/pricing');
      return;
    }
    try {
      await post(`/api/play/movie/${m.id}`, {});
      navigate(`/play/movie/${m.id}`);
    } catch (e) {
      navigate(`/play/movie/${m.id}`); // player page will show precise error/CTA
    }
  };
  return (
    <div className="col-6 col-md-4 col-xl-3">
      <div className="pb-card h-100 d-flex flex-column">
        <ThumbArt seed={m.posterSeed} title={m.title} tall />
        <div className="pb-meta d-flex flex-column flex-fill">
          <div className="fw-bold" style={{ fontSize: 14 }}>{m.title}</div>
          <div className="pb-muted" style={{ fontSize: 12.5 }}>{m.year} · {m.genres.split(',')[0]} · {m.durationMin} min</div>
          <div className="d-flex gap-1 mt-1 mb-2">
            <Badge kind={m.quality === '4K' ? 'gold' : ''}>{m.quality}</Badge>
            <Badge kind="gray">{m.rating}</Badge>
          </div>
          <button className="btn btn-pb btn-sm w-100 mt-auto" onClick={watch}>
            <i className="bi bi-play-fill me-1" /> Watch
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MOVIE PLAYER ───────────────────────────────────────────

export function MoviePlayer({ id }: { id: string }) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [stream, setStream] = useState<{ url: string; type: string } | null>(null);
  const [err, setErr] = useState('');
  const [related, setRelated] = useState<Movie[]>([]);
  const { session, hasActiveSub } = useApp();
  const { favSet, toggleFavorite } = useApp();

  useEffect(() => {
    get<{ movie: Movie; related: Movie[] }>(`/api/movies/${id}`)
      .then((r) => { setMovie(r.movie); setRelated(r.related); })
      .catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    if (session?.user) {
      post<{ stream: { url: string; type: string } }>(`/api/play/movie/${id}`, {})
        .then((r) => setStream(r.stream))
        .catch((e) => setErr((e as Error).message));
    }
  }, [id, session]);

  if (!movie && !err) return <Spinner />;
  return (
    <>
      <Crumb items={[{ label: 'Home', to: '/' }, { label: 'Movies', to: '/movies' }, { label: movie?.title || 'Not found' }]} />
      <div className="row g-4">
        <div className="col-lg-8">
          {stream ? (
            <HlsPlayer src={stream.url} streamType={stream.type} />
          ) : (
            <div className="pb-glass p-5 text-center">
              {session?.user ? (
                err ? <p className="text-warning mb-2"><i className="bi bi-lock me-1" />{err}</p> : <Spinner />
              ) : (
                <>
                  <p className="pb-muted">Sign in with an active subscription to watch this title.</p>
                  <Link to={`/login?next=/play/movie/${id}`} className="btn btn-pb">Sign in</Link>
                </>
              )}
              {hasActiveSub && err && <button className="btn btn-pb-ghost btn-sm ms-2" onClick={() => window.location.reload()}>Retry</button>}
            </div>
          )}
          {movie && (
            <div className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
              <div>
                <h1 className="fw-bold m-0" style={{ fontSize: 24 }}>{movie.title}</h1>
                <div className="pb-muted" style={{ fontSize: 13.5 }}>{movie.year} · {movie.genres} · {movie.durationMin} min · {movie.quality} · {movie.rating}</div>
              </div>
              <button className="btn btn-pb-ghost btn-sm" onClick={() => toggleFavorite('MOVIE', movie.id, movie.title)}>
                <i className={`bi ${favSet.has(`MOVIE:${movie.id}`) ? 'bi-heart-fill' : 'bi-heart'} me-1`} style={favSet.has(`MOVIE:${movie.id}`) ? { color: '#ff6b74' } : {}} />
                Favorite
              </button>
            </div>
          )}
          {movie && <p className="pb-muted mt-2" style={{ fontSize: 14 }}>{movie.description}</p>}
        </div>
        <div className="col-lg-4">
          <div className="pb-eyebrow mb-2">More like this</div>
          <div className="row g-2">
            {related.map((m) => <MovieCard key={m.id} m={m} />)}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SERIES ─────────────────────────────────────────────────

type SeriesRow = { id: string; title: string; slug: string; description: string; posterSeed: string; genres: string; language: string; year: number; quality: string; seasonsCount: number; episodesCount: number };
type SeriesDetail = {
  series: { id: string; title: string; slug: string; description: string; posterSeed: string; genres: string; language: string; year: number; quality: string };
  seasons: { id: string; number: number; title: string; episodes: { id: string; number: number; title: string; description: string; durationMin: number }[] }[];
  related: { id: string; title: string; slug: string; posterSeed: string; year: number; genres: string }[];
};

export function SeriesList() {
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [facets, setFacets] = useState<{ genres: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams({ size: '24' });
    if (q) qs.set('q', q);
    if (genre) qs.set('genre', genre);
    setLoading(true);
    get<{ rows: SeriesRow[]; facets: { genres: string[] } }>(`/api/series?${qs}`)
      .then((r) => { setRows(r.rows); setFacets(r.facets); setErr(''); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [q, genre]);

  return (
    <>
      <SectionTitle eyebrow="Series" title="Binge-worthy originals" />
      <div className="pb-glass p-3 mb-3 d-flex gap-2 flex-wrap align-items-end">
        <div style={{ flex: 1, minWidth: 180 }}>
          <Field label="Search"><input className="form-control" placeholder="Series title…" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        </div>
        <div style={{ width: 200 }}>
          <Field label="Genre">
            <select className="form-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">All</option>
              {facets?.genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
      </div>
      {loading && <Spinner />}
      {err && <ErrorState message={err} onRetry={() => setQ(q)} />}
      {!loading && !err && rows.length === 0 && <Empty icon="bi-stack" text="No series found." />}
      <div className="row g-3">
        {rows.map((s) => (
          <div className="col-6 col-md-4 col-xl-3" key={s.id}>
            <Link to={`/series/${s.slug}`} className="pb-card h-100 d-block" ariaLabel={s.title}>
              <ThumbArt seed={s.posterSeed} title={s.title} tall />
              <div className="pb-meta">
                <div className="fw-bold" style={{ fontSize: 14 }}>{s.title}</div>
                <div className="pb-muted" style={{ fontSize: 12.5 }}>{s.year} · {s.genres.split(',')[0]}</div>
                <div className="pb-muted" style={{ fontSize: 12 }}>{s.seasonsCount} season{s.seasonsCount > 1 ? 's' : ''} · {s.episodesCount} episodes</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

export function SeriesPage({ id }: { id: string }) {
  const { session, hasActiveSub } = useApp();
  const [data, setData] = useState<SeriesDetail | null>(null);
  const [seasonIdx, setSeasonIdx] = useState(0);
  const [err, setErr] = useState('');
  const { favSet, toggleFavorite } = useApp();

  useEffect(() => {
    get<SeriesDetail>(`/api/series/${id}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <ErrorState message={err} />;
  if (!data) return <Spinner />;
  const season = data.seasons[seasonIdx];

  const playEpisode = async (epId: string) => {
    if (!session?.user) return navigate('/login?next=/account');
    if (!hasActiveSub) return navigate('/pricing');
    try {
      await post(`/api/play/episode/${epId}`, {});
      navigate(`/play/episode/${epId}`);
    } catch {
      navigate(`/play/episode/${epId}`);
    }
  };

  return (
    <>
      <Crumb items={[{ label: 'Home', to: '/' }, { label: 'Series', to: '/series' }, { label: data.series.title }]} />
      <div className="row g-4">
        <div className="col-md-4 col-lg-3">
          <div className="pb-card"><ThumbArt seed={data.series.posterSeed} title={data.series.title} tall /></div>
          <button className="btn btn-pb-ghost btn-sm w-100 mt-2" onClick={() => toggleFavorite('SERIES', data.series.id, data.series.title)}>
            <i className={`bi ${favSet.has(`SERIES:${data.series.id}`) ? 'bi-heart-fill' : 'bi-heart'} me-1`} style={favSet.has(`SERIES:${data.series.id}`) ? { color: '#ff6b74' } : {}} />
            Favorite
          </button>
        </div>
        <div className="col-md-8 col-lg-9">
          <h1 className="fw-bold" style={{ fontSize: 26 }}>{data.series.title}</h1>
          <div className="d-flex gap-2 my-2 flex-wrap">
            <Badge kind="gray">{data.series.year}</Badge>
            <Badge>{data.series.quality}</Badge>
            <Badge kind="gray">{data.series.language}</Badge>
            {data.series.genres.split(',').map((g) => <Badge kind="gold" key={g}>{g.trim()}</Badge>)}
          </div>
          <p className="pb-muted" style={{ fontSize: 14.5 }}>{data.series.description}</p>
          <div className="d-flex gap-2 mb-3 flex-wrap">
            {data.seasons.map((s, i) => (
              <button key={s.id} className={`btn btn-sm ${i === seasonIdx ? 'btn-pb' : 'btn-pb-ghost'}`} onClick={() => setSeasonIdx(i)}>
                {s.title || `Season ${s.number}`}
              </button>
            ))}
          </div>
          <div className="pb-glass">
            {season?.episodes.map((e) => (
              <div key={e.id} className="d-flex align-items-center gap-3 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <span className="pb-muted" style={{ width: 28, fontWeight: 700 }}>{e.number}</span>
                <span className="flex-fill">
                  <span className="fw-semibold d-block" style={{ fontSize: 14 }}>{e.title}</span>
                  <span className="pb-muted d-block" style={{ fontSize: 12.5 }}>{e.description}</span>
                </span>
                <span className="pb-muted" style={{ fontSize: 12.5 }}>{e.durationMin} min</span>
                <button className="btn btn-pb btn-sm" onClick={() => playEpisode(e.id)}>
                  <i className="bi bi-play-fill" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── EPISODE PLAYER ─────────────────────────────────────────

export function EpisodePlayer({ id }: { id: string }) {
  const [stream, setStream] = useState<{ url: string; type: string; label: string } | null>(null);
  const [err, setErr] = useState('');
  const { session } = useApp();

  useEffect(() => {
    if (!session?.user) {
      setErr('Sign in with an active subscription to watch.');
      return;
    }
    post<{ stream: { url: string; type: string; label: string } }>(`/api/play/episode/${id}`, {})
      .then((r) => setStream(r.stream))
      .catch((e) => setErr((e as Error).message));
  }, [id, session]);

  return (
    <>
      <Crumb items={[{ label: 'Home', to: '/' }, { label: 'Series', to: '/series' }, { label: stream?.label || 'Episode' }]} />
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {stream ? (
            <HlsPlayer src={stream.url} streamType={stream.type} />
          ) : (
            <div className="pb-glass p-5 text-center">
              <p className="text-warning mb-0"><i className="bi bi-lock me-1" />{err || 'Loading…'}</p>
              {err && <Link to="/pricing" className="btn btn-pb btn-sm mt-3">Choose a plan</Link>}
            </div>
          )}
          <h1 className="fw-bold mt-3" style={{ fontSize: 22 }}>{stream?.label}</h1>
          <p className="pb-muted" style={{ fontSize: 14 }}>Licensed-source playback · quality depends on your plan and the operator's stream.</p>
        </div>
      </div>
    </>
  );
}

// ─── SPORTS dashboard ───────────────────────────────────────

type SportsEvent = {
  id: string; title: string; category: string; homeTeam: string; awayTeam: string;
  startsAt: string; status: string; channel: { id: string; name: string; slug: string; isFree: boolean } | null;
};

export function Sports() {
  const [data, setData] = useState<{ live: SportsEvent[]; upcoming: SportsEvent[]; finished: SportsEvent[]; categories: string[] } | null>(null);
  const [cat, setCat] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    get<{ live: SportsEvent[]; upcoming: SportsEvent[]; finished: SportsEvent[]; categories: string[] }>(`/api/sports${cat ? `?category=${encodeURIComponent(cat)}` : ''}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [cat]);

  if (err) return <ErrorState message={err} />;
  if (!data) return <Spinner />;

  const Ev = ({ e }: { e: SportsEvent }) => (
    <div className="pb-glass p-3 h-100">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <Badge kind="gray">{e.category}</Badge>
        {e.status === 'LIVE' && <Badge kind="red"><span className="pb-live-dot" style={{ width: 6, height: 6 }} /> Live now</Badge>}
        {e.status === 'UPCOMING' && <Badge kind="gold">{fmtDateTime(e.startsAt)}</Badge>}
        {e.status === 'FINISHED' && <Badge kind="gray">Finished</Badge>}
      </div>
      <div className="fw-bold mt-2" style={{ fontSize: 15 }}>{e.title}</div>
      {e.channel ? (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <span className="pb-muted" style={{ fontSize: 12.5 }}><i className="bi bi-broadcast me-1" />{e.channel.name}</span>
          <Link to={`/watch/${e.channel.id}`} className="btn btn-pb btn-sm">{e.status === 'FINISHED' ? 'Highlights' : 'Watch'}</Link>
        </div>
      ) : (
        <div className="pb-muted mt-3" style={{ fontSize: 12.5 }}>No channel assigned yet.</div>
      )}
    </div>
  );

  return (
    <>
      <SectionTitle
        eyebrow="Sports"
        title="Live & upcoming events"
        right={
          <select className="form-select form-select-sm" style={{ width: 180 }} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {data.categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        }
      />
      {data.live.length > 0 && (
        <>
          <h5 className="fw-bold mt-2 mb-3"><span className="pb-live-dot me-2" />Live Now</h5>
          <div className="row g-3">{data.live.map((e) => <div className="col-md-6 col-xl-4" key={e.id}><Ev e={e} /></div>)}</div>
        </>
      )}
      <h5 className="fw-bold mt-4 mb-3">Upcoming</h5>
      {data.upcoming.length ? (
        <div className="row g-3">{data.upcoming.map((e) => <div className="col-md-6 col-xl-4" key={e.id}><Ev e={e} /></div>)}</div>
      ) : (
        <Empty icon="bi-calendar-event" text="No upcoming events in this category." />
      )}
      {data.finished.length > 0 && (
        <>
          <h5 className="fw-bold mt-4 mb-3 pb-muted">Recently finished</h5>
          <div className="row g-3">{data.finished.map((e) => <div className="col-md-6 col-xl-4" key={e.id}><Ev e={e} /></div>)}</div>
        </>
      )}
    </>
  );
}
