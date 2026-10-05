import { useMemo, useState } from 'react';
import Card from '../components/Card';
import { allGenres, SHOWS } from '../data/catalog';

export default function Browse() {
  const genres = useMemo(() => ['All', ...allGenres()], []);
  const [genre, setGenre] = useState('All');

  const shows = genre === 'All' ? SHOWS : SHOWS.filter((s) => s.genres.includes(genre));

  return (
    <main className="max-w-[1400px] mx-auto px-4 md:px-8 pt-28 pb-20">
      <h1 className="font-display text-4xl md:text-5xl uppercase tracking-wide">Browse</h1>
      <p className="mt-2 text-mute text-sm">
        {shows.length} show{shows.length === 1 ? '' : 's'} streaming on PlayBeat TV Buzz.
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-bold transition-all ${
              genre === g
                ? 'bg-buzz text-white shadow-[0_0_20px_rgba(255,45,85,0.4)]'
                : 'bg-white/5 border border-white/10 text-mute hover:text-cream hover:border-white/25'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {shows.map((s) => (
          <Card key={s.id} show={s} className="w-full" />
        ))}
      </div>

      {shows.length === 0 && (
        <p className="mt-16 text-center text-mute">Nothing in this genre yet.</p>
      )}
    </main>
  );
}
