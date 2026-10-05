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

/* All sources verified reachable (HTTP 206 range support) */
const W3 = 'https://media.w3.org/2010/05';
const TV = 'https://test-videos.co.uk/vids';
const MDN = 'https://mdn.github.io/shared-assets/videos';

const VID = {
  sintelTrailer: `${W3}/sintel/trailer.mp4`, // 52s
  bunnyMovie: `${W3}/bunny/movie.mp4`, // 9m56s full movie
  bunnyTrailer: `${W3}/bunny/trailer.mp4`, // 33s
  shortFilm: `${W3}/video/movie_300.mp4`, // 5m00s
  bbb10: `${TV}/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4`, // 10s
  jelly10: `${TV}/jellyfish/mp4/h264/720/Jellyfish_720_10s_5MB.mp4`, // 10s
  sintel10: `${TV}/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4`, // 10s
  flower: `${MDN}/flower.mp4`, // 5s
  friday: `${MDN}/friday.mp4`, // 6s
};

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
        id: 'sintel-trailer',
        title: 'Official Trailer',
        duration: 52,
        synopsis: 'The official trailer — full feature premiering soon on Buzz Originals.',
        videoUrl: VID.sintelTrailer,
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
      'A city of steel, decades from now. When the machines wake, one crew has five minutes to rewrite the future.',
    badge: 'TOP 10',
    trending: 2,
    gradient: ['#3ddc97', '#0b2b26'],
    episodes: [
      {
        id: 'steel-short',
        title: 'Steel Horizon — Full Short',
        duration: 300,
        synopsis: 'The complete five-minute short, remastered for Cinema Vault.',
        videoUrl: VID.shortFilm,
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
      'Engines, egos and open roads. The crew chases the loudest machines and the drivers who love them.',
    badge: 'TOP 10',
    trending: 3,
    gradient: ['#ff2d55', '#3a0d14'],
    episodes: [
      {
        id: 'ft-e1',
        title: 'Ignition',
        season: 1,
        number: 1,
        duration: 33,
        synopsis: 'The season teaser — a thousand miles of adrenaline start here.',
        videoUrl: VID.bunnyTrailer,
      },
      {
        id: 'ft-e2',
        title: 'Nitro Nights',
        season: 1,
        number: 2,
        duration: 10,
        synopsis: 'Ten seconds of pure nitro under the city lights.',
        videoUrl: VID.jelly10,
      },
      {
        id: 'ft-e3',
        title: 'Redline',
        season: 1,
        number: 3,
        duration: 10,
        synopsis: 'Pushing it past redline — and holding it there.',
        videoUrl: VID.bbb10,
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
        title: 'Bloom',
        season: 1,
        number: 1,
        duration: 5,
        synopsis: 'Five seconds. Everything is bigger.',
        videoUrl: VID.flower,
      },
      {
        id: 'be-e2',
        title: 'Friday',
        season: 1,
        number: 2,
        duration: 6,
        synopsis: 'The shortest day of the week feels like this.',
        videoUrl: VID.friday,
      },
      {
        id: 'be-e3',
        title: 'Fun Size',
        season: 1,
        number: 3,
        duration: 10,
        synopsis: 'Ten seconds of pure, unfiltered fun.',
        videoUrl: VID.bbb10,
      },
      {
        id: 'be-e4',
        title: 'Deep End',
        season: 1,
        number: 4,
        duration: 10,
        synopsis: 'Ten seconds underwater. Hold your breath.',
        videoUrl: VID.jelly10,
      },
      {
        id: 'be-e5',
        title: 'Dragon Eyes',
        season: 1,
        number: 5,
        duration: 10,
        synopsis: 'A ten-second glimpse of the dragon.',
        videoUrl: VID.sintel10,
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
        title: 'Payback — Full Movie',
        season: 1,
        number: 1,
        duration: 596,
        synopsis: 'Three bullies, one rabbit, and a very long memory. The full animated movie.',
        videoUrl: VID.bunnyMovie,
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
        duration: 33,
        synopsis: 'What can a single grand actually buy you? The answer hurts.',
        videoUrl: VID.bunnyTrailer,
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
        duration: 10,
        synopsis: 'Broadcasting now — the feed loops live, 24/7.',
        videoUrl: VID.jelly10,
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
        title: 'Friday Ride',
        season: 1,
        number: 1,
        duration: 6,
        synopsis: 'The city is the playground.',
        videoUrl: VID.friday,
      },
      {
        id: 'jc-e2',
        title: 'Bloom Zoom',
        season: 1,
        number: 2,
        duration: 5,
        synopsis: 'Five seconds of rooftop chaos.',
        videoUrl: VID.flower,
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
        title: 'Dream Sequence',
        duration: 52,
        synopsis: 'A surreal journey in under a minute.',
        videoUrl: VID.sintelTrailer,
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
