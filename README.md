# SkinSignal – Inventory Trader

A publish‑ready Next.js 14 app matching the spec: CSFloat‑only pricing lane, Steam inventory ingestion, snapshot storage, analytics (history, movers, allocation), Smart Sale recommendations, alerts with SMS phone verification, cron, and a clean Tailwind UI.

## Quickstart (Local)

```bash
pnpm i     # or npm i / yarn
cp .env.example .env
# Fill DATABASE_URL and CSFLOAT_API_KEY (Twilio optional)
pnpm dev
# In browser: visit /api/admin/migrate once (creates tables)
```

Paste a public **SteamID64** on the homepage → **Snapshot Now**.

## Deploy to Vercel

1. Push to GitHub → Import project in Vercel.
2. Set **Environment Variables**:
   - `DATABASE_URL` (required)
   - `CSFLOAT_API_KEY` (required)
   - `NEXT_PUBLIC_SITE_URL` (optional)
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (optional; for real SMS)
3. Deploy, then visit `/api/admin/migrate` once on the deployed URL.
4. Snapshot your inventory.

A daily cron is declared in `vercel.json` at **09:00 UTC** calling `/api/cron/daily`.

## Features

- **Steam Inventory** (public) → per‑item quantity aggregation
- **CSFloat**: market baseline (median of clean listings), best‑ask market, sticker % if present
- **Snapshots** stored in Postgres with per‑item details
- **Dashboard UI**: total, history chart (Recharts), allocation pie, top movers
- **Smart Sale**: sale score (momentum/trend/liquidity/ladder), undercut #2 suggestion
- **Alerts**: price ≤ rules; cooldown; SMS via Twilio (with dev fallback test codes)
- **Phone OTP**: `/api/user/phone/start`, `/api/user/phone/verify`
- **Health**: `/api/health`, **robots**: `/robots.txt`
- **Safety**: env checks, 60s per‑user snapshot rate limit, CSFloat in‑memory cache

## Notes & Guardrails

- Only **CSFloat** prices are used. No Steam/3rd‑party price comparisons.
- Secrets (DB, CSFloat, Twilio) are **server‑side only**.
- Partial failures don’t block snapshots—items fall back to zeros/nulls when necessary.
- Database schema is idempotent via `/api/admin/migrate`.

## Roadmap (post‑MVP)

- Steam OpenID sign‑in
- Watchlist for non‑owned items
- Email/Discord notifications
- Per‑asset float via inspect links
- P/L with buy price entries (realized/unrealized)
