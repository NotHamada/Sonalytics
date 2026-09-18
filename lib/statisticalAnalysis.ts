import type { AnalysisRow, Granularity } from "./deepAnalysis";
import { bucketKey, toViewerLocal } from "./deepAnalysis";

export interface RegressionResult {
  slopePerPeriod: number;
  periodUnit: Granularity;
  r2: number;
  direction: "up" | "down" | "flat";
  sufficientData: boolean;
  periodsAnalyzed: number;
}

export interface ComparisonResult {
  meanWeekday: number;
  meanWeekend: number;
  percentDiff: number;
  pValue: number;
  significant: boolean;
  sufficientData: boolean;
}

export type MetricId = "minutes" | "skipRate" | "diversity" | "newArtists";
export type CorrelationStrength = "unrelated" | "weak" | "moderate" | "strong";

export interface CorrelationPair {
  metricA: MetricId;
  metricB: MetricId;
  coefficient: number;
  strength: CorrelationStrength;
}

export interface AnomalyDay {
  date: string;
  minutes: number;
  zScore: number;
}

export interface StatisticalAnalysis {
  trend: RegressionResult;
  weekdayVsWeekend: ComparisonResult;
  correlations: CorrelationPair[];
  spikeDays: AnomalyDay[];
  quietDays: AnomalyDay[];
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function sampleVariance(values: number[], m: number): number {
  if (values.length < 2) return 0;
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

/** Standard normal CDF via the Abramowitz & Stegun 7.1.26 erf approximation (max error ~1.5e-7). */
function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function linearRegression(ys: number[]): { slope: number; r2: number } {
  const n = ys.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const slope = dx2 === 0 ? 0 : num / dx2;
  const r = dx2 === 0 || dy2 === 0 ? 0 : num / Math.sqrt(dx2 * dy2);
  return { slope, r2: r * r };
}

/** Least-squares trend on total minutes per period — a real slope + R², not just eyeballing a
 *  chart. Buckets by day or month depending on `granularity`, same as the trend charts. */
export function computeListeningTrend(rows: AnalysisRow[], granularity: Granularity, tzOffsetMinutes: number): RegressionResult {
  const perPeriod = new Map<string, number>();
  for (const row of rows) {
    const key = bucketKey(row.playedAt, granularity, tzOffsetMinutes);
    perPeriod.set(key, (perPeriod.get(key) ?? 0) + row.msPlayed / 60000);
  }
  const periods = Array.from(perPeriod.keys()).sort();
  const minutes = periods.map((p) => perPeriod.get(p) ?? 0);

  if (periods.length < 3) {
    return {
      slopePerPeriod: 0,
      periodUnit: granularity,
      r2: 0,
      direction: "flat",
      sufficientData: false,
      periodsAnalyzed: periods.length,
    };
  }

  const { slope, r2 } = linearRegression(minutes);
  const avgMinutes = mean(minutes);
  const noiseFloor = Math.max(1, avgMinutes * 0.02);
  const direction: RegressionResult["direction"] = slope > noiseFloor ? "up" : slope < -noiseFloor ? "down" : "flat";

  return {
    slopePerPeriod: Math.round(slope * 10) / 10,
    periodUnit: granularity,
    r2: Math.round(r2 * 100) / 100,
    direction,
    sufficientData: true,
    periodsAnalyzed: periods.length,
  };
}

/** Welch's t-test on daily total minutes, weekday vs weekend. Sample sizes here are large
 *  (dozens to hundreds of days per group), so the t-distribution is well approximated by the
 *  normal distribution for the p-value — no need for the full incomplete-beta t-CDF. */
export function computeWeekdayVsWeekend(rows: AnalysisRow[], tzOffsetMinutes: number): ComparisonResult {
  const perDay = new Map<string, number>();
  for (const row of rows) {
    const day = toViewerLocal(row.playedAt, tzOffsetMinutes).toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + row.msPlayed / 60000);
  }

  const weekday: number[] = [];
  const weekend: number[] = [];
  for (const [day, minutes] of perDay.entries()) {
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) weekend.push(minutes);
    else weekday.push(minutes);
  }

  if (weekday.length < 5 || weekend.length < 5) {
    return {
      meanWeekday: 0,
      meanWeekend: 0,
      percentDiff: 0,
      pValue: 1,
      significant: false,
      sufficientData: false,
    };
  }

  const meanWeekday = mean(weekday);
  const meanWeekend = mean(weekend);
  const varWeekday = sampleVariance(weekday, meanWeekday);
  const varWeekend = sampleVariance(weekend, meanWeekend);
  const se = Math.sqrt(varWeekday / weekday.length + varWeekend / weekend.length);
  const t = se === 0 ? 0 : (meanWeekday - meanWeekend) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(t)));
  const significant = pValue < 0.05;
  const percentDiff = meanWeekend === 0 ? 0 : ((meanWeekday - meanWeekend) / meanWeekend) * 100;

  return {
    meanWeekday: Math.round(meanWeekday),
    meanWeekend: Math.round(meanWeekend),
    percentDiff: Math.round(percentDiff),
    pValue: Math.round(pValue * 1000) / 1000,
    significant,
    sufficientData: true,
  };
}

export function classifyCorrelationStrength(coefficient: number): CorrelationStrength {
  const strength = Math.abs(coefficient);
  if (strength < 0.2) return "unrelated";
  return strength > 0.6 ? "strong" : strength > 0.35 ? "moderate" : "weak";
}

