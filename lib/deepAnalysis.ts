import type { PlayEvent } from "@prisma/client";

export type AnalysisRow = Pick<PlayEvent, "playedAt" | "msPlayed" | "artistName" | "skipped">;

export type Granularity = "hour" | "day" | "month";

export interface TrendBucket {
  label: string;
  value: number;
}

export interface SessionSummary {
  totalSessions: number;
  avgMinutes: number;
  avgTracks: number;
  longestMinutes: number;
  longestTracks: number;
  trend: TrendBucket[];
}

export interface StreakSummary {
  current: number;
  longest: number;
  longestStart: string | null;
  longestEnd: string | null;
}

export interface DeepAnalysis {
  granularity: Granularity;
  sessions: SessionSummary;
  streaks: StreakSummary;
  skipRateOverall: number;
  skipRateTrend: TrendBucket[];
  diversityTrend: TrendBucket[];
  discoveryVelocity: TrendBucket[];
  distinctArtists: number;
}

const SESSION_GAP_MS = 30 * 60_000;

// The day/month split matches the History page's own trend chart (otherwise "This Week" would
// render as a single useless month-wide bar, and multi-year history would be an unreadable
// wall of daily bars). The hour tier is narrower on purpose: "Today" spans a single calendar
// day, so day-bucketing there would collapse to exactly one bar — worthless as a chart.
const HOUR_GRANULARITY_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
const DAY_GRANULARITY_THRESHOLD_MS = 31 * 24 * 60 * 60 * 1000;

/** Picks hour vs. day vs. month bucketing from the actual span of the (already range-filtered)
 *  rows. Pure elapsed time, so this needs no timezone adjustment. */
export function computeGranularity(rows: AnalysisRow[]): Granularity {
  if (rows.length === 0) return "month";
  let minTs = Infinity;
  let maxTs = -Infinity;
  for (const row of rows) {
    const t = row.playedAt.getTime();
    if (t < minTs) minTs = t;
    if (t > maxTs) maxTs = t;
  }
  const spanMs = maxTs - minTs;
  if (spanMs <= HOUR_GRANULARITY_THRESHOLD_MS) return "hour";
  return spanMs <= DAY_GRANULARITY_THRESHOLD_MS ? "day" : "month";
}

/** Shifts a UTC instant so reading its UTC calendar components back out (via toISOString) gives
 *  the viewer's LOCAL calendar components instead. The server (Vercel) always runs in UTC, and
 *  `playedAt` is stored in UTC, so without this every "day"/"hour" bucket below would be the
 *  viewer's UTC day/hour, not their actual one — same trick the Insights page's hour-of-day
 *  analysis already uses, via the browser's own `Date.getTimezoneOffset()`. */
export function toViewerLocal(d: Date, tzOffsetMinutes: number): Date {
  return new Date(d.getTime() - tzOffsetMinutes * 60_000);
}

/** Hour buckets are absolute (an actual hour of an actual day, "2025-06-15T14"), not
 *  hour-of-day-collapsed-across-days — this is a chronological trend chart, not a "what hour do
 *  you usually listen" aggregate (that's the Insights page's job). */
export function bucketKey(d: Date, granularity: Granularity, tzOffsetMinutes: number): string {
  const local = toViewerLocal(d, tzOffsetMinutes);
  if (granularity === "hour") return local.toISOString().slice(0, 13);
  return granularity === "day" ? local.toISOString().slice(0, 10) : local.toISOString().slice(0, 7);
}

export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "hour") return `${key.slice(11)}h`;
  return granularity === "day" ? key.slice(5) : key.slice(2);
}

function nextBucketKey(key: string, granularity: Granularity): string {
  if (granularity === "hour") {
    const d = new Date(`${key}:00:00.000Z`);
    d.setUTCHours(d.getUTCHours() + 1);
    return d.toISOString().slice(0, 13);
  }
  if (granularity === "day") {
    const d = new Date(`${key}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(`${key}-01T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 7);
}

/** Every bucket key across the viewed span, contiguous — so a period with zero plays still
 *  shows up as a zero bar instead of being silently skipped (an "hour" chart for Today should
 *  read 00h..23h straight through, not jump from 07h to 09h because nothing played at 8am).
 *  Spans the selected range when one was given; otherwise falls back to the data's own extent. */
export function enumerateBucketKeys(
  rows: AnalysisRow[],
  granularity: Granularity,
  tzOffsetMinutes: number,
  rangeStart?: Date,
  rangeEnd?: Date
): string[] {
  let startMs: number;
  let endMs: number;

  if (rangeStart && rangeEnd) {
    startMs = rangeStart.getTime();
    endMs = rangeEnd.getTime();
  } else if (rows.length > 0) {
    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const row of rows) {
      const t = row.playedAt.getTime();
      if (t < minTs) minTs = t;
      if (t > maxTs) maxTs = t;
    }
    startMs = minTs;
    endMs = maxTs;
  } else {
    return [];
  }

  const endKey = bucketKey(new Date(endMs), granularity, tzOffsetMinutes);
  const keys: string[] = [];
  let cursor = bucketKey(new Date(startMs), granularity, tzOffsetMinutes);
  keys.push(cursor);

  let guard = 0;
  while (cursor < endKey && guard < 100_000) {
    cursor = nextBucketKey(cursor, granularity);
    keys.push(cursor);
    guard += 1;
  }
  return keys;
}

