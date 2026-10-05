# PLAYBEATTV — IPTV Subscription Platform

**Your Gateway to Premium Digital Entertainment** · playbeattv.buzz

A complete, production-structured IPTV SaaS/e-commerce platform: public storefront, customer portal, subscription billing engine and a 29-module admin console — all on one data model.

> ⚠️ **Content policy:** the demo catalog uses only public vendor test streams (Mux / Apple / Unified Streaming), clearly labeled. No pirated or unauthorized streams. Replace sources in **Admin → Channels** with your licensed provider feeds before commercial launch.

## Stack

- **Next.js 16** (App Router, API route handlers = REST surface) + TypeScript
- **Bootstrap 5.3** + custom premium dark theme (glass panels, electric blue `#2e90fa` + gold `#f5b301`)
- **Prisma ORM** — normalized schema (30 models), PostgreSQL in production (SQLite for local dev)
- **hls.js** HLS playback, **jose** JWT (httpOnly cookies), **bcryptjs** hashing, HMAC-verified payment webhooks
- Vercel-ready

## Structure

```
src/app/            Next.js app router (page shell + /api/* REST endpoints)
src/app/api/        auth · channels · play/* · movies · series · sports · plans · epg
                    coupons · orders · payments/webhook · favorites · history · devices
                    support · notifications · contact · cms · admin/* (29 modules)
src/pbtv/           SPA frontend (hash router): public site, customer portal, admin console
prisma/             normalized schema (30 models: users, roles, channels, epg, plans,
                    subscriptions, orders, payments, invoices, devices, tickets, audit…)
scripts/seed.ts     demo catalog + accounts (admin/staff/customer)
```

## Deploy (Vercel + Neon/Supabase)

1. **Create a PostgreSQL database** (e.g. [Neon](https://neon.tech) free tier) and copy the connection string.
2. In Vercel → Project → Settings → Environment Variables add:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `JWT_SECRET` = long random string (`openssl rand -base64 48`)
   - `PAYMENTS_WEBHOOK_SECRET` = random string (`openssl rand -base64 32`)
3. Initialize + seed the database from your machine (point at the same `DATABASE_URL`):
   ```bash
   npm install
   npx prisma db push
   npx tsx scripts/seed.ts
   ```
4. Redeploy. Until the DB is attached the site renders in **setup mode** with a banner; the full platform activates the moment the database responds.

**Default accounts (after seeding):** admin@playbeattv.buzz / Admin@2026! · staff@playbeattv.buzz / Staff@2026! · customer@playbeattv.buzz / Customer@2026!

## Platform capabilities

- **Public site:** Home, Live TV browser (category/country/language/HD-4K filters), channel player (HLS, EPG now/next + schedule, favorites, report-a-problem), Movies, Series (seasons/episodes), Sports dashboard, DB-driven Pricing, Devices, FAQ, Contact
- **Commerce:** plan → cart → checkout (card/PayPal/manual), sandbox gateway with decline simulation, coupon engine (percent/fixed, min amount, per-customer + global limits, plan-restricted, expiry), invoices, refunds
- **Customer portal:** dashboard, subscription (auto-renew toggle, cancel), device management with plan limits, watch history, favorites, orders, invoices, support threads, profile, password change (revokes sessions)
- **Admin console:** live KPIs + analytics (revenue/orders/subs/customers trends, device usage, popular channels, conversion), website builder (hero/stats/banners/FAQ/SEO/footers — no code), full CRUD over channels/categories/EPG (XMLTV import + sync logs)/movies/series/sports/plans/coupons, orders + status flows (refund ⇒ cancels subscription + voids invoice), subscriptions (extend/suspend), customers (suspend/activate/one-time password reset), payments, invoices, devices, support desk (internal notes, assignment), notifications (broadcast/targeted), email templates, content providers, streaming sources (credential **references** only), API integrations (masked secrets), users & roles, security center (session revocation, 2FA flag), audit logs
- **Security:** RBAC (SUPERADMIN/ADMIN/STAFF/CUSTOMER), admin route guards, bcrypt, JWT + tokenVersion revocation, login lockout, rate limiting, audit logging on every mutation, HMAC webhook verification, no raw card storage, stream URLs never exposed to the browser (playback authorization endpoint checks entitlement + device limits)

## 24-point verification (performed on build)

Registration · Login · Admin authorization · Customer dashboard · DB-loaded plans · Cart/Checkout · Subscription creation · Channel catalog · Authorized playback · EPG · Movies · Series · Sports · Device management · Support tickets · Coupons · Admin CRUD · Analytics · Responsive (360–430px, tablet, desktop, Smart TV ≥1600px) · Admin route protection · Secrets never in frontend · No unauthorized streams · No dead buttons
