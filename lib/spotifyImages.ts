import { getArtistsByIds, getTracksByIds } from "./spotify-api";
import type { RankedItem } from "./historyAnalytics";

export interface RankedItemWithImage extends RankedItem {
  image: string | null;
  genres?: string[];
  followers?: number | null;
  /** The artist's real Spotify id, resolved via cross-referencing (see attachArtistImages).
   *  Only ever set for artists — tracks already carry their own id in `trackUri`. */
  spotifyId?: string | null;
}

/** The extended-history export has no image URLs, so tracks need a live lookup — batched
 *  (getTracksByIds chunks internally at Spotify's 50-id limit) rather than one request per
 *  track. */
export async function attachTrackImages(
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
 *  share the same name. A track's own artist credits are unambiguous (they're looked up by
 *  id), so cross-referencing through a track the user actually played pins down the correct
 *  artist with certainty. `representativeTrackUriByArtist` maps artist name -> one trackUri
 *  they were credited on, from the caller's own row data. */
export async function attachArtistImages(
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
