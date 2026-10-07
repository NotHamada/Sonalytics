# Sonalytics

A personal Spotify listening analytics application. Sonalytics connects to your Spotify account
(read-only) and combines your full historical play data with live data from the Spotify Web API
to produce a deep, statistically-grounded picture of your listening habits — full-history search,
time-of-day/day-of-week patterns, a taste-diversity and discovery/loyalty analysis layer, a
regression/correlation-driven statistics page, and Spotify-Wrapped-style monthly/yearly recaps
with a downloadable Instagram Story card and a one-click generated Spotify playlist.

Built with Next.js 16 (App Router, React 19), Prisma + PostgreSQL, and `next-intl` for full
English/Portuguese (Brazil) localization. Authentication uses Spotify's OAuth Authorization Code
flow with tokens kept server-side in `httpOnly` cookies — nothing touches the client.

> This is a personal-use project: single-user by design (one connected Spotify account, one
> database), not a multi-tenant SaaS. It is not affiliated with or endorsed by Spotify.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Spotify scopes used](#spotify-scopes-used)
- [Full history import](#full-history-import)
- [Keeping history current](#keeping-history-current)
- [Internationalization](#internationalization)
- [Deploying](#deploying)
- [Known limitations](#known-limitations)
- [Privacy](#privacy)

---

## Features

### History (`/history`)
The default landing page once connected. Shows lifetime totals (plays, minutes), a listening
trend chart bucketed by day or month depending on the selected date range, top artists/tracks/
albums ranked by play count, and full-text search across every play you've ever logged. A
configurable date-range picker (with presets) scopes every chart and ranking on the page. Also
pulls a handful of "live" facts straight from the Spotify Web API (current top artists/tracks by
time range, saved-tracks count) to sit alongside the database-backed history stats.

### Insights (`/insights`)
Time-of-day and day-of-week listening pattern analysis: a 24-hour histogram, a day-of-week
histogram, a 7×24 heatmap (day × hour, shaded by minutes listened), and a day-part breakdown
(morning/afternoon/evening/night), plus your peak listening hour and weekday. All computed in the
viewer's local time (shifted from the UTC timestamps Spotify's export uses).

### Deep Analysis (`/analysis`)
A statistics-driven layer on top of full history:
- **Sessions** — consecutive plays with no gap longer than 30 minutes are grouped into a
  listening session; shows total sessions, average/longest session length and track count, and a
  sessions-per-period trend.
- **Streaks** — longest and current run of consecutive calendar days with at least one play.
- **Skip rate** — overall and trended over time (only meaningful for imported history, which
  records `skipped`; the live-sync endpoint can't report it).
- **Taste diversity trend** — normalized Shannon entropy over each period's artist play-share,
  trended over time.
- **Discovery velocity** — new distinct artists per period, based on each artist's true
  first-ever play across your *entire* history (not just the currently selected range).
- **Statistical highlights** — a real least-squares linear regression (slope + R²) on listening
  minutes over time; a Welch's t-test comparing weekday vs. weekend listening minutes (with a
  p-value and significance flag); Pearson correlations between every pair of {minutes, skip rate,
  diversity, new artists}; and spike/quiet day detection (days more than 2 standard deviations
  from your mean day, by total minutes).
- An in-app glossary (`InfoTooltip`s, driven by the `formulas` i18n namespace) explains what each
  statistic means and how it's computed, in plain language.

Hour/day/month bucket granularity is chosen automatically from the span of the selected date
range (hourly for ≤2 days, daily for ≤31 days, monthly beyond that) so every chart stays readable.

### Reports (`/reports`)
A Spotify-Wrapped-style recap you can page back through, month by month or year by year:
- Total plays/minutes, top 50 artists/tracks/genres for the period, with prev/next navigation
  clamped to the actual span of your imported data.
- **Shareable card** — a server-rendered PNG (via `next/og`'s `ImageResponse`), sized 1080×1920
  (9:16) to drop straight into an Instagram/TikTok/Snapchat story with no cropping, showing your
  top 5 artists and tracks, total minutes, and a hero image from your #1 artist. Three built-in
  color themes (Midnight, Sunset, Paper).
- **Playlist generator** — one click creates a private Spotify playlist of that period's top
  tracks (up to 50) directly in your account via the Spotify Web API. Requires the
  `playlist-modify-private` scope; sessions that authorized before this feature existed are
  prompted to reconnect (re-consent) rather than silently failing.

### Track, artist & album pages (`/track/[id]`, `/artist/[name]`, `/album/[name]`)
Per-item deep dive: total plays/minutes, first/last played, skip rate, a listening trend over
time, and an embedded Spotify player — reached by clicking through from History, Insights,
Analysis, or Reports.

### Import (`/import`)
Uploads Spotify's **Extended Streaming History** export (`Streaming_History_Audio_*.json` and
`Streaming_History_Video_*.json`) — each file is read in the browser and sent to `/api/import` in
2,000-entry chunks (Vercel rejects request bodies over 4.5 MB, which a single export file exceeds) —
then bulk-inserts every play event
into Postgres (batched `createMany` with `skipDuplicates`, deduped on a `dedupeKey` + `playedAt`
composite so re-uploading the same export is always safe). This is what unlocks real multi-year
history — the live Spotify API only ever exposes your last 50 plays.

### Localization
Every page is fully translated between English and Brazilian Portuguese (`next-intl`), including
the generated share card and playlist name/description. English keeps unprefixed URLs
(`/history`); Portuguese is served under `/pt-BR/...`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Route Handlers) |
| UI | [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| i18n | [next-intl](https://next-intl.dev) (locale-prefixed routing + message catalogs) |
| Database | PostgreSQL (e.g. [Neon](https://neon.tech)) |
| ORM | [Prisma](https://www.prisma.io) (`@prisma/client`) |
| Auth | Spotify OAuth 2.0 Authorization Code flow, `httpOnly` cookies |
| Image generation | `next/og` (`ImageResponse`) for the shareable Wrapped card |
| Language | TypeScript throughout |
| Hosting target | [Vercel](https://vercel.com) (incl. Vercel Cron) |

---

## Architecture

### Authentication
Sonalytics uses Spotify's standard Authorization Code flow (`lib/spotify-auth.ts`):

1. `GET /api/auth/login` generates a random CSRF `state`, stores it in a short-lived `httpOnly`
   cookie, and redirects to Spotify's `/authorize` endpoint with the requested scopes.
2. `GET /api/auth/callback` validates `state`, exchanges the returned `code` for an access +
   refresh token pair, and persists them in `httpOnly`, `SameSite=Lax` cookies
   (`sp_access_token`, `sp_refresh_token`, `sp_expires_at`, `sp_granted_scope`). It also stores
   the refresh token server-side, keyed by Spotify user id (`SpotifyAccount` table), so the
   cron sync job — which has no browser session — can authenticate independently.
3. `getValidAccessToken()` transparently refreshes the access token (a minute before actual
   expiry) on every server-side call that needs one, and clears the session if the refresh token
   itself has been revoked.
4. `GET /api/auth/logout` clears all auth cookies.

The registered Spotify redirect URI is pinned to `http://127.0.0.1:3000/api/auth/callback` for
local dev (Spotify requires an exact match and rejects `localhost`); a client-side script bounces
any `localhost` visit to `127.0.0.1` so the OAuth state cookie is always readable on the callback
request, and the `next-intl` middleware (`proxy.ts`) explicitly excludes `/api/**` from
locale-prefix rewriting so the callback URL is never mangled.

### Data flow
- **History, Insights, Analysis, Reports** read from the local Postgres database
  (`PlayEvent` rows), which is populated either by a one-time bulk **Import** of your Extended
  Streaming History export, or incrementally by **`syncRecentPlays`**, which pulls your last 50
  plays from Spotify's live `/me/player/recently-played` endpoint. Sync runs automatically on
  every `/history` page load and inside the Reports/playlist routes (best-effort — a failure
  there silently falls back to whatever's already stored), plus once a day via Vercel Cron.
- **Track/artist album art, genres, popularity, and follower counts** aren't present in the
  Extended Streaming History export at all, so they're resolved live from the Spotify Web API and
  cached server-side in the `CachedTrack`/`CachedArtist` tables (`lib/spotifyCache.ts`) with a
  30-day TTL — this data is public Spotify catalog metadata (identical for any caller), so one
  shared cache table is correct, refreshed lazily rather than per-request. Cache writes use a
  single multi-row `INSERT ... ON CONFLICT DO UPDATE` per batch (not a per-row upsert loop),
  which is the difference between a sub-second write and blowing a serverless function's timeout
  once you're resolving on the order of a hundred ids at once against a remote database.
- **Dashboard "quick facts"** (top artists/tracks by Spotify's own short/medium/long-term windows,
  genre distribution, popularity/era histograms, diversity index, discovery/loyalty cohorts,
  genre co-occurrence, popularity-era correlation) are computed directly from the live Spotify API
  each request (`/api/dashboard`, `lib/analytics.ts`) and surfaced inline on the History page —
  these don't require any imported history to work, unlike everything else in the app.

### Rate limiting & resilience
Every Spotify API call (`lib/spotify-api.ts`) retries on `429` with exponential backoff honoring
the `Retry-After` header (up to 4 attempts), and batches `/tracks` and `/artists` lookups into
chunks of 50 ids (Spotify's per-request cap) run in parallel.

---

## Project structure

```
app/
  [locale]/                 # Localized pages (App Router, next-intl)
    page.tsx                # Landing page (redirects to /history if already connected)
    history/                # Full history, search, live "quick facts"
    insights/                # Time-of-day / day-of-week patterns
    analysis/                # Deep statistical analysis
    reports/                  # Monthly/yearly Wrapped recap, share card, playlist generator
    import/                  # Extended Streaming History upload flow
    track/[id]/, artist/[name]/, album/[name]/   # Per-entity detail pages
    dashboard/                # Legacy route, redirects to /history
  api/
    auth/{login,callback,logout}/    # OAuth flow
    history/, insights/, analysis/, dashboard/     # JSON data endpoints backing the pages above
    reports/{route,year,card,playlist}/            # Report JSON, share-card PNG, playlist creation
    track/[id]/, artist/[name]/, album/[name]/     # Per-entity JSON endpoints
    import/                   # Streaming history upload endpoint
    cron/sync/                # Vercel Cron target — daily background history sync
components/                  # Client components (charts, cards, pickers, per-page client shells)
lib/
  spotify-auth.ts            # OAuth, token storage/refresh, cookies
  spotify-api.ts              # Spotify Web API client (retry/backoff, batching, playlist writes)
  spotifyAccount.ts           # Server-side refresh-token storage for the cron job
  spotifyCache.ts             # TTL-cached track/artist metadata (CachedTrack/CachedArtist)
  spotifyImages.ts             # Resolves album art / artist images for imported (id-less) rows
  db.ts                       # Prisma client singleton
  importParser.ts             # Parses Spotify's Extended Streaming History JSON export
  importInsert.ts             # Batched bulk insert with dedup
  syncRecentPlays.ts           # Live "last 50 plays" incremental sync
  historyAnalytics.ts          # Totals, top artists/tracks/albums, trends, time-of-day
  entityStats.ts               # Per-track/per-artist stats for detail pages
  deepAnalysis.ts              # Sessions, streaks, skip rate, diversity/discovery trends
  statisticalAnalysis.ts       # Linear regression, t-test, Pearson correlation, anomaly detection
  analytics.ts                 # Live-API-based dashboard analytics (diversity, cohorts, genres...)
  reportData.ts / reportPeriods.ts   # Period (month/year) resolution shared by report routes
  cardThemes.ts                 # Share-card color themes
  localeFormat.ts               # Locale-aware date/hour/weekday label formatting
  types.ts                      # Shared TypeScript types
i18n/                          # next-intl routing, request config, typed navigation
messages/{en,pt-BR}.json       # Translation catalogs
prisma/
  schema.prisma                # PlayEvent, SpotifyAccount, CachedTrack, CachedArtist
  migrations/                   # SQL migration history
proxy.ts                       # next-intl middleware (Next's renamed middleware.ts convention)
vercel.json                    # Vercel Cron schedule for /api/cron/sync
```

---

## Data model

Defined in [`prisma/schema.prisma`](prisma/schema.prisma), against PostgreSQL:

- **`PlayEvent`** — one row per play, parsed from the Extended Streaming History export (or
  synthesized from the live "recently played" endpoint). Fields mirror Spotify's own export
  schema (`msPlayed`, `trackUri`, `trackName`, `artistName`, `albumName`, `platform`,
  `reasonStart`/`reasonEnd`, `shuffle`, `skipped`, `offline`, `isPodcast`/`isAudiobook`).
  Deduplicated on `[dedupeKey, playedAt]` — `dedupeKey` falls back to `trackName|artistName` when
  a play has no `trackUri` (podcasts, some older entries), since SQL's `NULL != NULL` would
  otherwise silently defeat a unique constraint on a nullable `trackUri` alone. Indexed on
  `playedAt` and `artistName` for the range/search queries every page runs.
- **`SpotifyAccount`** — a server-side–stored refresh token, keyed by Spotify user id, purely so
  the cron sync job (no browser, no cookies) can authenticate on its own. The browser session's
  own cookie-based auth is unaffected.
- **`CachedTrack`** / **`CachedArtist`** — a shared, TTL-based (30 day) cache of public Spotify
  catalog metadata (album art, popularity, genres, follower counts) that the streaming-history
  export doesn't include, avoiding a live Spotify lookup on every single page load.

Two migrations exist: `20260911120416_init_postgres` (initial schema) and
`20260921145055_add_spotify_metadata_cache` (adds the cache tables).

---

## Getting started

### Prerequisites
- Node.js (see `package.json` / `@types/node ^20` for the targeted major version)
- A PostgreSQL database — [Neon](https://neon.tech) (serverless Postgres) is a good free option,
  including via the Vercel Marketplace
- A Spotify account and a registered [Spotify Developer app](https://developer.spotify.com/dashboard)

### 1. Create a Spotify app
Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → **Create app**.
In the app's **Settings**, add this exact **Redirect URI**:

```
http://127.0.0.1:3000/api/auth/callback
```

Spotify requires an exact match and specifically requires `127.0.0.1` (not `localhost`) for
loopback redirect URIs.

### 2. Create a Postgres database
Any Postgres provider works; the setup here assumes [Neon](https://neon.tech). You'll need both
a **pooled** connection string (for the running app, via PgBouncer) and an **unpooled** one (for
running Prisma migrations, since PgBouncer's transaction-pooling mode can't execute them).

### 3. Configure environment variables
Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | From your Spotify app's dashboard |
| `SPOTIFY_CLIENT_SECRET` | From your Spotify app's dashboard |
| `SPOTIFY_REDIRECT_URI` | Must exactly match the Redirect URI registered in the Spotify app |
| `DATABASE_URL` | Pooled Postgres connection string, used by the running app |
| `DATABASE_URL_UNPOOLED` | Unpooled/direct Postgres connection string, used by `prisma migrate` |
| `CRON_SECRET` | Shared secret protecting `/api/cron/sync`; generate with `openssl rand -hex 32` |

### 4. Install, migrate, and run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Then open **`http://127.0.0.1:3000`** (visiting `http://localhost:3000` also works — it
auto-redirects to `127.0.0.1`, since the OAuth state cookie must stay on the same host Spotify
calls back to). Click **Connect with Spotify**, authorize the app, and you'll land on `/history`.

For real multi-year stats, also see [Full history import](#full-history-import) below —
`/history` will otherwise only ever show your last 50 live-synced plays.

---

## Environment variables

See [`.env.local.example`](.env.local.example) for the canonical, commented list. Summary:

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback

DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require"

CRON_SECRET=
```

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npx prisma migrate dev` | Apply/create Prisma migrations against `DATABASE_URL_UNPOOLED` |
| `npx prisma generate` | Regenerate the Prisma client (also runs automatically via `postinstall`) |
| `npx prisma studio` | Browse the database with Prisma's GUI |

---

## Spotify scopes used

```
user-top-read
user-read-recently-played
user-library-read
playlist-modify-private
```

All read-only except `playlist-modify-private`, which is only used to create the **private**
playlists generated from the Reports page — nothing on your account is ever modified or deleted,
and no playlist is ever made public (`playlist-modify-public` is deliberately never requested).
Sessions authorized before the playlist generator was added won't have this scope and are prompted
to reconnect the one time they try to use it.

---

## Full history import

The live Spotify API only ever exposes your **last 50 plays** — there is no way to page further
back live. For real historical trends, request your **Extended Streaming History** from Spotify:

1. Go to your Spotify account's **Privacy Settings** → **Request data**, and specifically select
   the *extended* streaming history option (not the basic account data export).
2. Spotify emails you a download link, typically within a few days.
3. Unzip the export and go to `/import` in Sonalytics.
4. Upload the `Streaming_History_Audio_*.json` and `Streaming_History_Video_*.json` files
   (Spotify's own documentation lists both as sharing the identical `end_song`/`end_video`
   schema — Sonalytics parses both the same way).

Import is idempotent: re-uploading the same files (or overlapping exports) will never create
duplicate `PlayEvent` rows, thanks to the `[dedupeKey, playedAt]` unique constraint.

---

## Keeping history current

Two independent sync paths keep the local database fresh with new listening activity between
Extended Streaming History exports:

1. **On page load** — every visit to `/history` (and every Reports/playlist request) calls
   `syncRecentPlays`, which pulls your last 50 plays from Spotify's live API and inserts any that
   aren't already stored.
2. **Daily Vercel Cron** — `vercel.json` schedules `GET /api/cron/sync` once a day (`0 8 * * *`),
   so history stays current even on days nobody opens the app. The endpoint is protected by a
   `CRON_SECRET` bearer token, compared with a constant-time check, shared with a Vercel
   environment variable of the same name; it authenticates using the refresh token persisted
   server-side in `SpotifyAccount` at login time (there's no browser session available to a cron
   job).

Note: the live "recently played" endpoint doesn't report how much of a track was actually played,
so `msPlayed` for synced (non-imported) rows is approximated as the full track duration, and
`skipped` is always `null` for them — only rows from an Extended Streaming History import carry
real skip data.

---

## Internationalization

Powered by `next-intl`. Supported locales: **English (`en`, default)** and
**Portuguese, Brazil (`pt-BR`)**. English keeps today's unprefixed URLs (`/history`, `/insights`,
...); only `pt-BR` gets a `/pt-BR` prefix (`localePrefix: "as-needed"` in `i18n/routing.ts`), so
existing English URLs are byte-identical to a non-localized build. Every page's copy, the
generated share card text, and the generated playlist's name/description are all translated —
see `messages/en.json` and `messages/pt-BR.json`.

---

## Deploying

Deploys cleanly to [Vercel](https://vercel.com):

1. Set the same environment variables from `.env.local` in the Vercel project's settings, using
   your **production** redirect URI (and add that same URI to the Spotify app's Settings).
2. Set `CRON_SECRET` to match what Vercel Cron will send (Vercel Cron requests are automatically
   authenticated with this value once configured, matching `vercel.json`'s schedule).
3. Attach a Postgres database (Neon via the Vercel Marketplace works well) and set `DATABASE_URL`
   / `DATABASE_URL_UNPOOLED` accordingly.
4. Deploy — `postinstall` runs `prisma generate` automatically; run `prisma migrate deploy`
   against the production database before (or as part of) your first deploy.

---

## Known limitations

- **Single-user by design.** One Spotify account's tokens are stored per browser session (via
  cookies), and one refresh token is stored server-side (`SpotifyAccount`) for the cron job —
  this is not built for multiple concurrent users sharing one deployment/database.
- **Live sync only ever sees the last 50 plays**, and can't report skip status or true played
  duration — full accuracy requires periodically re-importing an updated Extended Streaming
  History export.
- **Genres are artist-level, not track-level** — Spotify's API doesn't expose per-track genres,
  so every genre-based chart aggregates from the artist's genre tags.
- Metadata caching (album art, genres, popularity) refreshes at most every 30 days, so a very
  recent Spotify-side change (e.g. an artist's genre tags) may take a little while to show up.

---

## Privacy

Sonalytics only ever reads your Spotify data — it does not modify or delete anything on your
account, with the sole exception of *creating new private playlists* when you explicitly use the
Reports playlist generator. Access and refresh tokens are stored in `httpOnly` cookies (never
exposed to client-side JavaScript) and, for the cron sync job only, in your own database. Your
listening history lives in your own Postgres database — nothing is sent to any third party beyond
the Spotify Web API itself.
