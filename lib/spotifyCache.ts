import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getArtistsByIds, getTracksByIds } from "./spotify-api";
import type { SpotifyArtist, SpotifyImage, SpotifyTrack } from "./types";
import type { CachedArtist, CachedTrack } from "@prisma/client";

/** Cached metadata is served for up to this long before being treated as stale and re-fetched.
 *  Images/genres/follower-counts drift slowly but aren't immutable, so this is TTL-based, not
 *  permanent. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < CACHE_TTL_MS;
}

function trackToRow(t: SpotifyTrack) {
  return {
    name: t.name,
    popularity: t.popularity,
    durationMs: t.duration_ms,
    albumId: t.album.id,
    albumName: t.album.name,
    albumReleaseDate: t.album.release_date,
    albumTotalTracks: t.album.total_tracks ?? null,
    albumImages: t.album.images as object,
    artists: t.artists as object,
    externalUrl: t.external_urls?.spotify ?? null,
  };
}

function rowToTrack(row: CachedTrack): SpotifyTrack {
  return {
    id: row.id,
    name: row.name,
    popularity: row.popularity,
    duration_ms: row.durationMs,
    album: {
      id: row.albumId,
      name: row.albumName,
      release_date: row.albumReleaseDate,
      images: row.albumImages as unknown as SpotifyImage[],
      total_tracks: row.albumTotalTracks ?? undefined,
    },
    artists: row.artists as unknown as { id: string; name: string }[],
    external_urls: { spotify: row.externalUrl ?? "" },
  };
}

function artistToRow(a: SpotifyArtist) {
  return {
    name: a.name,
    genres: a.genres as object,
    popularity: a.popularity,
    followers: a.followers.total,
    images: a.images as object,
    externalUrl: a.external_urls?.spotify ?? null,
  };
}

function rowToArtist(row: CachedArtist): SpotifyArtist {
  return {
    id: row.id,
    name: row.name,
    genres: row.genres as unknown as string[],
    popularity: row.popularity,
    followers: { total: row.followers },
    images: row.images as unknown as SpotifyImage[],
    external_urls: { spotify: row.externalUrl ?? "" },
  };
}

/** Drop-in replacement for getTracksByIds: serves cached rows younger than CACHE_TTL_MS, fetches
 *  only missing/stale ids from Spotify, upserts them, and returns the merged result in the same
 *  SpotifyTrack[] shape. Order is not guaranteed — existing callers already re-key by id. */
export async function getCachedTracks(accessToken: string, ids: string[]): Promise<SpotifyTrack[]> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return [];

  const rows = await prisma.cachedTrack.findMany({ where: { id: { in: uniqueIds } } });
  const rowById = new Map(rows.map((r) => [r.id, r]));

  const staleOrMissingIds = uniqueIds.filter((id) => {
    const row = rowById.get(id);
    return !row || !isFresh(row.fetchedAt);
  });

  let fetched: SpotifyTrack[] = [];
  if (staleOrMissingIds.length > 0) {
    try {
      fetched = await getTracksByIds(accessToken, staleOrMissingIds);
    } catch {
      fetched = [];
    }
    if (fetched.length > 0) {
      try {
        await upsertCachedTracks(fetched);
      } catch {
        // best-effort — a write failure just means this id gets re-fetched next time
      }
    }
  }

  const freshById = new Map(fetched.map((t) => [t.id, t]));
  const result: SpotifyTrack[] = [];
  for (const id of uniqueIds) {
    const fresh = freshById.get(id);
    if (fresh) {
      result.push(fresh);
      continue;
    }
    const cached = rowById.get(id);
    if (cached) result.push(rowToTrack(cached));
  }
  return result;
}

/** One round trip regardless of row count — a Postgres multi-row `INSERT ... ON CONFLICT DO
 *  UPDATE`. A per-row `upsert()` loop (even batched in one `$transaction`) sends one statement
 *  per row to Neon's remote Postgres; on a cold cache with ~100 tracks that measured over 60
 *  seconds, easily enough to blow past a serverless function's timeout — the exact class of bug
 *  this whole cache exists to avoid. */
