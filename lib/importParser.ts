// Shape of entries in Spotify's "Extended Streaming History" export. Files named
// Streaming_History_Audio_*.json and Streaming_History_Video_*.json ("end_song" and
// "end_video" in Spotify's own docs) share this exact schema.
interface RawStreamingHistoryEntry {
  ts?: string;
  platform?: string | null;
  ms_played?: number;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  spotify_track_uri?: string | null;
  episode_name?: string | null;
  episode_show_name?: string | null;
  audiobook_title?: string | null;
  audiobook_chapter_title?: string | null;
  reason_start?: string | null;
  reason_end?: string | null;
  shuffle?: boolean | null;
  skipped?: boolean | null;
  offline?: boolean | null;
}

export interface ParsedPlayEvent {
  playedAt: Date;
  msPlayed: number;
  trackUri: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  platform: string | null;
  reasonStart: string | null;
  reasonEnd: string | null;
  shuffle: boolean | null;
  skipped: boolean | null;
  offline: boolean | null;
  isPodcast: boolean;
  isAudiobook: boolean;
  /**
   * Non-nullable dedup key. SQL treats NULL != NULL, so a unique constraint on a
   * nullable trackUri silently stops deduping rows without one (podcasts, tracks
   * missing a URI) — falls back to trackName+artistName so it's never null.
   */
  dedupeKey: string;
}

export class ImportParseError extends Error {}

/** Parses one Streaming_History_Audio_*.json file's contents into play events. */
export function parseStreamingHistoryFile(raw: unknown, fileName: string): ParsedPlayEvent[] {
  if (!Array.isArray(raw)) {
    throw new ImportParseError(
      `${fileName} doesn't look like a Spotify streaming history file (expected a JSON array).`
    );
  }

  const events: ParsedPlayEvent[] = [];

  for (const entry of raw as RawStreamingHistoryEntry[]) {
    if (!entry.ts || typeof entry.ms_played !== "number") continue;

    const playedAt = new Date(entry.ts);
    if (Number.isNaN(playedAt.getTime())) continue;

    const isPodcast = Boolean(entry.episode_name) && !entry.master_metadata_track_name;
    const isAudiobook = Boolean(entry.audiobook_title) && !entry.master_metadata_track_name;
    const trackUri = entry.spotify_track_uri ?? null;
    const trackName =
      entry.master_metadata_track_name ?? entry.episode_name ?? entry.audiobook_chapter_title ?? null;
    const artistName =
      entry.master_metadata_album_artist_name ?? entry.episode_show_name ?? entry.audiobook_title ?? null;

    events.push({
      playedAt,
      msPlayed: entry.ms_played,
      trackUri,
      trackName,
      artistName,
      albumName: entry.master_metadata_album_album_name ?? null,
      platform: entry.platform ?? null,
      reasonStart: entry.reason_start ?? null,
      reasonEnd: entry.reason_end ?? null,
      shuffle: entry.shuffle ?? null,
      skipped: entry.skipped ?? null,
      offline: entry.offline ?? null,
      isPodcast,
      isAudiobook,
      dedupeKey: trackUri ?? `${trackName ?? ""}|${artistName ?? ""}`,
    });
  }

  return events;
}
