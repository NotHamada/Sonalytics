# Sonalytics

A personal Spotify listening analytics app — full-history dashboard, listening-pattern insights,
a statistical deep-analysis layer, monthly/yearly "Wrapped" style reports with a shareable card,
and per-track/per-artist detail pages with an embedded player.

Built with Next.js (App Router), using the Authorization Code flow with tokens kept server-side.

## Features

- **History** (`/history`) — full listening history, top artists/tracks, full-text search over
  everything you've ever played.
- **Insights** (`/insights`) — time-of-day and day-of-week listening patterns, a heatmap, and a
  day-part breakdown.
- **Deep Analysis** (`/analysis`) — taste diversity score, discovery-vs-loyalty cohorts, genre
  pairings, popularity/era correlation, and other statistical trends.
- **Reports** (`/reports`) — a Spotify-Wrapped-style monthly or yearly recap (top artists, tracks,
  genres) with a downloadable, themeable Instagram Story card.
- **Track & artist pages** (`/track/[id]`, `/artist/[name]`) — per-item stats plus an embedded
  Spotify player.
- **Import** (`/import`) — load your Extended Streaming History for real multi-year stats (the
  live Spotify API only exposes your last 50 plays).

## Setup

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In the app's Settings, add this Redirect URI exactly: `http://127.0.0.1:3000/api/auth/callback`
   (Spotify requires `127.0.0.1`, not `localhost`, for local dev).
3. Create a Postgres database (e.g. [Neon](https://neon.tech)).
4. Copy `.env.local.example` to `.env.local` and fill in your Spotify Client ID/Secret, the
   redirect URI above, and your database's pooled (`DATABASE_URL`) and unpooled
   (`DATABASE_URL_UNPOOLED`) connection strings — Prisma migrations need the unpooled one, since
   pgbouncer's pooled mode can't run them.
5. Install dependencies, run migrations, and start the dev server:

```bash
npm install
npx prisma migrate dev
npm run dev
```

6. Open `http://127.0.0.1:3000` (or `http://localhost:3000` — it auto-redirects to `127.0.0.1`,
   since the OAuth state cookie needs to stay on the same host Spotify calls back to).

## Scopes used

`user-top-read`, `user-read-recently-played`, `user-library-read` — read-only, nothing is
modified on the connected account.

## Full history import

The live Spotify API only exposes your last 50 plays. For real historical trends, request your
**Extended Streaming History** from Spotify (Account → Privacy settings → Request data — it
arrives by email, usually within a few days), then upload the `Streaming_History_Audio_*.json`
and `Streaming_History_Video_*.json` files at `/import` (Spotify's own docs list both as sharing
the same schema — "end_song" and "end_video").

## Keeping history current

Every `/history` page load, and a daily Vercel Cron job (`vercel.json`, hitting
`/api/cron/sync`), pull your most recent plays from the live API so history stays up to date even
on days nobody opens the app. The cron endpoint is protected by a `CRON_SECRET` shared with
Vercel's own env var of the same name — generate one with `openssl rand -hex 32`.

## Deploying

Deploys cleanly to [Vercel](https://vercel.com) with a Postgres add-on (e.g. Neon). Set the same
environment variables from `.env.local` in the Vercel project settings, using your production
redirect URI (added to the Spotify app's Settings too), and set `CRON_SECRET` to match what
Vercel Cron sends.
