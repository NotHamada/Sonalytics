import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopAlbums, computeTopArtists, computeTopTracks, computeTrend } from "@/lib/historyAnalytics";
import {
  attachAlbumImages,
  attachArtistImages,
  attachTrackImages,
  buildRepresentativeTrackUriByAlbum,
  buildRepresentativeTrackUriByArtist,
  collectTrackIds,
  fetchTrackLookup,
} from "@/lib/spotifyImages";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

// Every item in the returned lists gets a live Spotify metadata lookup (a track's own art, an
// artist's genres/followers, an album's art/track-count), chunked at Spotify's own 50-ids-per-
// request limit. Left uncapped, a large enough library — now times three categories, with
// albums added — fires enough concurrent chunks to trip Spotify's rate limiter, which can stall
// the page for minutes. 100 gives 20 pages of browsing (TopGrid pages 5 at a time) per category
// for just 2 chunked requests each — plenty deep without risking a rate-limit stall.
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
      albumName: true,
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
  const representativeTrackUriByAlbum = buildRepresentativeTrackUriByAlbum(rows);

  const topTracksRanked = computeTopTracks(rows, TOP_N_WITH_METADATA);
  const topArtistsRanked = computeTopArtists(rows, TOP_N_WITH_METADATA);
  const topAlbumsRanked = computeTopAlbums(rows, TOP_N_WITH_METADATA);

  // One shared track lookup for all three lists (a track's own art, plus the representative
  // track each artist/album resolves its id through) instead of three separate Spotify passes
  // over a mostly-overlapping id set — see fetchTrackLookup.
  const trackLookup = await fetchTrackLookup(accessToken, [
    ...collectTrackIds(topTracksRanked),
    ...collectTrackIds(topArtistsRanked, (a) => representativeTrackUriByArtist.get(a.name)),
    ...collectTrackIds(topAlbumsRanked, (a) => representativeTrackUriByAlbum.get(`${a.name}|${a.subtitle ?? ""}`)),
  ]);

  const topTracks = attachTrackImages(topTracksRanked, trackLookup);
  const topAlbums = attachAlbumImages(topAlbumsRanked, representativeTrackUriByAlbum, trackLookup);
  const topArtists = await attachArtistImages(
    accessToken,
    topArtistsRanked,
    representativeTrackUriByArtist,
    trackLookup
  );

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    summary,
    topTracks,
    topArtists,
    topAlbums,
    trend: computeTrend(rows, granularity, Number.isNaN(tzOffsetMinutes) ? 0 : tzOffsetMinutes),
  });
}
