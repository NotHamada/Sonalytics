import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import {
  getCurrentUserDisplayName,
  getSavedTracksTotal,
  getTopArtists,
  getTopTracks,
  SpotifyApiError,
} from "@/lib/spotify-api";
import {
  artistsToTopEntries,
  computeArtistCohorts,
  computeDiversityIndex,
  computeGenreCooccurrence,
  computeGenreDistribution,
  computePopularityEraCorrelation,
  computePopularityHistogram,
  computeReleaseEraHistogram,
  computeTrackCohorts,
  tracksToTopEntries,
} from "@/lib/analytics";
import type { DashboardData, SpotifyArtist, SpotifyTrack, TimeRange } from "@/lib/types";

const TIME_RANGES: TimeRange[] = ["short_term", "medium_term", "long_term"];

export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const [displayName, artistsByRange, tracksByRange, savedTracksTotal] = await Promise.all([
      getCurrentUserDisplayName(accessToken),
      Promise.all(TIME_RANGES.map((range) => getTopArtists(accessToken, range, 50))),
      Promise.all(TIME_RANGES.map((range) => getTopTracks(accessToken, range, 50))),
      getSavedTracksTotal(accessToken),
    ]);

    const artistsMap: Record<TimeRange, SpotifyArtist[]> = {
      short_term: artistsByRange[0],
      medium_term: artistsByRange[1],
      long_term: artistsByRange[2],
    };
    const tracksMap: Record<TimeRange, SpotifyTrack[]> = {
      short_term: tracksByRange[0],
      medium_term: tracksByRange[1],
      long_term: tracksByRange[2],
    };

    const { histogram: popularityHistogram, summary: popularitySummary } =
      computePopularityHistogram(tracksByRange);

    const data: DashboardData = {
      displayName,
      topArtistsByRange: {
        short_term: artistsToTopEntries(artistsMap.short_term),
        medium_term: artistsToTopEntries(artistsMap.medium_term),
        long_term: artistsToTopEntries(artistsMap.long_term),
      },
      topTracksByRange: {
        short_term: tracksToTopEntries(tracksMap.short_term),
        medium_term: tracksToTopEntries(tracksMap.medium_term),
        long_term: tracksToTopEntries(tracksMap.long_term),
      },
      genreDistribution: computeGenreDistribution(artistsByRange),
      popularityHistogram,
      popularitySummary,
      releaseEraHistogram: computeReleaseEraHistogram(tracksByRange),
      savedTracksTotal,
      diversityIndex: computeDiversityIndex(artistsByRange),
      artistCohorts: computeArtistCohorts(artistsMap),
      trackCohorts: computeTrackCohorts(tracksMap),
      genrePairs: computeGenreCooccurrence(artistsByRange),
      popularityEraCorrelation: computePopularityEraCorrelation(tracksByRange),
    };

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status === 401 || err.status === 403 ? err.status : 502 }
      );
    }
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
