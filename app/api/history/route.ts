import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { getArtistsByIds, getTracksByIds } from "@/lib/spotify-api";
import { prisma } from "@/lib/db";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import {
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

/** The extended-history export has no image URLs, so top tracks need a live lookup — batched
 *  (getTracksByIds chunks internally at Spotify's 50-id limit) rather than one request per
 *  track. */
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
    // Spotify orders images largest-first; [0] is the highest resolution available.
    imageById = new Map(fetched.map((track) => [track.id, track.album.images[0]?.url ?? null]));
  } catch {
    // best-effort — tracks just render without art if this fails
  }

  return tracks.map((t) => {
    const id = t.trackUri?.split(":").pop();
    return { ...t, image: id ? (imageById.get(id) ?? null) : null };
  });
}

/** Resolves each artist's REAL Spotify id via one track they actually played, rather than
 *  searching by name — a name search can return the wrong artist entirely when multiple acts
 *  share the same name, which is exactly what happened before this. A track's own artist
 *  credits are unambiguous (they're looked up by id), so cross-referencing through a track
 *  the user actually played pins down the correct artist with certainty. */
async function attachArtistImages(
  accessToken: string,
  artists: RankedItem[],
  representativeTrackUriByArtist: Map<string, string>
): Promise<RankedItemWithImage[]> {
  const neededNames = new Set(artists.map((a) => a.name.toLowerCase()));
  const trackIds = artists
    .map((a) => representativeTrackUriByArtist.get(a.name)?.split(":").pop())
    .filter((id): id is string => Boolean(id));

  const artistIdByName = new Map<string, string>();
  try {
    const tracks = await getTracksByIds(accessToken, trackIds);
    for (const track of tracks) {
      for (const credit of track.artists) {
        const key = credit.name.toLowerCase();
        if (neededNames.has(key) && !artistIdByName.has(key)) artistIdByName.set(key, credit.id);
      }
    }
  } catch {
    // best-effort — artists just render without art if this fails
  }

  let imageById = new Map<string, string | null>();
  try {
    const resolvedIds = Array.from(new Set(artistIdByName.values()));
    const fetchedArtists = await getArtistsByIds(accessToken, resolvedIds);
    // Spotify orders images largest-first; [0] is the highest resolution available.
    imageById = new Map(fetchedArtists.map((a) => [a.id, a.images[0]?.url ?? null]));
  } catch {
    // best-effort
  }

  return artists.map((a) => {
    const artistId = artistIdByName.get(a.name.toLowerCase());
    return { ...a, image: artistId ? (imageById.get(artistId) ?? null) : null };
  });
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

  // One representative track per artist (their most recent play is as good as any), used to
  // resolve the artist's real Spotify id — see attachArtistImages for why.
  const representativeTrackUriByArtist = new Map<string, string>();
  for (const row of rows) {
    if (row.artistName && row.trackUri && !representativeTrackUriByArtist.has(row.artistName)) {
      representativeTrackUriByArtist.set(row.artistName, row.trackUri);
    }
  }

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