/** Pairwise correlations across four per-period metrics, bucketed by day or month depending on
 *  `granularity`. Built from one aligned, same-order series per metric (rather than reusing
 *  the independently-keyed trend buckets elsewhere) so the arrays are guaranteed equal length
 *  for valid correlation math. `firstSeenAllTime` must come from the FULL history (see
 *  computeArtistFirstSeen), not whatever range `rows` is scoped to — an artist's discovery
 *  period shouldn't shift with the date filter. Periods outside the range simply never show up
 *  in `periods` below, so the "New Artists" series still ends up correctly scoped without any
 *  extra filtering here. */
export function computeCorrelations(
  rows: AnalysisRow[],
  firstSeenAllTime: Map<string, Date>,
  granularity: Granularity,
  tzOffsetMinutes: number
): CorrelationPair[] {
  const minutesMap = new Map<string, number>();
  const skipMap = new Map<string, { skipped: number; total: number }>();
  const artistsMap = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const key = bucketKey(row.playedAt, granularity, tzOffsetMinutes);
    minutesMap.set(key, (minutesMap.get(key) ?? 0) + row.msPlayed / 60000);

    const skipBucket = skipMap.get(key) ?? { skipped: 0, total: 0 };
    skipBucket.total += 1;
    if (row.skipped) skipBucket.skipped += 1;
    skipMap.set(key, skipBucket);

    if (row.artistName) {
      let artists = artistsMap.get(key);
      if (!artists) {
        artists = new Map();
        artistsMap.set(key, artists);
      }
      artists.set(row.artistName, (artists.get(row.artistName) ?? 0) + 1);
    }
  }

  const discoveryMap = new Map<string, number>();
  for (const date of firstSeenAllTime.values()) {
    const key = bucketKey(date, granularity, tzOffsetMinutes);
    discoveryMap.set(key, (discoveryMap.get(key) ?? 0) + 1);
  }

  const periods = Array.from(minutesMap.keys()).sort();
  if (periods.length < 3) return [];

  const minutes = periods.map((p) => minutesMap.get(p) ?? 0);
  const skipRate = periods.map((p) => {
    const b = skipMap.get(p);
    return b && b.total > 0 ? (b.skipped / b.total) * 100 : 0;
  });
  const diversity = periods.map((p) => {
    const artists = artistsMap.get(p);
    if (!artists || artists.size === 0) return 0;
    const total = Array.from(artists.values()).reduce((s, c) => s + c, 0);
    let entropy = 0;
    for (const count of artists.values()) {
      const p2 = count / total;
      entropy -= p2 * Math.log2(p2);
    }
    const maxEntropy = Math.log2(artists.size);
    return maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;
  });
  const newArtists = periods.map((p) => discoveryMap.get(p) ?? 0);

  const metrics: [MetricId, number[]][] = [
    ["minutes", minutes],
    ["skipRate", skipRate],
    ["diversity", diversity],
    ["newArtists", newArtists],
  ];

  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const [metricA, seriesA] = metrics[i];
      const [metricB, seriesB] = metrics[j];
      const coefficient = Math.round(pearson(seriesA, seriesB) * 100) / 100;
      pairs.push({
        metricA,
        metricB,
        coefficient,
        strength: classifyCorrelationStrength(coefficient),
      });
    }
  }

  return pairs.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
}

/** Days more than 2 standard deviations from your average active day, by total minutes. */
export function computeAnomalyDays(rows: AnalysisRow[], tzOffsetMinutes: number): { spikes: AnomalyDay[]; quiet: AnomalyDay[] } {
  const perDay = new Map<string, number>();
  for (const row of rows) {
    const day = toViewerLocal(row.playedAt, tzOffsetMinutes).toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + row.msPlayed / 60000);
  }

  const entries = Array.from(perDay.entries()).map(([date, minutes]) => ({ date, minutes }));
  if (entries.length < 10) return { spikes: [], quiet: [] };

  const m = mean(entries.map((e) => e.minutes));
  const variance = sampleVariance(
    entries.map((e) => e.minutes),
    m
  );
  const stdDev = Math.sqrt(variance);

  const withZ: AnomalyDay[] = entries.map((e) => ({
    date: e.date,
    minutes: Math.round(e.minutes),
    zScore: stdDev === 0 ? 0 : Math.round(((e.minutes - m) / stdDev) * 100) / 100,
  }));

  const spikes = [...withZ].sort((a, b) => b.zScore - a.zScore).slice(0, 3).filter((d) => d.zScore > 2);
  const quiet = [...withZ].sort((a, b) => a.zScore - b.zScore).slice(0, 3).filter((d) => d.zScore < -2);

  return { spikes, quiet };
}

export function computeStatisticalAnalysis(
  rows: AnalysisRow[],
  firstSeenAllTime: Map<string, Date>,
  granularity: Granularity,
  tzOffsetMinutes: number
): StatisticalAnalysis {
  const { spikes, quiet } = computeAnomalyDays(rows, tzOffsetMinutes);
  return {
    trend: computeListeningTrend(rows, granularity, tzOffsetMinutes),
    weekdayVsWeekend: computeWeekdayVsWeekend(rows, tzOffsetMinutes),
    correlations: computeCorrelations(rows, firstSeenAllTime, granularity, tzOffsetMinutes),
    spikeDays: spikes,
    quietDays: quiet,
  };
}
