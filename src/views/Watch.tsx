import { useEffect, useRef, useState } from 'react';
import { Link } from '../lib/router';
import Card from '../components/Card';
import {
  fmtDur,
  getShow,
  posterUrl,
  showsByChannel,
  type Episode,
} from '../data/catalog';
import { Check, Play, Share2 } from 'lucide-react';

function EpisodeRow({
  show,
  ep,
  active,
  onPick,
}: {
  show: ReturnType<typeof getShow>;
  ep: Episode;
  active: boolean;
  onPick: () => void;
}) {
  if (!show) return null;
  return (
    <button
      onClick={onPick}
      className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all ${
        active
          ? 'border-buzz/60 bg-buzz/10'
          : 'border-white/8 bg-card hover:border-white/25'
      }`}
    >
      <span
        className="relative w-24 md:w-32 aspect-video rounded-lg overflow-hidden shrink-0 grid place-items-center"
        style={{
          background: `linear-gradient(135deg, ${show.gradient[0]}, ${show.gradient[1]})`,
        }}
      >
        {active && (
          <span className="grid place-items-center w-8 h-8 rounded-full bg-buzz">
            <Play size={14} className="text-white ml-0.5" fill="currentColor" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          {ep.season !== undefined && (
            <span className="text-[11px] font-extrabold text-mute tracking-widest">
              S{ep.season}:E{ep.number}
            </span>
          )}
          <span className="font-bold text-sm truncate">{ep.title}</span>
        </span>
        <span className="block text-xs text-mute mt-1 line-clamp-2">{ep.synopsis}</span>
      </span>
      <span className="text-xs font-semibold text-mute shrink-0">{fmtDur(ep.duration)}</span>
    </button>
  );
}

export default function Watch({ id }: { id: string }) {
  const show = getShow(id);
  const [ep, setEp] = useState<Episode | undefined>(show?.episodes[0]);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setEp(show?.episodes[0]);
  }, [show]);

  // attempt autoplay; browsers may block with sound — fall back to poster + controls
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [ep?.id]);

  if (!show || !ep) {
    return (
      <main className="pt-32 pb-24 text-center">
        <h1 className="font-display text-4xl uppercase">Show not found</h1>
        <p className="text-mute mt-3 mb-6">This one buzzed off.</p>
        <Link to="/" className="inline-flex h-11 items-center rounded-full bg-buzz px-6 font-bold">
          Back home
        </Link>
      </main>
    );
  }

  const channel = showsByChannel(show.channelId).filter((s) => s.id !== show.id);
  const multiEp = show.episodes.length > 1;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main className="pb-20">
      {/* player */}
      <div className="bg-black">
        <video
          ref={videoRef}
          key={ep.id}
          className="mx-auto w-full max-h-[76vh] aspect-video bg-black"
          src={ep.videoUrl}
          poster={posterUrl(show.id, 1280, 720)}
          controls
          autoPlay
          playsInline
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px] mt-8">
          {/* main column */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {show.badge && (
                <span className="text-[10px] font-extrabold tracking-widest uppercase bg-buzz text-white px-2 py-1 rounded-md">
                  {show.badge}
                </span>
              )}
              <span className="text-[10px] font-extrabold tracking-widest uppercase bg-white/10 border border-white/15 px-2 py-1 rounded-md">
                {show.ageRating}
              </span>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-mute">
                {show.type === 'live' ? 'Live channel' : show.type}
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl uppercase tracking-wide leading-none">
              {show.title}
            </h1>
            <p className="mt-2.5 text-sm font-semibold text-cream/70">
              {show.year} · {show.genres.join(' / ')} ·{' '}
              {show.type === 'live' ? 'Streaming 24/7' : `${fmtDur(ep.duration)}`}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  const first = show.episodes[0];
                  if (first) {
                    setEp(first);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-2 h-11 px-6 rounded-full bg-buzz hover:bg-buzzhot font-bold text-sm transition-colors shadow-[0_0_24px_rgba(255,45,85,0.4)]"
              >
                <Play size={16} fill="currentColor" /> {multiEp ? 'Play S1:E1' : 'Play'}
              </button>
              <button
                onClick={share}
                className="flex items-center gap-2 h-11 px-5 rounded-full bg-white/8 border border-white/12 hover:bg-white/15 font-bold text-sm transition-colors"
              >
                {copied ? <Check size={16} className="text-[#3ddc97]" /> : <Share2 size={16} />}
                {copied ? 'Link copied' : 'Share'}
              </button>
            </div>

            <p className="mt-6 text-[15px] leading-relaxed text-cream/85">{show.synopsis}</p>

            {multiEp && (
              <div className="mt-9">
                <h2 className="font-display text-xl uppercase tracking-wide mb-4">Episodes</h2>
                <div className="space-y-2.5">
                  {show.episodes.map((e) => (
                    <EpisodeRow
                      key={e.id}
                      show={show}
                      ep={e}
                      active={e.id === ep.id}
                      onPick={() => {
                        setEp(e);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* side column */}
          <aside>
            <h2 className="font-display text-lg uppercase tracking-wide mb-4">Up Next</h2>
            <div className="flex lg:flex-col gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
              {channel.map((s) => (
                <Card key={s.id} show={s} className="w-[200px] lg:w-full" />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
