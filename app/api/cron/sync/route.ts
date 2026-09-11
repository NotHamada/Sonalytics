import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getValidAccessTokenForSync } from "@/lib/spotifyAccount";
import { syncRecentPlays } from "@/lib/syncRecentPlays";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

/** Vercel Cron hits this on a schedule (see vercel.json) so history stays current even
 *  if nobody opens the app that day. Also called on every /history page load. */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accessToken = await getValidAccessTokenForSync();
  if (!accessToken) {
    return NextResponse.json({ error: "no_stored_account" }, { status: 400 });
  }

  try {
    const inserted = await syncRecentPlays(accessToken);
    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
