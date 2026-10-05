import { useState } from 'react';
import { Link } from '../lib/router';
import { fmtDur, posterUrl, type Show } from '../data/catalog';
import { Play } from 'lucide-react';

const badgeStyle: Record<string, string> = {
  NEW: 'bg-volt text-white',
  LIVE: 'bg-buzz text-white',
  'TOP 10': 'bg-white/15 text-cream backdrop-blur border border-white/20',
};

export default function Card({
  show,
  className = 'w-[210px] md:w-[250px]',
}: {
  show: Show;
  className?: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  const ep = show.episodes[0];

  return (
    <Link
      to={`/watch/${show.id}`}
      className={`group relative shrink-0 rounded-xl overflow-hidden bg-card border border-white/5 hover:border-buzz/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(255,45,85,0.18)] ${className}`}
      ariaLabel={`Watch ${show.title}`}
    >
      <div
        className="relative aspect-video"
        style={{ background: `linear-gradient(135deg, ${show.gradient[0]}, ${show.gradient[1]})` }}
      >
        {imgOk && (
          <img
            src={posterUrl(show.id)}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        {show.badge && (
          <span
            className={`absolute top-2.5 left-2.5 z-10 text-[10px] font-extrabold tracking-widest uppercase px-2 py-1 rounded-md ${badgeStyle[show.badge]}`}
          >
            {show.badge === 'LIVE' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1.5 align-middle live-dot" />
            )}
            {show.badge}
          </span>
        )}

        <span className="absolute inset-0 z-10 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="grid place-items-center w-12 h-12 rounded-full bg-buzz shadow-[0_0_28px_rgba(255,45,85,0.55)] scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play size={20} className="text-white ml-0.5" fill="currentColor" />
          </span>
        </span>

        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          <h3 className="font-display text-[15px] uppercase leading-tight tracking-wide truncate">
            {show.title}
          </h3>
          <p className="text-[11px] text-cream/60 mt-0.5 font-medium">
            {show.year} ·{' '}
            {show.type === 'live' ? (
              'LIVE · 24/7'
            ) : (
              <>
                {show.genres[0]} · {ep ? fmtDur(ep.duration) : ''}
              </>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
