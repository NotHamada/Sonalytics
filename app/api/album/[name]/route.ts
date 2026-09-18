import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopAlbums, computeTopTracks } from "@/lib/historyAnalytics";
import { computeEntityStats } from "@/lib/entityStats";
import {
  attachAlbumImages,
  attachTrackImages,
  buildRepresentativeTrackUriByAlbum,
  collectTrackIds,
  fetchTrackLookup,
} from "@/lib/spotifyImages";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

// See the same constant in app/api/history/route.ts — every item gets a live Spotify metadata
// lookup, so an uncapped list can fire enough concurrent requests to trip Spotify's rate limiter.
const TOP_N_WITH_METADATA = 100;

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  // Route params come through still URL-encoded in this Next.js version (not auto-decoded) —
  // decode before matching against albumName, or names with spaces never match.
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    await syncRecentPlays(accessToken);
  } catch {
    // ignore — fall through to whatever's already in the local database
  }

  const totalCount = await prisma.playEvent.count();
  if (totalCount === 0) {
    return NextResponse.json({ empty: true });
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const start = startParam ? new Date(startParam) : null;
  const end = endParam ? new Date(endParam) : null;
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

  const albumRows = rows.filter((r) => r.albumName?.toLowerCase() === name.toLowerCase());
  if (albumRows.length === 0) {
    return NextResponse.json({ empty: false, notFound: true });
  }

  // Granularity follows the selected range's overall span, same as the Full History trend
  // chart — not this one album's own (likely much sparser) play span.
  const summary = computeSummary(rows);
  const spanMs = new Date(summary.latestPlay!).getTime() - new Date(summary.earliestPlay!).getTime();
  const granularity = spanMs <= DAY_GRANULARITY_THRESHOLD_MS ? "day" : "month";

  const albumName = albumRows[0].albumName!;
  const artistName = albumRows[0].artistName ?? null;
  const stats = computeEntityStats(albumRows, granularity, Number.isNaN(tzOffsetMinutes) ? 0 : tzOffsetMinutes);
  const distinctTracks = new Set(
    albumRows
      .filter((r) => !r.isPodcast && !r.isAudiobook && r.trackName)
      .map((r) => r.trackUri ?? `${r.trackName}|${r.artistName}`)
  ).size;

  // Matched on album+artist together (not album name alone) since plenty of albums share a
  // title across different artists — same reasoning as computeTopAlbums's own grouping key.
  const allRankedAlbums = computeTopAlbums(rows, rows.length);
  const rankIndex = allRankedAlbums.findIndex(
    (a) =>
      a.name.toLowerCase() === albumName.toLowerCase() &&
      (a.subtitle ?? "").toLowerCase() === (artistName ?? "").toLowerCase()
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const totalRanked = allRankedAlbums.length;

  const representativeTrackUriByAlbum = buildRepresentativeTrackUriByAlbum(albumRows);
  const topTracksRanked = computeTopTracks(albumRows, TOP_N_WITH_METADATA);
  const albumRanked = [
    {
      name: albumName,
      subtitle: artistName,
      trackUri: null,
      plays: stats.totalPlays,
      minutes: stats.totalMinutes,
    },
  ];

  const trackLookup = await fetchTrackLookup(accessToken, [
    ...collectTrackIds(topTracksRanked),
    ...collectTrackIds(albumRanked, (a) => representativeTrackUriByAlbum.get(`${a.name}|${a.subtitle ?? ""}`)),
  ]);

  const topTracks = attachTrackImages(topTracksRanked, trackLookup);
  const [withImage] = attachAlbumImages(albumRanked, representativeTrackUriByAlbum, trackLookup);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    notFound: false,
    name: albumName,
    artistName,
    image: withImage.image,
    spotifyId: withImage.spotifyId,
    totalTracks: withImage.totalTracks,
    releaseDate: withImage.releaseDate,
    rank,
    totalRanked,
    distinctTracks,
    topTracks,
    ...stats,
  });
}
