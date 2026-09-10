import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_OAUTH_STATE,
  exchangeCodeForTokens,
  getAppOrigin,
  persistTokens,
} from "@/lib/spotify-auth";

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
