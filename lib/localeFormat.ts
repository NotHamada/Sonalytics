/** Locale-aware formatters for the synthetic hour-of-day / day-of-week buckets used across the
 *  analytics pages. These aren't real moments in time (hour 14 means "2pm in whichever local
 *  time zone the bucketing happened in", not a specific date), so every anchor date below is
 *  arbitrary and `timeZone: "UTC"` is pinned throughout to avoid the server's own offset
 *  corrupting the hour/weekday index. */

export function formatHourLabel(hour: number, locale: string): string {
  const d = new Date(Date.UTC(2024, 0, 1, hour));
  return new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }).format(d);
}

/** dayIndex: 0 = Sunday, matching JS's Date#getDay/getUTCDay. */
export function formatWeekdayLabel(dayIndex: number, locale: string, width: "short" | "narrow" = "short"): string {
  const d = new Date(Date.UTC(2023, 0, 1 + dayIndex)); // 2023-01-01 was a UTC Sunday
  return new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(d);
}

export function formatMonthName(monthIndexZeroBased: number, locale: string): string {
  const d = new Date(Date.UTC(2024, monthIndexZeroBased, 1));
  return new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(d);
}

export function formatMonthYearLabel(year: number, monthIndexZeroBased: number, locale: string): string {
  const d = new Date(Date.UTC(year, monthIndexZeroBased, 1));
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/** For a real calendar date (not a synthetic bucket) — e.g. "Mar 4, 2024" in a date picker. */
export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date);
}
