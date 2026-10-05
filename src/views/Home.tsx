import Billboard from '../components/Billboard';
import Ticker from '../components/Ticker';
import Row from '../components/Row';
import { Link } from '../lib/router';
import {
  CHANNELS,
  showsByChannel,
  quickHits,
  liveShows,
  trendingShows,
} from '../data/catalog';
import { Tv } from 'lucide-react';

function ChannelsStrip() {
  return (
    <section>
      <h2 className="font-display text-xl md:text-2xl uppercase tracking-wide mb-3.5">
        Channels
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CHANNELS.map((c) => {
          const count = showsByChannel(c.id).length;
          return (
            <Link
              key={c.id}
              to={`/channel/${c.id}`}
              className="group relative overflow-hidden rounded-2xl p-5 min-h-[120px] flex flex-col justify-between border border-white/8 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(130deg, ${c.gradient[0]}30, ${c.gradient[1]}12), #101015`,
              }}
            >
              <span
                className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-25 blur-2xl group-hover:opacity-45 transition-opacity"
                style={{ background: c.gradient[0] }}
              />
              <span className="grid place-items-center w-10 h-10 rounded-xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}>
                <Tv size={18} />
              </span>
              <span className="relative">
                <span className="block font-display text-base md:text-lg uppercase tracking-wide">
                  {c.name}
                </span>
                <span className="block text-xs text-mute mt-0.5 truncate">
                  {c.tagline} · {count} show{count === 1 ? '' : 's'}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const originals = showsByChannel('buzz-originals');
  const motor = showsByChannel('motor-madness');
  const toon = showsByChannel('toon-rumble');

  return (
    <>
      <Billboard />
      <Ticker />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-10 md:space-y-12 pt-8 pb-20">
        <Row title="Trending Top 10" shows={trendingShows()} numbered />
        <Row title="Buzz Originals" shows={originals} seeAllTo="/channel/buzz-originals" />
        <Row title="Motor Madness" shows={motor} seeAllTo="/channel/motor-madness" />
        <Row title="Quick Hits — Under 2 Min" shows={quickHits()} />
        <Row title="Live Right Now" shows={liveShows()} live />
        <Row title="Toon Rumble" shows={toon} seeAllTo="/channel/toon-rumble" />
        <ChannelsStrip />
      </main>
    </>
  );
}
