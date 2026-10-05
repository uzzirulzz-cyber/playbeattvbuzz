export type Episode = {
  id: string;
  title: string;
  season?: number;
  number?: number;
  duration: number; // seconds
  synopsis: string;
  videoUrl: string;
};

export type Show = {
  id: string;
  title: string;
  channelId: string;
  type: 'series' | 'film' | 'live' | 'clips';
  year: number;
  ageRating: 'PG' | '13+' | '16+';
  genres: string[];
  synopsis: string;
  badge?: 'NEW' | 'LIVE' | 'TOP 10';
  trending: number;
  featured?: boolean;
  gradient: [string, string];
  episodes: Episode[];
};

export type Channel = {
  id: string;
  name: string;
  tagline: string;
  gradient: [string, string];
};

const V = (name: string) =>
  `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

export const CHANNELS: Channel[] = [
  {
    id: 'buzz-originals',
    name: 'Buzz Originals',
    tagline: 'Flagship films you can only see here.',
    gradient: ['#7c5cff', '#ff2d55'],
  },
  {
    id: 'motor-madness',
    name: 'Motor Madness',
    tagline: 'Petrol, dirt and full-throttle stories.',
    gradient: ['#ff2d55', '#ff8a00'],
  },
  {
    id: 'toon-rumble',
    name: 'Toon Rumble',
    tagline: 'Animation with attitude.',
    gradient: ['#00d4ff', '#7c5cff'],
  },
  {
    id: 'adrenaline-shorts',
    name: 'Adrenaline Shorts',
    tagline: 'Quick hits. Zero chill.',
    gradient: ['#ff8a00', '#ff2d55'],
  },
  {
    id: 'buzz-live',
    name: 'Buzz Live 24/7',
    tagline: 'The stream that never sleeps.',
    gradient: ['#ff2d55', '#b3001b'],
  },
  {
    id: 'cinema-vault',
    name: 'Cinema Vault',
    tagline: 'Cult classics, remastered.',
    gradient: ['#3ddc97', '#00796b'],
  },
];

export const SHOWS: Show[] = [
  {
    id: 'sintel-dragons-call',
    title: "Sintel: Dragon's Call",
    channelId: 'buzz-originals',
    type: 'film',
    year: 2024,
    ageRating: '16+',
    genres: ['Fantasy', 'Adventure'],
    synopsis:
      'A lone warrior crosses a dying world to repay a debt no one asked her to keep. Every mile costs her something — and the truth at the end of the road costs everything.',
    badge: 'TOP 10',
    trending: 1,
    featured: true,
    gradient: ['#7c5cff', '#1b1030'],
    episodes: [
      {
        id: 'sintel-feature',
        title: "Sintel: Dragon's Call",
        duration: 888,
        synopsis: 'The full feature. One warrior, one promise, one dragon.',
        videoUrl: V('Sintel'),
      },
    ],
  },
  {
    id: 'steel-horizon',
    title: 'Steel Horizon',
    channelId: 'cinema-vault',
    type: 'film',
    year: 2023,
    ageRating: '13+',
    genres: ['Sci-Fi', 'Action'],
    synopsis:
      'Amsterdam, decades from now. A squad of soldiers must rewrite time itself before the machines finish what the future started.',
    badge: 'TOP 10',
    trending: 2,
    gradient: ['#3ddc97', '#0b2b26'],
    episodes: [
      {
        id: 'steel-feature',
        title: 'Steel Horizon',
        duration: 734,
        synopsis: 'The remastered cult feature, streaming in full.',
        videoUrl: V('TearsOfSteel'),
      },
    ],
  },
  {
    id: 'full-throttle-diaries',
    title: 'Full Throttle Diaries',
    channelId: 'motor-madness',
    type: 'series',
    year: 2025,
    ageRating: '13+',
    genres: ['Automotive', 'Reality'],
    synopsis:
      'Engines, egos and open roads. The crew chases the loudest machines and the drivers who love them — from rally dirt to city asphalt.',
    badge: 'TOP 10',
    trending: 3,
    gradient: ['#ff2d55', '#3a0d14'],
    episodes: [
      {
        id: 'ft-e1',
        title: 'Ignition',
        season: 1,
        number: 1,
        duration: 47,
        synopsis: 'The Bullrun kickoff — a thousand miles of adrenaline start here.',
        videoUrl: V('WeAreGoingOnBullrun'),
      },
      {
        id: 'ft-e2',
        title: 'Street & Dirt',
        season: 1,
        number: 2,
        duration: 594,
        synopsis: 'The Subaru Outback proves it belongs on both asphalt and gravel.',
        videoUrl: V('SubaruOutbackOnStreetAndDirt'),
      },
      {
        id: 'ft-e3',
        title: 'Hot Lap',
        season: 1,
        number: 3,
        duration: 253,
        synopsis: 'The VW GTI gets pushed to its limit — and then a little further.',
        videoUrl: V('VolkswagenGTIReview'),
      },
    ],
  },
  {
    id: 'bigger-everything',
    title: 'Bigger Everything',
    channelId: 'adrenaline-shorts',
    type: 'clips',
    year: 2025,
    ageRating: '13+',
    genres: ['Action', 'Quips'],
    synopsis:
      'Five micro-bursts of chaos. Bigger blazes, bigger escapes, bigger fun — each one over before you can blink.',
    badge: 'NEW',
    trending: 4,
    gradient: ['#ff8a00', '#3a1d00'],
    episodes: [
      {
        id: 'be-e1',
        title: 'Blazes',
        season: 1,
        number: 1,
        duration: 15,
        synopsis: 'Everything is bigger. Especially the fire.',
        videoUrl: V('ForBiggerBlazes'),
      },
      {
        id: 'be-e2',
        title: 'Escapes',
        season: 1,
        number: 2,
        duration: 15,
        synopsis: 'Out the window, over the roof, gone.',
        videoUrl: V('ForBiggerEscapes'),
      },
      {
        id: 'be-e3',
        title: 'Fun',
        season: 1,
        number: 3,
        duration: 60,
        synopsis: 'A full minute of pure, unfiltered fun.',
        videoUrl: V('ForBiggerFun'),
      },
      {
        id: 'be-e4',
        title: 'Joyrides',
        season: 1,
        number: 4,
        duration: 15,
        synopsis: 'Buckle up. This ride does not slow down.',
        videoUrl: V('ForBiggerJoyrides'),
      },
      {
        id: 'be-e5',
        title: 'Meltdowns',
        season: 1,
        number: 5,
        duration: 15,
        synopsis: 'When everything goes wrong in the best way.',
        videoUrl: V('ForBiggerMeltdowns'),
      },
    ],
  },
  {
    id: 'big-buck-nights',
    title: 'Big Buck Nights',
    channelId: 'toon-rumble',
    type: 'series',
    year: 2025,
    ageRating: 'PG',
    genres: ['Animation', 'Comedy'],
    synopsis:
      'A gentle giant with zero patience for bullies. When the forest picks a fight, Buck finishes it — with style.',
    badge: 'NEW',
    trending: 5,
    gradient: ['#00d4ff', '#062a33'],
    episodes: [
      {
        id: 'bbn-e1',
        title: 'Payback',
        season: 1,
        number: 1,
        duration: 596,
        synopsis: 'Three bullies, one rabbit, and a very long memory.',
        videoUrl: V('BigBuckBunny'),
      },
    ],
  },
  {
    id: 'grand-or-scam',
    title: 'Grand or Scam?',
    channelId: 'motor-madness',
    type: 'series',
    year: 2024,
    ageRating: '13+',
    genres: ['Automotive', 'Comedy'],
    synopsis:
      'A thousand dollars, four wheels and infinite optimism. Every episode asks the same question: bargain or bucket of bolts?',
    trending: 6,
    gradient: ['#ffd166', '#33270a'],
    episodes: [
      {
        id: 'gos-e1',
        title: 'The Grand Challenge',
        season: 1,
        number: 1,
        duration: 564,
        synopsis: 'What can a single grand actually buy you? The answer hurts.',
        videoUrl: V('WhatCarCanYouGetForAGrand'),
      },
    ],
  },
  {
    id: 'the-buzz-stream',
    title: 'The Buzz Stream',
    channelId: 'buzz-live',
    type: 'live',
    year: 2026,
    ageRating: 'PG',
    genres: ['Live', 'Talk'],
    synopsis:
      'The 24/7 pulse of PlayBeat TV. Hot takes, premieres and surprises streaming around the clock — jump in anytime.',
    badge: 'LIVE',
    trending: 7,
    gradient: ['#ff2d55', '#4a0714'],
    episodes: [
      {
        id: 'buzz-live-feed',
        title: 'Live Feed',
        duration: 15,
        synopsis: 'Broadcasting now — the feed loops live, 24/7.',
        videoUrl: V('ForBiggerBlazes'),
      },
    ],
  },
  {
    id: 'joyride-city',
    title: 'Joyride City',
    channelId: 'adrenaline-shorts',
    type: 'clips',
    year: 2025,
    ageRating: '13+',
    genres: ['Urban', 'Action'],
    synopsis:
      'Rooftops, backstreets and engines that never learned to whisper. Short urban rides with maximum attitude.',
    trending: 8,
    gradient: ['#7c5cff', '#160b33'],
    episodes: [
      {
        id: 'jc-e1',
        title: 'Joyrides',
        season: 1,
        number: 1,
        duration: 15,
        synopsis: 'The city is the playground.',
        videoUrl: V('ForBiggerJoyrides'),
      },
      {
        id: 'jc-e2',
        title: 'Fun Size',
        season: 1,
        number: 2,
        duration: 60,
        synopsis: 'Sixty seconds of rooftop chaos.',
        videoUrl: V('ForBiggerFun'),
      },
    ],
  },
  {
    id: 'dreamwire',
    title: 'Dreamwire',
    channelId: 'toon-rumble',
    type: 'film',
    year: 2022,
    ageRating: 'PG',
    genres: ['Animation', 'Surreal'],
    synopsis:
      'Two souls wake inside a machine that dreams. To leave, they must walk straight through its imagination.',
    trending: 9,
    gradient: ['#00d4ff', '#0b1233'],
    episodes: [
      {
        id: 'dw-feature',
        title: 'Dreamwire',
        duration: 653,
        synopsis: 'The surreal animated feature, in full.',
        videoUrl: V('ElephantsDream'),
      },
    ],
  },
];

/* ---------- helpers ---------- */

export const featuredShow = (): Show => SHOWS.find((s) => s.featured) ?? SHOWS[0];

export const getShow = (id: string): Show | undefined =>
  SHOWS.find((s) => s.id === id);

export const getChannel = (id: string): Channel | undefined =>
  CHANNELS.find((c) => c.id === id);

export const showsByChannel = (channelId: string): Show[] =>
  SHOWS.filter((s) => s.channelId === channelId);

export const trendingShows = (): Show[] =>
  [...SHOWS].sort((a, b) => a.trending - b.trending);

export const quickHits = (): Show[] =>
  SHOWS.filter((s) => s.type === 'clips' || s.episodes.every((e) => e.duration < 90));

export const liveShows = (): Show[] => SHOWS.filter((s) => s.type === 'live');

export const allGenres = (): string[] =>
  [...new Set(SHOWS.flatMap((s) => s.genres))].sort();

export const posterUrl = (seed: string, w = 480, h = 270) =>
  `https://picsum.photos/seed/pbtv-${seed}/${w}/${h}`;

export function fmtDur(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}
