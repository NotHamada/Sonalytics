import type { GenreCount } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Parses a "YYYY-MM" key, rejecting anything malformed rather than silently coercing it. */
export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

export function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** UTC month boundaries — matches computeTrend's existing UTC-based month bucketing, rather
 *  than introducing a second, viewer-timezone-shifted notion of "month" alongside it. */
export function monthBounds(key: string): { start: Date; end: Date } {
  const parsed = parseMonthKey(key);
  if (!parsed) throw new Error(`Invalid month key: ${key}`);
  const { year, month } = parsed;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function formatMonthLabel(key: string): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

export function shiftMonthKey(key: string, delta: number): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1));
  return toMonthKey(shifted);
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
