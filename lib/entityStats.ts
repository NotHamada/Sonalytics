import type { PlayRow } from "./historyAnalytics";

export interface TrendBucket {
  label: string;
  minutes: number;
}

export interface EntityStats {
  totalPlays: number;
  totalMinutes: number;
  firstPlayed: string | null;
  lastPlayed: string | null;
  skipRate: number;
  trend: TrendBucket[];
}

/** Per-entity stats for a single track or artist's own rows (already filtered by the caller).
 *  Mirrors computeSummary/computeTrend's conventions (day vs. month bucketing, skip-rate as a
 *  percent) so this reads consistently with the rest of the app. */
export function computeEntityStats(rows: PlayRow[], granularity: "day" | "month"): EntityStats {
  if (rows.length === 0) {
    return { totalPlays: 0, totalMinutes: 0, firstPlayed: null, lastPlayed: null, skipRate: 0, trend: [] };
  }

  let totalMs = 0;
  let skippedCount = 0;
  let earliest = rows[0].playedAt;
  let latest = rows[0].playedAt;
  const sliceLength = granularity === "day" ? 10 : 7;
  const trendMap = new Map<string, number>();

  for (const row of rows) {
    totalMs += row.msPlayed;
    if (row.skipped) skippedCount += 1;
    if (row.playedAt < earliest) earliest = row.playedAt;
    if (row.playedAt > latest) latest = row.playedAt;

    const key = row.playedAt.toISOString().slice(0, sliceLength);
    trendMap.set(key, (trendMap.get(key) ?? 0) + row.msPlayed);
  }

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, ms]) => ({
      label: granularity === "day" ? key.slice(5) : key.slice(2),
      minutes: Math.round(ms / 60000),
    }));

  return {
    totalPlays: rows.length,
    totalMinutes: Math.round(totalMs / 60000),
    firstPlayed: earliest.toISOString(),
    lastPlayed: latest.toISOString(),
    skipRate: Math.round((skippedCount / rows.length) * 1000) / 10,
    trend,
  };
}
