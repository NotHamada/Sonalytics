import type { PlayEvent } from "@prisma/client";

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
}

export interface MonthlyMinutes {
  month: string;
  minutes: number;
}

export interface CalendarDay {
  date: string;
  minutes: number;
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
  const map = new Map<string, { name: string; subtitle: string | null; plays: number; ms: number }>();
  for (const row of rows) {
    if (row.isPodcast || row.isAudiobook || !row.trackName) continue;
    const key = row.trackUri ?? `${row.trackName}|${row.artistName ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.plays += 1;
      existing.ms += row.msPlayed;
    } else {
      map.set(key, { name: row.trackName, subtitle: row.artistName, plays: 1, ms: row.msPlayed });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.plays - a.plays)
    .slice(0, topN)
    .map((v) => ({ name: v.name, subtitle: v.subtitle, plays: v.plays, minutes: toMinutes(v.ms) }));
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
    .map(([name, v]) => ({ name, subtitle: null, plays: v.plays, minutes: toMinutes(v.ms) }));
}

export function computeMonthlyTrend(rows: PlayRow[]): MonthlyMinutes[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const month = row.playedAt.toISOString().slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + row.msPlayed);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, ms]) => ({ month, minutes: Math.round(ms / 60000) }));
}

export function computeCalendar(rows: PlayRow[]): CalendarDay[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const day = row.playedAt.toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + row.msPlayed);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, ms]) => ({ date, minutes: Math.round(ms / 60000) }));
}
