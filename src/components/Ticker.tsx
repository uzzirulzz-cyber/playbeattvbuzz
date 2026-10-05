const ITEMS = [
  'LIVE NOW — The Buzz Stream 24/7',
  'NEW EPISODE — Big Buck Nights S1',
  'TOP 10 — Sintel: Dragon\u2019s Call',
  'MOTOR MADNESS — Full Throttle Diaries',
  'NEW — Bigger Everything: 5 quick hits',
  'TRENDING — Steel Horizon remastered',
  'GRAND OR SCAM? — The Grand Challenge',
];

export default function Ticker() {
  const strip = (key: string) => (
    <div key={key} className="flex items-center shrink-0" aria-hidden={key === 'b'}>
      {ITEMS.map((t, i) => (
        <span key={i} className="flex items-center gap-3 px-6 text-[11px] font-bold tracking-[0.18em] uppercase text-cream/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-buzz live-dot" />
          {t}
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative z-10 border-y border-white/5 bg-surface/80 backdrop-blur overflow-hidden">
      <div className="marquee-track flex w-max py-2.5">
        {strip('a')}
        {strip('b')}
      </div>
    </div>
  );
}
