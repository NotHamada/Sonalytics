import { NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { computeTimeOfDay } from "@/lib/historyAnalytics";
import { routing } from "@/i18n/routing";

export async function GET(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Top up with whatever's played since the last import so "Today"/"Week" stay current.
  // Best-effort: a live-API hiccup shouldn't block viewing insights you already have.
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

  // Offset (minutes) between UTC and the viewer's local time, from `Date.getTimezoneOffset()`
  // in the browser — used to bucket hour-of-day/day-of-week in their local time, not the
  // server's (Vercel runs in UTC).
  const tzOffsetParam = searchParams.get("tzOffset");
  const tzOffsetMinutes = tzOffsetParam ? Number(tzOffsetParam) : 0;

  const localeParam = searchParams.get("locale");
  const locale = hasLocale(routing.locales, localeParam) ? localeParam : routing.defaultLocale;

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
    },
  });

  if (rows.length === 0) {
    return NextResponse.json({ empty: false, emptyRange: true });
  }

  const timeOfDay = computeTimeOfDay(rows, Number.isNaN(tzOffsetMinutes) ? 0 : tzOffsetMinutes, locale);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    ...timeOfDay,
  });
}