/** Groups plays into listening sessions: a new session starts whenever the gap since the
 *  previous play ended exceeds 30 minutes. Gap/duration math is on absolute timestamps (a
 *  constant timezone shift wouldn't change it either way), so only the display bucketing below
 *  needs `tzOffsetMinutes`. */
export function computeSessions(
  rows: AnalysisRow[],
  granularity: Granularity,
  tzOffsetMinutes: number,
  allKeys: string[]
): SessionSummary {
  const sorted = [...rows].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
  const sessions: { startMs: number; endMs: number; plays: number }[] = [];

  for (const row of sorted) {
    const playStart = row.playedAt.getTime();
    const playEnd = playStart + row.msPlayed;
    const last = sessions[sessions.length - 1];
    if (last && playStart - last.endMs <= SESSION_GAP_MS) {
      last.endMs = Math.max(last.endMs, playEnd);
      last.plays += 1;
    } else {
      sessions.push({ startMs: playStart, endMs: playEnd, plays: 1 });
    }
  }

  if (sessions.length === 0) {
    return { totalSessions: 0, avgMinutes: 0, avgTracks: 0, longestMinutes: 0, longestTracks: 0, trend: [] };
  }

  let totalMinutes = 0;
  let totalTracks = 0;
  let longestMinutes = 0;
  let longestTracks = 0;
  const perBucket = new Map<string, number>(allKeys.map((k) => [k, 0]));

  for (const s of sessions) {
    const minutes = (s.endMs - s.startMs) / 60000;
    totalMinutes += minutes;
    totalTracks += s.plays;
    if (minutes > longestMinutes) longestMinutes = minutes;
    if (s.plays > longestTracks) longestTracks = s.plays;

    const key = bucketKey(new Date(s.startMs), granularity, tzOffsetMinutes);
    perBucket.set(key, (perBucket.get(key) ?? 0) + 1);
  }

  const trend = Array.from(perBucket.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, count]) => ({ label: bucketLabel(key, granularity), value: count }));

  return {
    totalSessions: sessions.length,
    avgMinutes: Math.round((totalMinutes / sessions.length) * 10) / 10,
    avgTracks: Math.round((totalTracks / sessions.length) * 10) / 10,
    longestMinutes: Math.round(longestMinutes),
    longestTracks,
    trend,
  };
}

/** Longest and current runs of consecutive calendar days (the viewer's local calendar days,
 *  not UTC) with at least one play. "Current" is relative to the most recent day present in the
 *  data, not necessarily today. */
export function computeStreaks(rows: AnalysisRow[], tzOffsetMinutes: number): StreakSummary {
  const days = Array.from(
    new Set(rows.map((r) => toViewerLocal(r.playedAt, tzOffsetMinutes).toISOString().slice(0, 10)))
  ).sort();
  if (days.length === 0) return { current: 0, longest: 0, longestStart: null, longestEnd: null };

  let longest = 1;
  let longestStart = days[0];
  let longestEnd = days[0];
  let runStart = days[0];
  let runLen = 1;

  for (let i = 1; i < days.length; i++) {
    const diffDays = Math.round(
      (Date.parse(`${days[i]}T00:00:00Z`) - Date.parse(`${days[i - 1]}T00:00:00Z`)) / 86_400_000
    );
    if (diffDays === 1) {
      runLen += 1;
    } else {
      if (runLen > longest) {
        longest = runLen;
        longestStart = runStart;
        longestEnd = days[i - 1];
      }
      runStart = days[i];
      runLen = 1;
    }
  }
  if (runLen > longest) {
    longest = runLen;
    longestStart = runStart;
    longestEnd = days[days.length - 1];
  }

  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const diffDays = Math.round(
      (Date.parse(`${days[i]}T00:00:00Z`) - Date.parse(`${days[i - 1]}T00:00:00Z`)) / 86_400_000
    );
    if (diffDays === 1) current += 1;
    else break;
  }

  return { current, longest, longestStart, longestEnd };
}

