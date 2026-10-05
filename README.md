# PlayBeat TV Buzz

A standalone streaming portal — bold originals, live channels, trending shows. Live at [playbeattvbuzz.com](https://playbeattvbuzz.com).

This is an **independent codebase** — separate brand and product from PlayBeat Digital (playbeat.digital).

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- lucide-react icons
- History-API routing (SPA) with Vercel rewrites

## Features

- **Home** — autoplay billboard hero, live ticker, Trending Top 10 (numbered), channel rows, Quick Hits, Live Now, channels grid
- **Watch** (`/watch/:showId`) — player, episode list with instant switching, share (copy link), Up Next rail
- **Browse** (`/browse`) — genre chip filtering across all shows
- **Channels** (`/channel/:id`) — branded gradient banner + channel catalog
- **Search** — full-screen overlay (⌘K / Ctrl+K), matches shows + genres + channels
- Fully responsive (desktop → 390px), `prefers-reduced-motion` respected

## Develop

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve dist with SPA fallback
```

## Deploy

Vercel-ready: `vercel.json` rewrites all routes to `index.html` for the SPA router.
