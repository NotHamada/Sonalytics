import { prisma } from "./db";
import { computeSummary, computeTopArtists, computeTopTracks } from "./historyAnalytics";
import { attachArtistImages, attachTrackImages, buildRepresentativeTrackUriByArtist } from "./spotifyImages";
import type { RankedItemWithImage } from "./spotifyImages";
import {
  computeTopGenres,
  formatPeriodLabel,
  isValidPeriodKey,
  periodBounds,
  toPeriodKey,
  type ReportGranularity,
} from "./reportPeriods";
import type { GenreCount } from "./types";

const TOP_N = 20;

export type PeriodReport =
  | { empty: true }
  | {
      empty: false;
      emptyPeriod: boolean;
      granularity: ReportGranularity;
      key: string;
      label: string;
      hasPrev: boolean;
      hasNext: boolean;
      totalPlays: number;
      totalMinutes: number;
      topArtists: RankedItemWithImage[];
      topTracks: RankedItemWithImage[];
      topGenres: GenreCount[];
    };

/** Shared by the JSON report routes and the shareable card image route, so month and year
 *  reports (and the card, which renders either) all resolve a period the same way instead of
 *  drifting into separate implementations. */
export async function getPeriodReport(
  accessToken: string,
  granularity: ReportGranularity,
  requestedKey: string | null,
  locale: string
): Promise<PeriodReport> {
  const totalCount = await prisma.playEvent.count();
  if (totalCount === 0) return { empty: true };

  const bounds = await prisma.playEvent.aggregate({ _min: { playedAt: true }, _max: { playedAt: true } });
  const earliestKey = toPeriodKey(granularity, bounds._min.playedAt!);
  const latestKey = toPeriodKey(granularity, bounds._max.playedAt!);

  let key = latestKey;
  if (requestedKey && isValidPeriodKey(granularity, requestedKey)) {
    // Clamp to the actual data range — a period outside it can't have anything to show anyway.
    key = requestedKey < earliestKey ? earliestKey : requestedKey > latestKey ? latestKey : requestedKey;
  }

  const hasPrev = key > earliestKey;
  const hasNext = key < latestKey;

  const { start, end } = periodBounds(granularity, key);
  const rows = await prisma.playEvent.findMany({
    where: { playedAt: { gte: start, lt: end } },
    select: {
      playedAt: true,
      msPlayed: true,
      trackUri: true,
      trackName: true,
      artistName: true,
      isPodcast: true,
      isAudiobook: true,
      skipped: true,
    },
  });

  if (rows.length === 0) {
    return {
      empty: false,
      emptyPeriod: true,
      granularity,
      key,
      label: formatPeriodLabel(granularity, key, locale),
      hasPrev,
      hasNext,
      totalPlays: 0,
      totalMinutes: 0,
      topArtists: [],
      topTracks: [],
      topGenres: [],
    };
  }

  const summary = computeSummary(rows);
  const representativeTrackUriByArtist = buildRepresentativeTrackUriByArtist(rows);

  const [topArtists, topTracks] = await Promise.all([
    attachArtistImages(accessToken, computeTopArtists(rows, TOP_N), representativeTrackUriByArtist),
    attachTrackImages(accessToken, computeTopTracks(rows, TOP_N)),
  ]);

  const topGenres = computeTopGenres(topArtists);

  return {
    empty: false,
    emptyPeriod: false,
    granularity,
    key,
    label: formatPeriodLabel(granularity, key, locale),
    hasPrev,
    hasNext,
    totalPlays: summary.totalPlays,
    totalMinutes: summary.totalMinutes,
    topArtists,
    topTracks,
    topGenres,
  };
}
