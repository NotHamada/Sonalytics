import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { getTracksByIds, searchArtistByName } from "@/lib/spotify-api";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import {
  computeCalendar,
  computeSummary,
  computeTopArtists,
  computeTopTracks,
  computeTrend,
  type RankedItem,
} from "@/lib/historyAnalytics";

const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

interface RankedItemWithImage extends RankedItem {
  image: string | null;
}

/** The extended-history export has no image URLs, so top tracks need a live lookup —
 *  one batched call (Spotify allows up to 50 ids) rather than one request per track. */
async function attachTrackImages(
  accessToken: string,
  tracks: RankedItem[]
): Promise<RankedItemWithImage[]> {
  const ids = tracks
    .map((t) => t.trackUri?.split(":").pop())
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return tracks.map((t) => ({ ...t, image: null }));
  }

  let imageById = new Map<string, string | null>();
  try {
    const fetched = await getTracksByIds(accessToken, ids);
    imageById = new Map(
      fetched.map((track) => [track.id, track.album.images[track.album.images.length - 1]?.url ?? null])
    );
  } catch {
    // best-effort — tracks just render without art if this fails
  }

  return tracks.map((t) => {
    const id = t.trackUri?.split(":").pop();
    return { ...t, image: id ? (imageById.get(id) ?? null) : null };
  });
}

/** Unlike tracks, artists have no batch-by-name lookup — one search call per artist, run
 *  in parallel. Each call is independently best-effort so one bad match/failure doesn't
 *  drop images for the rest. */
async function attachArtistImages(
  accessToken: string,
  artists: RankedItem[]
): Promise<RankedItemWithImage[]> {
  const images = await Promise.all(
    artists.map(async (a) => {
      try {
        const match = await searchArtistByName(accessToken, a.name);
        return match?.images[match.images.length - 1]?.url ?? null;
      } catch {
        return null;
      }
    })
  );
  return artists.map((a, i) => ({ ...a, image: images[i] }));
}

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

  // Cap artist image lookups to the 10 actually shown in the UI — unlike the track lookup
  // (one batched call regardless of count), each artist is its own search request.
  const [topTracks, topArtists] = await Promise.all([
    attachTrackImages(accessToken, computeTopTracks(rows)),
    attachArtistImages(accessToken, computeTopArtists(rows, 10)),
  ]);

  return NextResponse.json({
    empty: false,
    emptyRange: false,
    summary,
    topTracks,
    topArtists,
    trend: computeTrend(rows, granularity),
    calendar: computeCalendar(rows),
  });
}
