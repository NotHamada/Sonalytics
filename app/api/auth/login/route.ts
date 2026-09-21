import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, COOKIE_OAUTH_STATE, COOKIE_RETURN_TO, isSafeReturnPath } from "@/lib/spotify-auth";

export async function GET(request: NextRequest) {
  const state = randomBytes(16).toString("hex");
  const returnTo = new URL(request.url).searchParams.get("returnTo");

  const store = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes; only needs to survive the redirect round-trip
  };
  store.set(COOKIE_OAUTH_STATE, state, cookieOptions);

  // Lets a caller (e.g. a "reconnect to enable playlist creation" prompt) send the user back to
  // where they were instead of the default post-login landing page.
  if (returnTo && isSafeReturnPath(returnTo)) {
    store.set(COOKIE_RETURN_TO, returnTo, cookieOptions);
  }

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
