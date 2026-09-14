import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopArtists, computeTopTracks, computeTrend } from "@/lib/historyAnalytics";
import { attachArtistImages, attachTrackImages, buildRepresentativeTrackUriByArtist } from "@/lib/spotifyImages";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

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

  // "All" distinct tracks/artists — capped only by the number of rows (a distinct-item count
  // can never exceed the row count), which is to say not meaningfully capped at all. Image
  // lookups for the full list are handled transparently in chunks of 50 (Spotify's own batch
  // limit) inside getTracksByIds/getArtistsByIds, so every item gets a photo, not just the
  // first page.
  const [topTracks, topArtists] = await Promise.all([
    attachTrackImages(accessToken, computeTopTracks(rows, rows.length)),
    attachArtistImages(accessToken, computeTopArtists(rows, rows.length), representativeTrackUriByArtist),
  ]);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    summary,
    topTracks,
    topArtists,
    trend: computeTrend(rows, granularity),
  });
}
