import { NextResponse } from "next/server";
import { readStoredTokens } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import {
  computeCalendar,
  computeMonthlyTrend,
  computeSummary,
  computeTopArtists,
  computeTopTracks,
} from "@/lib/historyAnalytics";

export async function GET() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const rows = await prisma.playEvent.findMany({
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
    return NextResponse.json({ empty: true });
  }

  return NextResponse.json({
    empty: false,
    summary: computeSummary(rows),
    topTracks: computeTopTracks(rows),
    topArtists: computeTopArtists(rows),
    monthlyTrend: computeMonthlyTrend(rows),
    calendar: computeCalendar(rows),
  });
}
