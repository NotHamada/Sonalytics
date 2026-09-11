import { getRecentlyPlayedRaw } from "./spotify-api";
import { bulkInsertEvents } from "./importInsert";
import type { ParsedPlayEvent } from "./importParser";

/**
 * Tops up the local history with whatever's happened since the last import, using
 * Spotify's live "recently played" endpoint (last 50 plays — no deeper history available
 * live, that's what the Extended Streaming History import is for). Called on every
 * History page load so "Today"/"Week" stay current without a manual re-import.
 *
 * Caveat: unlike imported rows, this endpoint doesn't report how much of the track was
 * actually played, so msPlayed is approximated as the full track duration.
 */
export async function syncRecentPlays(accessToken: string): Promise<number> {
  const items = await getRecentlyPlayedRaw(accessToken, 50);

  const events: ParsedPlayEvent[] = items.map((item) => {
    const trackUri = `spotify:track:${item.track.id}`;
    return {
      playedAt: new Date(item.played_at),
      msPlayed: item.track.duration_ms,
      trackUri,
      trackName: item.track.name,
      artistName: item.track.artists.map((a) => a.name).join(", "),
      albumName: item.track.album.name,
      platform: null,
      reasonStart: null,
      reasonEnd: null,
      shuffle: null,
      skipped: null,
      offline: null,
      isPodcast: false,
      isAudiobook: false,
      dedupeKey: trackUri,
    };
  });

  return bulkInsertEvents(events);
}
