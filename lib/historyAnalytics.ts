import type { PlayEvent } from "@prisma/client";
import { formatHourLabel, formatWeekdayLabel } from "./localeFormat";

export interface HistorySummary {
  totalPlays: number;
  totalMinutes: number;
  earliestPlay: string | null;
  latestPlay: string | null;
}

export interface RankedItem {
  name: string;
  subtitle: string | null;
  plays: number;
  minutes: number;
  /** Present for tracks (used to fetch album art from Spotify); null for artists. */
  trackUri: string | null;
}

export interface TrendPoint {
  label: string;
  minutes: number;
}

export interface HourPoint {
  hour: number;
  label: string;
  plays: number;
  minutes: number;
}

export interface WeekdayPoint {
  day: number;
  label: string;
  plays: number;
  minutes: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  minutes: number;
}

export interface TimeOfDay {
  byHour: HourPoint[];
  byWeekday: WeekdayPoint[];
  heatmap: HeatmapCell[];
  peakHour: HourPoint | null;
  peakWeekday: WeekdayPoint | null;
}

export type PlayRow = Pick<
  PlayEvent,
  | "playedAt"
  | "msPlayed"
  | "trackUri"
  | "trackName"
  | "artistName"
  | "isPodcast"
  | "isAudiobook"
  | "skipped"
>;

export type TimingRow = Pick<PlayEvent, "playedAt" | "msPlayed">;

function toMinutes(ms: number): number {
  return Math.round((ms / 60000) * 10) / 10;
}

export function computeSummary(rows: PlayRow[]): HistorySummary {
  if (rows.length === 0) {
    return { totalPlays: 0, totalMinutes: 0, earliestPlay: null, latestPlay: null };
  }
  let totalMs = 0;
  let earliest = rows[0].playedAt;
  let latest = rows[0].playedAt;
  for (const row of rows) {
    totalMs += row.msPlayed;
    if (row.playedAt < earliest) earliest = row.playedAt;
    if (row.playedAt > latest) latest = row.playedAt;
  }
  return {
    totalPlays: rows.length,
    totalMinutes: Math.round(totalMs / 60000),
    earliestPlay: earliest.toISOString(),
    latestPlay: latest.toISOString(),
  };
}

