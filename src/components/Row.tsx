import { Link } from '../lib/router';
import Card from './Card';
import { trendingShows, type Show } from '../data/catalog';
import { ChevronRight } from 'lucide-react';

export default function Row({
  title,
  shows,
  numbered = false,
  seeAllTo,
  live = false,
}: {
  title: string;
  shows: Show[];
  numbered?: boolean;
  seeAllTo?: string;
  live?: boolean;
}) {
  if (!shows.length) return null;
  const ranks = new Map(trendingShows().map((s) => s.id === shows[0].id ? [s.id, s.trending] : [s.id, s.trending]));

  return (
    <section className="group/row">
      <div className="flex items-center gap-2 mb-3.5">
        {live && <span className="w-2 h-2 rounded-full bg-buzz live-dot" />}
        <h2 className="font-display text-xl md:text-2xl uppercase tracking-wide">{title}</h2>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="ml-1 flex items-center text-xs font-bold text-mute hover:text-buzz transition-colors uppercase tracking-widest"
          >
            See all <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {shows.map((s) =>
          numbered ? (
            <div key={s.id} className="flex items-end shrink-0">
              <span
                className="font-display text-[86px] leading-[0.72] pr-1 select-none bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #4a4a58 0%, #23232c 55%, #101015 100%)',
                  WebkitTextStroke: '1px rgba(255,255,255,0.14)',
                }}
                aria-hidden="true"
              >
                {ranks.get(s.id) ?? s.trending}
              </span>
              <Card show={s} className="w-[190px] md:w-[230px]" />
            </div>
          ) : (
            <Card key={s.id} show={s} />
          ),
        )}
      </div>
    </section>
  );
}
