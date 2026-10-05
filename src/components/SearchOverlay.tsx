import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { CHANNELS, SHOWS } from '../data/catalog';
import { Search, X, Tv } from 'lucide-react';

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const query = q.trim().toLowerCase();

  const shows = useMemo(
    () =>
      query
        ? SHOWS.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.genres.some((g) => g.toLowerCase().includes(query)),
          )
        : [],
    [query],
  );
  const channels = useMemo(
    () =>
      query
        ? CHANNELS.filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              c.tagline.toLowerCase().includes(query),
          )
        : [],
    [query],
  );

  return (
    <div className="fixed inset-0 z-50 bg-ink/92 backdrop-blur-xl overflow-y-auto" role="dialog" aria-modal="true">
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 grid place-items-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-colors"
          aria-label="Close search"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 h-14 px-5 rounded-2xl bg-surface border border-white/10 focus-within:border-buzz/60 transition-colors">
          <Search size={20} className="text-mute shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shows, genres, channels…"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-mute/60"
          />
        </div>

        {!query && (
          <p className="mt-14 text-center text-mute text-sm">
            Try “fantasy”, “motor”, “live” — or press Esc to close.
          </p>
        )}

        {query && shows.length === 0 && channels.length === 0 && (
          <p className="mt-14 text-center text-mute text-sm">
            Nothing buzzing for “{q}”. Try another word.
          </p>
        )}

        {shows.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-mute mb-3">
              Shows
            </h3>
            <div className="space-y-1.5">
              {shows.map((s) => (
                <Link
                  key={s.id}
                  to={`/watch/${s.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span
                    className="w-16 h-10 rounded-lg shrink-0 border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm truncate">{s.title}</span>
                    <span className="block text-xs text-mute">
                      {s.year} · {s.genres.join(', ')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {channels.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-mute mb-3">
              Channels
            </h3>
            <div className="space-y-1.5">
              {channels.map((c) => (
                <Link
                  key={c.id}
                  to={`/channel/${c.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span
                    className="grid place-items-center w-10 h-10 rounded-xl shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
                    }}
                  >
                    <Tv size={17} className="text-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm truncate">{c.name}</span>
                    <span className="block text-xs text-mute truncate">{c.tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
