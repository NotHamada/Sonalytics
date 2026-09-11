import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeArtistFirstSeen, computeDeepAnalysis, computeGranularity } from "@/lib/deepAnalysis";
import { computeStatisticalAnalysis } from "@/lib/statisticalAnalysis";

export async function GET(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Best-effort top-up, same as the other data routes — a live-API hiccup shouldn't block
  // viewing analysis of the history already imported.
  try {
    await syncRecentPlays(accessToken);
  } catch {
    // ignore
  }

  const totalCount = await prisma.playEvent.count();
  if (totalCount === 0) {
    return NextResponse.json({ empty: true });
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const startDate = startParam ? new Date(startParam) : null;
  const endDate = endParam ? new Date(endParam) : null;
  const start = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const end = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null;
  const hasRange = Boolean(start || end);

  // Offset (minutes) between UTC and the viewer's local time, from `Date.getTimezoneOffset()`
  // in the browser — used to bucket hour/day/month in their local time, not the server's
  // (Vercel runs in UTC), same as the Insights page.
  const tzOffsetParam = searchParams.get("tzOffset");
  const tzOffsetMinutesRaw = tzOffsetParam ? Number(tzOffsetParam) : 0;
  const tzOffsetMinutes = Number.isNaN(tzOffsetMinutesRaw) ? 0 : tzOffsetMinutesRaw;

  const rows = await prisma.playEvent.findMany({
    where: {
      playedAt: {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      },
    },
    select: { playedAt: true, msPlayed: true, artistName: true, skipped: true },
  });

  if (rows.length === 0) {
    return NextResponse.json({ empty: false, emptyRange: true });
  }

  // An artist's "discovery" date must come from the full history, not whatever range is
  // selected — otherwise switching to "This Week" would make every artist you've ever played
  // look newly discovered. Only issue the extra (lightweight) query when a range is actually
  // active; with no filter, `rows` already IS the full history.
  const firstSeenRows = hasRange
    ? await prisma.playEvent.findMany({ select: { playedAt: true, artistName: true } })
    : rows;
  const firstSeenAllTime = computeArtistFirstSeen(firstSeenRows);
  const granularity = computeGranularity(rows);

  const analysis = computeDeepAnalysis(
    rows,
    firstSeenAllTime,
    granularity,
    tzOffsetMinutes,
    start ?? undefined,
    end ?? undefined
  );
  const statistical = computeStatisticalAnalysis(rows, firstSeenAllTime, granularity, tzOffsetMinutes);

  return NextResponse.json({ empty: false, emptyRange: false, ...analysis, ...statistical });
}
