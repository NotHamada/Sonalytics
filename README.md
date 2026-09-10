# Sonalytics

A personal Spotify listening analytics dashboard — top artists/tracks trends, genre breakdown,
listening patterns, and a statistical layer (taste diversity, discovery-vs-loyalty cohorts,
genre pairings, popularity-era correlation).

Built with Next.js (App Router), using the Authorization Code flow with tokens kept server-side.

## Setup

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In the app's Settings, add this Redirect URI exactly: `http://127.0.0.1:3000/api/auth/callback`
   (Spotify requires `127.0.0.1`, not `localhost`, for local dev).
3. Copy `.env.local.example` to `.env.local` and fill in your Client ID, Client Secret, and the
   redirect URI above.
4. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

5. Open `http://127.0.0.1:3000` (or `http://localhost:3000` — it auto-redirects to `127.0.0.1`,
   since the OAuth state cookie needs to stay on the same host Spotify calls back to).

## Scopes used

`user-top-read`, `user-read-recently-played`, `user-library-read` — read-only, nothing is
modified on the connected account.
