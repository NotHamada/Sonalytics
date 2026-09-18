export type TimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: SpotifyImage[];
  external_urls: { spotify: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  album: SpotifyAlbum;
  artists: { id: string; name: string }[];
  external_urls: { spotify: string };
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface HistogramBucket {
  label: string;
  count: number;
}

export interface TopEntryDTO {
  id: string;
  name: string;
  image: string | null;
  subtitle: string;
  url: string;
}

export interface DiversityIndex {
  score: number;
  label: "unknown" | "focused" | "balanced" | "eclectic";
  distinctGenres: number;
}

export interface CohortBreakdown {
  core: TopEntryDTO[];
  discoveries: TopEntryDTO[];
  fading: TopEntryDTO[];
}

export interface GenrePair {
  genreA: string;
  genreB: string;
  count: number;
}

export interface CorrelationResult {
  coefficient: number;
  interpretation: "notEnoughData" | "newer" | "older" | "neutral";
  sampleSize: number;
}

export interface DashboardData {
  displayName: string;
  topArtistsByRange: Record<TimeRange, TopEntryDTO[]>;
  topTracksByRange: Record<TimeRange, TopEntryDTO[]>;
  genreDistribution: GenreCount[];
  popularityHistogram: HistogramBucket[];
  popularitySummary: { average: number; deepCutsPercent: number; sampleSize: number };
  releaseEraHistogram: HistogramBucket[];
  savedTracksTotal: number;
  diversityIndex: DiversityIndex;
  artistCohorts: CohortBreakdown;
  trackCohorts: CohortBreakdown;
  genrePairs: GenrePair[];
  popularityEraCorrelation: CorrelationResult;
}

export interface SpotifyApiErrorBody {
  error: { status: number; message: string };
}
