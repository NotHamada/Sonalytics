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

interface SavedTracksResponse {
  total: number;
}

export async function getSavedTracksTotal(accessToken: string): Promise<number> {
  const data = await spotifyFetch<SavedTracksResponse>("/me/tracks?limit=1", accessToken);
  return data.total;
}

interface CurrentUserResponse {
  display_name: string | null;
}

export async function getCurrentUserDisplayName(accessToken: string): Promise<string> {
  const data = await spotifyFetch<CurrentUserResponse>("/me", accessToken);
  return data.display_name ?? "there";
}
