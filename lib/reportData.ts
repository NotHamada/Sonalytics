import { prisma } from "./db";
import { computeSummary, computeTopArtists, computeTopTracks } from "./historyAnalytics";
import { attachArtistImages, attachTrackImages, buildRepresentativeTrackUriByArtist } from "./spotifyImages";
import type { RankedItemWithImage } from "./spotifyImages";
import { computeTopGenres, formatMonthLabel, monthBounds, parseMonthKey, toMonthKey } from "./monthlyReport";
import type { GenreCount } from "./types";

const TOP_N = 20;

export type MonthlyReport =
  | { empty: true }
  | {
      empty: false;
      emptyMonth: boolean;
      month: string;
      monthLabel: string;
      hasPrevMonth: boolean;
      hasNextMonth: boolean;
      totalPlays: number;
      totalMinutes: number;
      topArtists: RankedItemWithImage[];
      topTracks: RankedItemWithImage[];
      topGenres: GenreCount[];
    };

/** Shared by the JSON report route and the shareable card image route, so both resolve the
 *  same month the same way instead of drifting. */
export async function getMonthlyReport(accessToken: string, requestedMonth: string | null): Promise<MonthlyReport> {
  const totalCount = await prisma.playEvent.count();
  if (totalCount === 0) return { empty: true };

  const bounds = await prisma.playEvent.aggregate({ _min: { playedAt: true }, _max: { playedAt: true } });
  const earliestMonth = toMonthKey(bounds._min.playedAt!);
  const latestMonth = toMonthKey(bounds._max.playedAt!);

  let month = latestMonth;
  if (requestedMonth && parseMonthKey(requestedMonth)) {
    // Clamp to the actual data range — a month outside it can't have anything to show anyway.
    month = requestedMonth < earliestMonth ? earliestMonth : requestedMonth > latestMonth ? latestMonth : requestedMonth;
  }

  const hasPrevMonth = month > earliestMonth;
  const hasNextMonth = month < latestMonth;

  const { start, end } = monthBounds(month);
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
      emptyMonth: true,
      month,
      monthLabel: formatMonthLabel(month),
      hasPrevMonth,
      hasNextMonth,
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
    emptyMonth: false,
    month,
    monthLabel: formatMonthLabel(month),
    hasPrevMonth,
    hasNextMonth,
    totalPlays: summary.totalPlays,
    totalMinutes: summary.totalMinutes,
    topArtists,
    topTracks,
    topGenres,
  };
}
