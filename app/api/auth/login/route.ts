import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, COOKIE_OAUTH_STATE } from "@/lib/spotify-auth";

export async function GET() {
  const state = randomBytes(16).toString("hex");

  const store = await cookies();
  store.set(COOKIE_OAUTH_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes; only needs to survive the redirect round-trip
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
