import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopArtists, computeTopTracks, computeTrend } from "@/lib/historyAnalytics";
import { attachArtistImages, attachTrackImages, buildRepresentativeTrackUriByArtist } from "@/lib/spotifyImages";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

// Every item in the returned list gets a live Spotify metadata lookup, for artists also
// genres/followers), chunked at Spotify's own 50-ids-per-request limit. Left uncapped, a large
// enough library fires so many concurrent chunks that Spotify's rate limiter kicks in and the
// page can stall for minutes. 100 gives 20 pages of browsing (TopGrid pages 5 at a time) for
// just 2 chunked requests per list — plenty deep without risking a rate-limit stall.
const TOP_N_WITH_METADATA = 100;

export async function GET(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Top up with whatever's played since the last import so "Today"/"Week" stay current.
  // Best-effort: a live-API hiccup shouldn't block viewing history you already have.
  try {
    await syncRecentPlays(accessToken);
  } catch {
    // ignore — fall through to whatever's already in the local database
  }

  // No range in the entire dataset yet means "go import something", which is a different
  // empty state from "no plays land in the range you picked" — check unfiltered first.
  const totalCount = await prisma.playEvent.count();
  if (totalCount === 0) {
    return NextResponse.json({ empty: true });
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const start = startParam ? new Date(startParam) : null;
  const end = endParam ? new Date(endParam) : null;

  // Offset (minutes) between UTC and the viewer's local time, from `Date.getTimezoneOffset()`
  // in the browser — used to bucket the trend chart by the viewer's local calendar day, not
  // the server's (Vercel runs in UTC).
  const tzOffsetParam = searchParams.get("tzOffset");
  const tzOffsetMinutes = tzOffsetParam ? Number(tzOffsetParam) : 0;

  const rows = await prisma.playEvent.findMany({
    where: {
      playedAt: {
        ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
        ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
      },
    },
    select: {
      playedAt: true,
      msPlayed: true,
      trackUri: true,
      trackName: true,
      artistName: true,
      isPodcast: true,
      isAudiobook: true,
      skipped: true,
    },
  });

  if (rows.length === 0) {
    return NextResponse.json({ empty: false, emptyRange: true });
  }

  const summary = computeSummary(rows);
  const spanMs =
    new Date(summary.latestPlay!).getTime() - new Date(summary.earliestPlay!).getTime();
  const granularity = spanMs <= DAY_GRANULARITY_THRESHOLD_MS ? "day" : "month";

  const representativeTrackUriByArtist = buildRepresentativeTrackUriByArtist(rows);

  const [topTracks, topArtists] = await Promise.all([
    attachTrackImages(accessToken, computeTopTracks(rows, TOP_N_WITH_METADATA)),
    attachArtistImages(accessToken, computeTopArtists(rows, TOP_N_WITH_METADATA), representativeTrackUriByArtist),
  ]);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    summary,
    topTracks,
    topArtists,
    trend: computeTrend(rows, granularity, Number.isNaN(tzOffsetMinutes) ? 0 : tzOffsetMinutes),
  });
}
