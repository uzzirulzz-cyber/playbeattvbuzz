import { Link } from '../lib/router';
import Card from '../components/Card';
import { getChannel, showsByChannel } from '../data/catalog';
import { Play } from 'lucide-react';

export default function ChannelView({ id }: { id: string }) {
  const channel = getChannel(id);
  const shows = channel ? showsByChannel(channel.id) : [];

  if (!channel) {
    return (
      <main className="pt-32 pb-24 text-center">
        <h1 className="font-display text-4xl uppercase">Channel not found</h1>
        <p className="text-mute mt-3 mb-6">That frequency is off air.</p>
        <Link to="/browse" className="inline-flex h-11 items-center rounded-full bg-buzz px-6 font-bold">
          Browse shows
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-20">
      {/* channel banner */}
      <section
        className="relative pt-28 pb-10 px-4 md:px-8 overflow-hidden"
        style={{
          background: `linear-gradient(140deg, ${channel.gradient[0]}45, ${channel.gradient[1]}18), #0c0c11`,
        }}
      >
        <span
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: channel.gradient[0] }}
        />
        <div className="relative max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <span
              className="grid place-items-center w-14 h-14 rounded-2xl shadow-xl md:w-16 md:h-16"
              style={{
                background: `linear-gradient(135deg, ${channel.gradient[0]}, ${channel.gradient[1]})`,
              }}
            >
              <Play size={26} className="text-white ml-0.5" fill="currentColor" />
            </span>
            <div>
              <p className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-mute">
                Channel
              </p>
              <h1 className="font-display text-3xl md:text-5xl uppercase tracking-wide leading-none">
                {channel.name}
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm md:text-base text-cream/75 max-w-xl">{channel.tagline}</p>
          <p className="mt-1.5 text-xs font-bold tracking-widest uppercase text-mute">
            {shows.length} show{shows.length === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {shows.map((s) => (
            <Card key={s.id} show={s} className="w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