async function upsertCachedTracks(tracks: SpotifyTrack[]): Promise<void> {
  if (tracks.length === 0) return;
  const rows = Prisma.join(
    tracks.map((t) => {
      const r = trackToRow(t);
      return Prisma.sql`(${t.id}, ${r.name}, ${r.popularity}, ${r.durationMs}, ${r.albumId}, ${r.albumName}, ${r.albumReleaseDate}, ${r.albumTotalTracks}, ${JSON.stringify(r.albumImages)}::jsonb, ${JSON.stringify(r.artists)}::jsonb, ${r.externalUrl}, now())`;
    })
  );
  await prisma.$executeRaw`
    INSERT INTO "CachedTrack"
      ("id", "name", "popularity", "durationMs", "albumId", "albumName", "albumReleaseDate", "albumTotalTracks", "albumImages", "artists", "externalUrl", "fetchedAt")
    VALUES ${rows}
    ON CONFLICT ("id") DO UPDATE SET
      "name" = EXCLUDED."name",
      "popularity" = EXCLUDED."popularity",
      "durationMs" = EXCLUDED."durationMs",
      "albumId" = EXCLUDED."albumId",
      "albumName" = EXCLUDED."albumName",
      "albumReleaseDate" = EXCLUDED."albumReleaseDate",
      "albumTotalTracks" = EXCLUDED."albumTotalTracks",
      "albumImages" = EXCLUDED."albumImages",
      "artists" = EXCLUDED."artists",
      "externalUrl" = EXCLUDED."externalUrl",
      "fetchedAt" = EXCLUDED."fetchedAt"
  `;
}

/** Drop-in replacement for getArtistsByIds — identical caching behavior to getCachedTracks. */
export async function getCachedArtists(accessToken: string, ids: string[]): Promise<SpotifyArtist[]> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return [];

  const rows = await prisma.cachedArtist.findMany({ where: { id: { in: uniqueIds } } });
  const rowById = new Map(rows.map((r) => [r.id, r]));

  const staleOrMissingIds = uniqueIds.filter((id) => {
    const row = rowById.get(id);
    return !row || !isFresh(row.fetchedAt);
  });

  let fetched: SpotifyArtist[] = [];
  if (staleOrMissingIds.length > 0) {
    try {
      fetched = await getArtistsByIds(accessToken, staleOrMissingIds);
    } catch {
      fetched = [];
    }
    if (fetched.length > 0) {
      try {
        await upsertCachedArtists(fetched);
      } catch {
        // best-effort — a write failure just means this id gets re-fetched next time
      }
    }
  }

  const freshById = new Map(fetched.map((a) => [a.id, a]));
  const result: SpotifyArtist[] = [];
  for (const id of uniqueIds) {
    const fresh = freshById.get(id);
    if (fresh) {
      result.push(fresh);
      continue;
    }
    const cached = rowById.get(id);
    if (cached) result.push(rowToArtist(cached));
  }
  return result;
}

/** Same reasoning as upsertCachedTracks — one round trip regardless of row count. */
async function upsertCachedArtists(artists: SpotifyArtist[]): Promise<void> {
  if (artists.length === 0) return;
  const rows = Prisma.join(
    artists.map((a) => {
      const r = artistToRow(a);
      return Prisma.sql`(${a.id}, ${r.name}, ${JSON.stringify(r.genres)}::jsonb, ${r.popularity}, ${r.followers}, ${JSON.stringify(r.images)}::jsonb, ${r.externalUrl}, now())`;
    })
  );
  await prisma.$executeRaw`
    INSERT INTO "CachedArtist"
      ("id", "name", "genres", "popularity", "followers", "images", "externalUrl", "fetchedAt")
    VALUES ${rows}
    ON CONFLICT ("id") DO UPDATE SET
      "name" = EXCLUDED."name",
      "genres" = EXCLUDED."genres",
      "popularity" = EXCLUDED."popularity",
      "followers" = EXCLUDED."followers",
      "images" = EXCLUDED."images",
      "externalUrl" = EXCLUDED."externalUrl",
      "fetchedAt" = EXCLUDED."fetchedAt"
  `;
}
