import { getArtistsByIds, getTracksByIds } from "./spotify-api";
import type { SpotifyTrack } from "./types";
import type { RankedItem } from "./historyAnalytics";

export interface RankedItemWithImage extends RankedItem {
  image: string | null;
  genres?: string[];
  followers?: number | null;
  /** The artist's or album's real Spotify id, resolved via cross-referencing (see
   *  attachArtistImages/attachAlbumImages). Only ever set for artists/albums — tracks already
   *  carry their own id in `trackUri`. */
  spotifyId?: string | null;
  /** Album-only extras, resolved the same way as spotifyId. */
  totalTracks?: number | null;
  releaseDate?: string | null;
}

/** Keyed by plain Spotify track id (not the "spotify:track:" URI). */
export type TrackLookup = Map<string, SpotifyTrack>;

/** Fetches every track referenced by `ids`, once. attachTrackImages, attachArtistImages, and
 *  attachAlbumImages all need data pulled from tracks the user actually played (a track's own
 *  art, its artist's id, its album's id/art/track-count) — and the id sets they each need
 *  heavily overlap, since a "representative track" for an artist or album is, by construction,
 *  also one of the user's own top tracks. Building one shared lookup up front — instead of each
 *  attach* function doing its own getTracksByIds pass over a mostly-the-same id set — cuts the
 *  number of Spotify requests a History page load makes by roughly a third. */
export async function fetchTrackLookup(accessToken: string, ids: string[]): Promise<TrackLookup> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();
  try {
    const tracks = await getTracksByIds(accessToken, unique);
    return new Map(tracks.map((t) => [t.id, t]));
  } catch {
    return new Map();
  }
}

/** Collects the track ids a set of ranked items needs for a shared fetchTrackLookup call: each
 *  item's own track (e.g. a track card's own art) plus, when given a representative-track
 *  lookup, the id used to resolve that item's artist/album. */
export function collectTrackIds(
  items: RankedItem[],
  representativeTrackUriFor?: (item: RankedItem) => string | undefined
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    const ownId = item.trackUri?.split(":").pop();
    if (ownId) ids.push(ownId);
    const repId = representativeTrackUriFor?.(item)?.split(":").pop();
    if (repId) ids.push(repId);
  }
  return ids;
}

/** The extended-history export has no image URLs, so tracks need a live lookup — resolved from
 *  an already-fetched trackLookup (see fetchTrackLookup) rather than its own Spotify call. */
export function attachTrackImages(tracks: RankedItem[], trackLookup: TrackLookup): RankedItemWithImage[] {
  return tracks.map((t) => {
    const id = t.trackUri?.split(":").pop();
    const track = id ? trackLookup.get(id) : undefined;
    // Spotify orders images largest-first; [0] is the highest resolution available.
    return { ...t, image: track?.album.images[0]?.url ?? null };
  });
}

/** Resolves each artist's REAL Spotify id via one track they actually played, rather than
 *  searching by name — a name search can return the wrong artist entirely when multiple acts
 *  share the same name. A track's own artist credits are unambiguous (they're looked up by
 *  id), so cross-referencing through a track the user actually played pins down the correct
 *  artist with certainty. `representativeTrackUriByArtist` maps artist name -> one trackUri
 *  they were credited on, from the caller's own row data; `trackLookup` is an already-fetched
 *  batch (see fetchTrackLookup) — this function only makes its own Spotify call for the
 *  artist-details lookup (genres/followers/images), which nothing else can provide. */
export async function attachArtistImages(
  accessToken: string,
  artists: RankedItem[],
  representativeTrackUriByArtist: Map<string, string>,
  trackLookup: TrackLookup
): Promise<RankedItemWithImage[]> {
  const neededNames = new Set(artists.map((a) => a.name.toLowerCase()));
  const artistIdByName = new Map<string, string>();
  for (const a of artists) {
    const id = representativeTrackUriByArtist.get(a.name)?.split(":").pop();
    const track = id ? trackLookup.get(id) : undefined;
    if (!track) continue;
    for (const credit of track.artists) {
      const key = credit.name.toLowerCase();
      if (neededNames.has(key) && !artistIdByName.has(key)) artistIdByName.set(key, credit.id);
    }
  }

  let detailsById = new Map<string, { image: string | null; genres: string[]; followers: number | null }>();
  try {
    const resolvedIds = Array.from(new Set(artistIdByName.values()));
    const fetchedArtists = await getArtistsByIds(accessToken, resolvedIds);
    // Spotify orders images largest-first; [0] is the highest resolution available.
    detailsById = new Map(
      fetchedArtists.map((a) => [
        a.id,
        { image: a.images[0]?.url ?? null, genres: a.genres, followers: a.followers?.total ?? null },
      ])
    );
  } catch {
    // best-effort
  }

  return artists.map((a) => {
    const artistId = artistIdByName.get(a.name.toLowerCase());
    const details = artistId ? detailsById.get(artistId) : undefined;
    return {
      ...a,
      image: details?.image ?? null,
      genres: details?.genres ?? [],
      followers: details?.followers ?? null,
      spotifyId: artistId ?? null,
    };
  });
}

/** Builds the artist-name -> representative-trackUri map that attachArtistImages needs, from
 *  any row set that has both fields (first play seen per artist is as good as any). */
export function buildRepresentativeTrackUriByArtist(
  rows: { artistName: string | null; trackUri: string | null }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.artistName && row.trackUri && !map.has(row.artistName)) {
      map.set(row.artistName, row.trackUri);
    }
  }
  return map;
}

/** Builds the "albumName|artistName" -> representative-trackUri map that attachAlbumImages
 *  needs. Keyed by album+artist together, not album title alone — plenty of albums share a
 *  title across different artists (e.g. "Greatest Hits"). */
export function buildRepresentativeTrackUriByAlbum(
  rows: { albumName: string | null; artistName: string | null; trackUri: string | null }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.albumName && row.trackUri) {
      const key = `${row.albumName}|${row.artistName ?? ""}`;
      if (!map.has(key)) map.set(key, row.trackUri);
    }
  }
  return map;
}

/** Resolves each album's real Spotify id, art, and track count via one track the user actually
 *  played on it — same trick as attachArtistImages, and same already-fetched trackLookup, so
 *  this needs no Spotify call of its own: everything it needs is already on the track object
 *  (unlike artists, an album's full details are embedded right in a track response). */
export function attachAlbumImages(
  albums: RankedItem[],
  representativeTrackUriByAlbum: Map<string, string>,
  trackLookup: TrackLookup
): RankedItemWithImage[] {
  return albums.map((a) => {
    const key = `${a.name}|${a.subtitle ?? ""}`;
    const id = representativeTrackUriByAlbum.get(key)?.split(":").pop();
    const track = id ? trackLookup.get(id) : undefined;
    return {
      ...a,
      // Spotify orders images largest-first; [0] is the highest resolution available.
      image: track?.album.images[0]?.url ?? null,
      spotifyId: track?.album.id ?? null,
      totalTracks: track?.album.total_tracks ?? null,
      releaseDate: track?.album.release_date ?? null,
    };
  });
}
