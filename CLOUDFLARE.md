# PLAYBEATTV on Cloudflare

This repo deploys to **Cloudflare Workers** via the official OpenNext adapter (`@opennextjs/cloudflare`).

## 1 · One-time setup

```bash
npm install
npx wrangler login          # or: export CLOUDFLARE_API_TOKEN=<token with Workers + DNS scopes>
```

## 2 · Secrets & environment

```bash
npx wrangler secret put DATABASE_URL             # postgres://… (Neon / Supabase / Hyperdrive)
npx wrangler secret put JWT_SECRET               # openssl rand -base64 48
npx wrangler secret put PAYMENTS_WEBHOOK_SECRET  # openssl rand -base64 32
npx wrangler secret put XTREAM_API_KEY           # your Xtream Masters reseller key
```

Non-secret vars (`DEPLOY_TARGET`, `XTREAM_API_URL`, `XTREAM_PORTAL_HOST`) live in `wrangler.jsonc`.

## 3 · Database

Create a Postgres (Neon free tier is fine). Initialize + seed from your machine:

```bash
DATABASE_URL="postgres://…" npx prisma db push
DATABASE_URL="postgres://…" npm run db:seed
```

Optional performance boost: create a Cloudflare **Hyperdrive** binding to the same
Postgres and set `DATABASE_URL` to the Hyperdrive connection string.

## 4 · Deploy

```bash
npm run deploy:cf             # build + deploy to *.workers.dev
```

Then attach the custom domain in the Cloudflare dashboard:
**Workers & Pages → playbeattv → Settings → Domains & Routes → Add → Custom domain → `playbeattv.buzz`** (Cloudflare creates the DNS record automatically when the zone is on your account).

## 5 · DNS records (zone: playbeattv.buzz)

| Type  | Name    | Content              | Proxy            | Purpose |
|-------|---------|----------------------|------------------|---------|
| A     | `@`     | auto (Workers custom domain) | Proxied | Website + API on Workers |
| A     | `portal`| `45.155.90.82`       | Proxied (orange) | Xtream panel custom domain (webplayer/portals) |
| CNAME | `www`   | `playbeattv.buzz`    | Proxied          | www → site |

Notes
- `portal.playbeattv.buzz → 45.155.90.82` follows the provider's custom-domain guide: after DNS propagates, open your reseller panel → **Your IPTV Domain** → enter `portal.playbeattv.buzz` → Save. Playlists/webplayer then load under your brand domain, and the platform's `XTREAM_PORTAL_HOST` must match it.
- Cloudflare proxy (orange) hides the origin IP and gives you TLS; keep SSL/TLS mode **Full**.
- The m3u/EPG links customers copy from Account → My IPTV Line are generated from `XTREAM_PORTAL_HOST`.

## 6 · Local build check

```bash
npm run build:cf     # builds the worker bundle without deploying
npm run preview:cf   # runs the worker locally via wrangler dev
```
