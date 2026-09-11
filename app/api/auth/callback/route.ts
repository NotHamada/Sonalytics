import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_OAUTH_STATE,
  exchangeCodeForTokens,
  getAppOrigin,
  persistTokens,
} from "@/lib/spotify-auth";
import { getCurrentUserId } from "@/lib/spotify-api";
import { saveSpotifyAccount } from "@/lib/spotifyAccount";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getAppOrigin();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get(COOKIE_OAUTH_STATE)?.value;
  store.delete(COOKIE_OAUTH_STATE);

  if (error) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await persistTokens(tokens);

    // Also store server-side (keyed by Spotify user id) so the cron sync job — which has
    // no browser session — can authenticate later. A failure here shouldn't block login;
    // the browser session via cookies still works, it just means cron sync stays stale.
    try {
      const spotifyUserId = await getCurrentUserId(tokens.accessToken);
      await saveSpotifyAccount(spotifyUserId, tokens);
    } catch {
      // non-fatal — see comment above
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