export function computeSkipRate(
  rows: AnalysisRow[],
  granularity: Granularity,
  tzOffsetMinutes: number,
  allKeys: string[]
): { overall: number; trend: TrendBucket[] } {
  if (rows.length === 0) return { overall: 0, trend: [] };

  const skippedCount = rows.filter((r) => r.skipped).length;
  const overall = Math.round((skippedCount / rows.length) * 1000) / 10;

  const perBucket = new Map<string, { skipped: number; total: number }>(allKeys.map((k) => [k, { skipped: 0, total: 0 }]));
  for (const row of rows) {
    const key = bucketKey(row.playedAt, granularity, tzOffsetMinutes);
    const bucket = perBucket.get(key) ?? { skipped: 0, total: 0 };
    bucket.total += 1;
    if (row.skipped) bucket.skipped += 1;
    perBucket.set(key, bucket);
  }

  const trend = Array.from(perBucket.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, b]) => ({
      label: bucketLabel(key, granularity),
      value: b.total > 0 ? Math.round((b.skipped / b.total) * 1000) / 10 : 0,
    }));

  return { overall, trend };
}

/** Normalized Shannon entropy (0-1) over each period's artist play-share — same convention as
 *  the live-API genre diversity score, applied to artists so it works from full history alone. */
export function computeDiversityTrend(
  rows: AnalysisRow[],
  granularity: Granularity,
  tzOffsetMinutes: number,
  allKeys: string[]
): TrendBucket[] {
  const perBucket = new Map<string, Map<string, number>>(allKeys.map((k) => [k, new Map()]));
  for (const row of rows) {
    if (!row.artistName) continue;
    const key = bucketKey(row.playedAt, granularity, tzOffsetMinutes);
    let artists = perBucket.get(key);
    if (!artists) {
      artists = new Map();
      perBucket.set(key, artists);
    }
    artists.set(row.artistName, (artists.get(row.artistName) ?? 0) + 1);
  }

  return Array.from(perBucket.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, artists]) => {
      const total = Array.from(artists.values()).reduce((sum, c) => sum + c, 0);
      let entropy = 0;
      for (const count of artists.values()) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
      const maxEntropy = Math.log2(artists.size);
      const score = maxEntropy > 0 ? entropy / maxEntropy : 0;
      // Scaled to 0-100 (not the raw 0-1 entropy ratio) so it plots on the same kind of axis
      // as the other trend charts — a 0-1 float collapses to a useless 0-4 integer axis.
      return { label: bucketLabel(key, granularity), value: Math.round(score * 100) };
    });
}

/** Each artist's first-ever appearance. Deliberately takes the FULL unfiltered history (not
 *  whatever range is currently selected) — an artist's "discovery" date shouldn't change
 *  depending on what date range you happen to be viewing. */
export function computeArtistFirstSeen(rows: Pick<AnalysisRow, "playedAt" | "artistName">[]): Map<string, Date> {
  const firstSeen = new Map<string, Date>();
  for (const row of rows) {
    if (!row.artistName) continue;
    const existing = firstSeen.get(row.artistName);
    if (!existing || row.playedAt < existing) firstSeen.set(row.artistName, row.playedAt);
  }
  return firstSeen;
}

/** New distinct artists per period, from a first-seen map built over ALL history — then the
 *  output is trimmed to whatever range is currently selected, same as every other chart here.
 *  The range-trim compares absolute instants (no timezone adjustment needed there — rangeStart/
 *  rangeEnd already come from the browser's own local-time range picker); only the display
 *  bucketing needs `tzOffsetMinutes`. */
export function computeDiscoveryVelocity(
  firstSeen: Map<string, Date>,
  granularity: Granularity,
  tzOffsetMinutes: number,
  allKeys: string[],
  rangeStart?: Date,
  rangeEnd?: Date
): TrendBucket[] {
  const perBucket = new Map<string, number>(allKeys.map((k) => [k, 0]));
  for (const date of firstSeen.values()) {
    if (rangeStart && date < rangeStart) continue;
    if (rangeEnd && date > rangeEnd) continue;
    const key = bucketKey(date, granularity, tzOffsetMinutes);
    perBucket.set(key, (perBucket.get(key) ?? 0) + 1);
  }

  return Array.from(perBucket.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, count]) => ({ label: bucketLabel(key, granularity), value: count }));
}

export function computeDeepAnalysis(
  rows: AnalysisRow[],
  firstSeenAllTime: Map<string, Date>,
  granularity: Granularity,
  tzOffsetMinutes: number,
  rangeStart?: Date,
  rangeEnd?: Date
): DeepAnalysis {
  const allKeys = enumerateBucketKeys(rows, granularity, tzOffsetMinutes, rangeStart, rangeEnd);
  const skip = computeSkipRate(rows, granularity, tzOffsetMinutes, allKeys);
  const distinctArtists = new Set(rows.map((r) => r.artistName).filter((n): n is string => Boolean(n))).size;

  return {
    granularity,
    sessions: computeSessions(rows, granularity, tzOffsetMinutes, allKeys),
    streaks: computeStreaks(rows, tzOffsetMinutes),
    skipRateOverall: skip.overall,
    skipRateTrend: skip.trend,
    diversityTrend: computeDiversityTrend(rows, granularity, tzOffsetMinutes, allKeys),
    discoveryVelocity: computeDiscoveryVelocity(firstSeenAllTime, granularity, tzOffsetMinutes, allKeys, rangeStart, rangeEnd),
    distinctArtists,
  };
}
