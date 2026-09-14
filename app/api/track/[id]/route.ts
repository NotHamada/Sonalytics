import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopTracks } from "@/lib/historyAnalytics";
import { computeEntityStats } from "@/lib/entityStats";
import { attachTrackImages } from "@/lib/spotifyImages";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Route params come through still URL-encoded in this Next.js version (not auto-decoded).
  // Spotify track ids are plain base62 so this is a no-op in practice, but decode for
  // correctness/consistency with the artist route, which does need it.
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const trackUri = `spotify:track:${id}`;

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

  const trackRows = rows.filter((r) => r.trackUri === trackUri);
  if (trackRows.length === 0) {
    return NextResponse.json({ empty: false, notFound: true });
  }

  // Granularity follows the selected range's overall span, same as the Full History trend
  // chart — not this one track's own (likely much sparser) play span.
  const summary = computeSummary(rows);
  const spanMs = new Date(summary.latestPlay!).getTime() - new Date(summary.earliestPlay!).getTime();
  const granularity = spanMs <= DAY_GRANULARITY_THRESHOLD_MS ? "day" : "month";

  const stats = computeEntityStats(trackRows, granularity);
  const trackName = trackRows[0].trackName ?? "Unknown Track";
  const artistName = trackRows[0].artistName ?? null;

  const allRankedTracks = computeTopTracks(rows, rows.length);
  const rankIndex = allRankedTracks.findIndex((t) => t.trackUri === trackUri);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const totalRanked = allRankedTracks.length;

  const [withImage] = await attachTrackImages(accessToken, [
    { name: trackName, subtitle: artistName, trackUri, plays: stats.totalPlays, minutes: stats.totalMinutes },
  ]);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    notFound: false,
    name: trackName,
    artistName,
    image: withImage.image,
    rank,
    totalRanked,
    ...stats,
  });
}
