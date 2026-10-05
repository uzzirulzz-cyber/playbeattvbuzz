import { useRef, useState } from 'react';
import { Link } from '../lib/router';
import { featuredShow, fmtDur, posterUrl } from '../data/catalog';
import { Info, Play, Volume2, VolumeX } from 'lucide-react';

export default function Billboard() {
  const show = featuredShow();
  const ep = show.episodes[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [videoOk, setVideoOk] = useState(true);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section className="relative h-[88vh] min-h-[560px] -mt-16">
      {/* backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${show.gradient[0]}55, ${show.gradient[1]})` }}
      />
      {videoOk ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={ep.videoUrl}
          poster={posterUrl(show.id, 1600, 900)}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoOk(false)}
        />
      ) : (
        <img
          src={posterUrl(show.id, 1600, 900)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />

      {/* content */}
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col justify-end pb-[9vh]">
        <div className="fade-up max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-extrabold tracking-[0.22em] uppercase bg-volt text-white px-2.5 py-1 rounded-md">
              Buzz Original
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.22em] uppercase bg-white/10 border border-white/15 backdrop-blur px-2.5 py-1 rounded-md">
              {show.ageRating}
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl xl:text-8xl uppercase leading-[0.95] tracking-wide">
            {show.title}
          </h1>
          <p className="mt-3 text-sm md:text-[15px] font-semibold text-cream/70">
            {show.year} · {show.genres.join(' / ')} · {fmtDur(ep.duration)} · HD
          </p>
          <p className="mt-4 text-sm md:text-base text-mute leading-relaxed max-w-xl line-clamp-3">
            {show.synopsis}
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Link
              to={`/watch/${show.id}`}
              className="flex items-center gap-2.5 h-12 px-7 rounded-full bg-buzz hover:bg-buzzhot text-white font-bold transition-all shadow-[0_0_34px_rgba(255,45,85,0.5)] hover:shadow-[0_0_44px_rgba(255,45,85,0.65)]"
            >
              <Play size={19} fill="currentColor" /> Play
            </Link>
            <Link
              to={`/watch/${show.id}`}
              className="flex items-center gap-2.5 h-12 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur font-bold transition-colors"
            >
              <Info size={19} /> More Info
            </Link>
          </div>
        </div>
      </div>

      {/* mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute z-10 bottom-[9vh] right-4 md:right-8 grid place-items-center w-11 h-11 rounded-full border border-white/25 bg-ink/40 backdrop-blur hover:bg-ink/70 transition-colors"
        aria-label={muted ? 'Unmute preview' : 'Mute preview'}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </section>
  );
}