export function computeTopTracks(rows: PlayRow[], topN = 20): RankedItem[] {
  const map = new Map<
    string,
    { name: string; subtitle: string | null; trackUri: string | null; plays: number; ms: number }
  >();
  for (const row of rows) {
    if (row.isPodcast || row.isAudiobook || !row.trackName) continue;
    const key = row.trackUri ?? `${row.trackName}|${row.artistName ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.plays += 1;
      existing.ms += row.msPlayed;
    } else {
      map.set(key, {
        name: row.trackName,
        subtitle: row.artistName,
        trackUri: row.trackUri,
        plays: 1,
        ms: row.msPlayed,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.plays - a.plays)
    .slice(0, topN)
    .map((v) => ({
      name: v.name,
      subtitle: v.subtitle,
      trackUri: v.trackUri,
      plays: v.plays,
      minutes: toMinutes(v.ms),
    }));
}

export function computeTopArtists(rows: PlayRow[], topN = 20): RankedItem[] {
  const map = new Map<string, { plays: number; ms: number }>();
  for (const row of rows) {
    if (row.isPodcast || row.isAudiobook || !row.artistName) continue;
    const existing = map.get(row.artistName);
    if (existing) {
      existing.plays += 1;
      existing.ms += row.msPlayed;
    } else {
      map.set(row.artistName, { plays: 1, ms: row.msPlayed });
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b.plays - a.plays)
    .slice(0, topN)
    .map(([name, v]) => ({
      name,
      subtitle: null,
      trackUri: null,
      plays: v.plays,
      minutes: toMinutes(v.ms),
    }));
}

/** Grouped by album+artist together (not album title alone — plenty of albums share a title
 *  across different artists, e.g. "Greatest Hits"), same key shape playEvent import dedup uses.
 *  Rows need `albumName` selected, which most PlayRow queries don't select by default. */
export function computeTopAlbums(rows: (PlayRow & { albumName: string | null })[], topN = 20): RankedItem[] {
  const map = new Map<
    string,
    { name: string; subtitle: string | null; trackUri: string | null; plays: number; ms: number }
  >();
  for (const row of rows) {
    if (row.isPodcast || row.isAudiobook || !row.albumName) continue;
    const key = `${row.albumName}|${row.artistName ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.plays += 1;
      existing.ms += row.msPlayed;
    } else {
      map.set(key, {
        name: row.albumName,
        subtitle: row.artistName,
        trackUri: row.trackUri,
        plays: 1,
        ms: row.msPlayed,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.plays - a.plays)
    .slice(0, topN)
    .map((v) => ({
      name: v.name,
      subtitle: v.subtitle,
      trackUri: v.trackUri,
      plays: v.plays,
      minutes: toMinutes(v.ms),
    }));
}

/** Buckets by day for short ranges, by month for longer ones — a single bar per day is
 *  fine for a week, useless for three years, so the caller picks based on range span. Bucketed
 *  in the viewer's local time (shifted by `tzOffsetMinutes`, matching how the date-range presets
 *  themselves are computed) rather than UTC — otherwise the same calendar-day bar can silently
 *  aggregate a different set of plays depending on which query window it was drawn from, since a
 *  UTC day boundary doesn't line up with the viewer's actual local day. */
export function computeTrend(rows: PlayRow[], granularity: "day" | "month", tzOffsetMinutes: number): TrendPoint[] {
  const sliceLength = granularity === "day" ? 10 : 7;
  const map = new Map<string, number>();
  for (const row of rows) {
    const local = new Date(row.playedAt.getTime() - tzOffsetMinutes * 60_000);
    const key = local.toISOString().slice(0, sliceLength);
    map.set(key, (map.get(key) ?? 0) + row.msPlayed);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, ms]) => ({
      label: granularity === "day" ? key.slice(5) : key.slice(2),
      minutes: Math.round(ms / 60000),
    }));
}

/** Buckets every play by hour-of-day and day-of-week in the viewer's local time. `playedAt`
 *  is stored in UTC (Spotify's own export format), and there's no per-play timezone info, so
 *  we shift by the browser's current UTC offset rather than each play's true local time —
 *  close enough for a trends view, and avoids an expensive Intl call per row. */
export function computeTimeOfDay(rows: TimingRow[], tzOffsetMinutes: number, locale: string): TimeOfDay {
  const hourBuckets = Array.from({ length: 24 }, () => ({ plays: 0, ms: 0 }));
  const weekdayBuckets = Array.from({ length: 7 }, () => ({ plays: 0, ms: 0 }));
  const heatmapMs = new Map<string, number>();

  for (const row of rows) {
    const local = new Date(row.playedAt.getTime() - tzOffsetMinutes * 60_000);
    const hour = local.getUTCHours();
    const day = local.getUTCDay();

    hourBuckets[hour].plays += 1;
    hourBuckets[hour].ms += row.msPlayed;
    weekdayBuckets[day].plays += 1;
    weekdayBuckets[day].ms += row.msPlayed;

    const key = `${day}-${hour}`;
    heatmapMs.set(key, (heatmapMs.get(key) ?? 0) + row.msPlayed);
  }

  const byHour = hourBuckets.map((b, hour) => ({
    hour,
    label: formatHourLabel(hour, locale),
    plays: b.plays,
    minutes: toMinutes(b.ms),
  }));
  const byWeekday = weekdayBuckets.map((b, day) => ({
    day,
    label: formatWeekdayLabel(day, locale),
    plays: b.plays,
    minutes: toMinutes(b.ms),
  }));

  const heatmap: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({ day, hour, minutes: toMinutes(heatmapMs.get(`${day}-${hour}`) ?? 0) });
    }
  }

  const peakHour = byHour.reduce<HourPoint | null>(
    (max, b) => (max === null || b.minutes > max.minutes ? b : max),
    null
  );
  const peakWeekday = byWeekday.reduce<WeekdayPoint | null>(
    (max, b) => (max === null || b.minutes > max.minutes ? b : max),
    null
  );

  return { byHour, byWeekday, heatmap, peakHour, peakWeekday };
}
