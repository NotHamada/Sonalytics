import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeSummary, computeTopArtists, computeTopTracks } from "@/lib/historyAnalytics";
import { attachArtistImages, attachTrackImages, buildRepresentativeTrackUriByArtist } from "@/lib/spotifyImages";
import { computeTopGenres, formatMonthLabel, monthBounds, parseMonthKey, toMonthKey } from "@/lib/monthlyReport";

const TOP_N = 20;

export async function GET(request: NextRequest) {
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

  const bounds = await prisma.playEvent.aggregate({ _min: { playedAt: true }, _max: { playedAt: true } });
  const earliestMonth = toMonthKey(bounds._min.playedAt!);
  const latestMonth = toMonthKey(bounds._max.playedAt!);

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  let month = latestMonth;
  if (monthParam && parseMonthKey(monthParam)) {
    // Clamp to the actual data range — a month outside it can't have anything to show anyway.
    month = monthParam < earliestMonth ? earliestMonth : monthParam > latestMonth ? latestMonth : monthParam;
  }

  const hasPrevMonth = month > earliestMonth;
  const hasNextMonth = month < latestMonth;

  const { start, end } = monthBounds(month);
  const rows = await prisma.playEvent.findMany({
    where: { playedAt: { gte: start, lt: end } },
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
    return NextResponse.json({
      empty: false,
      emptyMonth: true,
      month,
      monthLabel: formatMonthLabel(month),
      hasPrevMonth,
      hasNextMonth,
    });
  }

  const summary = computeSummary(rows);
  const representativeTrackUriByArtist = buildRepresentativeTrackUriByArtist(rows);

  const [topArtists, topTracks] = await Promise.all([
    attachArtistImages(accessToken, computeTopArtists(rows, TOP_N), representativeTrackUriByArtist),
    attachTrackImages(accessToken, computeTopTracks(rows, TOP_N)),
  ]);

  const topGenres = computeTopGenres(topArtists);

  return NextResponse.json({
    empty: false,
    emptyMonth: false,
    month,
    monthLabel: formatMonthLabel(month),
    hasPrevMonth,
    hasNextMonth,
    totalPlays: summary.totalPlays,
    totalMinutes: summary.totalMinutes,
    topArtists,
    topTracks,
    topGenres,
  });
}
