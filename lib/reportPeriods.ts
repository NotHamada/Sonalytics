import type { GenreCount } from "./types";
import { formatMonthYearLabel } from "./localeFormat";

export type ReportGranularity = "month" | "year";

function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

function parseYearKey(key: string): number | null {
  const match = /^(\d{4})$/.exec(key);
  return match ? Number(match[1]) : null;
}

export function isValidPeriodKey(granularity: ReportGranularity, key: string): boolean {
  return granularity === "year" ? parseYearKey(key) !== null : parseMonthKey(key) !== null;
}

/** UTC period boundaries — matches computeTrend's existing UTC-based month bucketing, rather
 *  than introducing a second, viewer-timezone-shifted notion of "month"/"year" alongside it. */
export function periodBounds(granularity: ReportGranularity, key: string): { start: Date; end: Date } {
  if (granularity === "year") {
    const year = parseYearKey(key);
    if (year === null) throw new Error(`Invalid year key: ${key}`);
    return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) };
  }
  const parsed = parseMonthKey(key);
  if (!parsed) throw new Error(`Invalid month key: ${key}`);
  return {
    start: new Date(Date.UTC(parsed.year, parsed.month - 1, 1)),
    end: new Date(Date.UTC(parsed.year, parsed.month, 1)),
  };
}

export function toPeriodKey(granularity: ReportGranularity, date: Date): string {
  if (granularity === "year") return String(date.getUTCFullYear());
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriodLabel(granularity: ReportGranularity, key: string, locale: string): string {
  if (granularity === "year") return key;
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return formatMonthYearLabel(parsed.year, parsed.month - 1, locale);
}

export function shiftPeriodKey(granularity: ReportGranularity, key: string, delta: number): string {
  if (granularity === "year") {
    const year = parseYearKey(key);
    return year === null ? key : String(year + delta);
  }
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1));
  return toPeriodKey("month", shifted);
}

/** Tallies genre tags across a set of already-resolved artists (one count per artist per
 *  genre) — same shape as computeGenreDistribution in lib/analytics.ts, but for artists
 *  resolved from imported history (via attachArtistImages) rather than live top-artist lists. */
export function computeTopGenres(artists: { genres?: string[] }[], topN = 12): GenreCount[] {
  const counts = new Map<string, number>();
  for (const artist of artists) {
    for (const genre of artist.genres ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
