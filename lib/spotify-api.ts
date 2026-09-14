import type { SpotifyArtist, SpotifyTrack, TimeRange } from "./types";

const API_BASE = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "SpotifyApiError";
  }
}

const MAX_RETRIES = 4;

/** Calls the Spotify Web API, retrying on 429 with exponential backoff honoring Retry-After. */
async function spotifyFetch<T>(path: string, accessToken: string): Promise<T> {
  let attempt = 0;

  while (true) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000));
      attempt += 1;
      continue;
    }

    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // response body wasn't JSON; fall back to statusText
      }
      throw new SpotifyApiError(res.status, message);
    }

    return (await res.json()) as T;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

interface TopItemsResponse<T> {
  items: T[];
}

export async function getTopArtists(
  accessToken: string,
  timeRange: TimeRange,
  limit = 20
): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<TopItemsResponse<SpotifyArtist>>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );
  return data.items;
}

export async function getTopTracks(
  accessToken: string,
  timeRange: TimeRange,
  limit = 20
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<TopItemsResponse<SpotifyTrack>>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );
  return data.items;
}

export interface RecentlyPlayedRawItem {
  played_at: string;
  track: SpotifyTrack;
}

interface RecentlyPlayedResponse {
  items: RecentlyPlayedRawItem[];
}

/** Raw recently-played items (max 50 — Spotify's hard cap, no pagination beyond it). */
export async function getRecentlyPlayedRaw(
  accessToken: string,
  limit = 50
): Promise<RecentlyPlayedRawItem[]> {
  const data = await spotifyFetch<RecentlyPlayedResponse>(
    `/me/player/recently-played?limit=${limit}`,
    accessToken
  );
  return data.items;
}

interface TracksResponse {
  tracks: (SpotifyTrack | null)[];
}

/** Batched track lookup — used to get album art for tracks from imported history, since the
 *  export JSON itself has no image URLs. Spotify caps each call at 50 ids, so any more than
 *  that is split into parallel chunked requests, transparent to the caller. */
export async function getTracksByIds(accessToken: string, ids: string[]): Promise<SpotifyTrack[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    chunk(ids, 50).map((batch) => spotifyFetch<TracksResponse>(`/tracks?ids=${batch.join(",")}`, accessToken))
  );
  return results.flatMap((data) => data.tracks.filter((t): t is SpotifyTrack => t !== null));
}

interface ArtistsResponse {
  artists: (SpotifyArtist | null)[];
}

/** Batched artist lookup by id. Unlike a name search, this is unambiguous once the id is known
 *  — see attachArtistImages in the history route for how an artist's real id gets found from
 *  the extended-history export, which only has plain-text names. Spotify caps each call at 50
 *  ids, so any more than that is split into parallel chunked requests, transparent to the
 *  caller. */
export async function getArtistsByIds(accessToken: string, ids: string[]): Promise<SpotifyArtist[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    chunk(ids, 50).map((batch) => spotifyFetch<ArtistsResponse>(`/artists?ids=${batch.join(",")}`, accessToken))
  );
  return results.flatMap((data) => data.artists.filter((a): a is SpotifyArtist => a !== null));
}

interface SavedTracksResponse {
  total: number;
}

export async function getSavedTracksTotal(accessToken: string): Promise<number> {
  const data = await spotifyFetch<SavedTracksResponse>("/me/tracks?limit=1", accessToken);
  return data.total;
}

interface CurrentUserResponse {
  id: string;
  display_name: string | null;
}

export async function getCurrentUserDisplayName(accessToken: string): Promise<string> {
  const data = await spotifyFetch<CurrentUserResponse>("/me", accessToken);
  return data.display_name ?? "there";
}

/** The stable Spotify user id (not the display name) — used to key the stored account row. */
export async function getCurrentUserId(accessToken: string): Promise<string> {
  const data = await spotifyFetch<CurrentUserResponse>("/me", accessToken);
  return data.id;
}
