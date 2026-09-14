import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopArtists, computeTopTracks } from "@/lib/historyAnalytics";
import { computeEntityStats } from "@/lib/entityStats";
import { attachArtistImages, attachTrackImages, buildRepresentativeTrackUriByArtist } from "@/lib/spotifyImages";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  // Route params come through still URL-encoded in this Next.js version (not auto-decoded) —
  // decode before matching against artistName, or names with spaces never match.
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

  const artistRows = rows.filter((r) => r.artistName?.toLowerCase() === name.toLowerCase());
  if (artistRows.length === 0) {
    return NextResponse.json({ empty: false, notFound: true });
  }

  // Granularity follows the selected range's overall span, same as the Full History trend
  // chart — not this one artist's own (likely much sparser) play span.
  const summary = computeSummary(rows);
  const spanMs = new Date(summary.latestPlay!).getTime() - new Date(summary.earliestPlay!).getTime();
  const granularity = spanMs <= DAY_GRANULARITY_THRESHOLD_MS ? "day" : "month";

  const artistName = artistRows[0].artistName!;
  const stats = computeEntityStats(artistRows, granularity);
  const distinctTracks = new Set(
    artistRows
      .filter((r) => !r.isPodcast && !r.isAudiobook && r.trackName)
      .map((r) => r.trackUri ?? `${r.trackName}|${r.artistName}`)
  ).size;

  const allRankedArtists = computeTopArtists(rows, rows.length);
  const rankIndex = allRankedArtists.findIndex((a) => a.name.toLowerCase() === artistName.toLowerCase());
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const totalRanked = allRankedArtists.length;

  const representativeTrackUriByArtist = buildRepresentativeTrackUriByArtist(artistRows);

  const [topTracks, [withImage]] = await Promise.all([
    attachTrackImages(accessToken, computeTopTracks(artistRows, artistRows.length)),
    attachArtistImages(
      accessToken,
      [{ name: artistName, subtitle: null, trackUri: null, plays: stats.totalPlays, minutes: stats.totalMinutes }],
      representativeTrackUriByArtist
    ),
  ]);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    notFound: false,
    name: artistName,
    image: withImage.image,
    genres: withImage.genres,
    followers: withImage.followers,
    rank,
    totalRanked,
    distinctTracks,
    topTracks,
    ...stats,
  });
}
