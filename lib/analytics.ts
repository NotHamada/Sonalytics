import type {
  CohortBreakdown,
  CorrelationResult,
  DiversityIndex,
  GenreCount,
  GenrePair,
  HistogramBucket,
  SpotifyArtist,
  SpotifyTrack,
  TimeRange,
  TopEntryDTO,
} from "./types";

export function artistsToTopEntries(artists: SpotifyArtist[]): TopEntryDTO[] {
  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    image: artist.images[artist.images.length - 1]?.url ?? null,
    subtitle: artist.genres[0] ?? "",
    url: artist.external_urls.spotify,
  }));
}

export function tracksToTopEntries(tracks: SpotifyTrack[]): TopEntryDTO[] {
  return tracks.map((track) => ({
    id: track.id,
    name: track.name,
    image: track.album.images[track.album.images.length - 1]?.url ?? null,
    subtitle: track.artists.map((a) => a.name).join(", "),
    url: track.external_urls.spotify,
  }));
}

/** Aggregates genre tags across a set of artists (deduped by artist id) into ranked counts. */
export function computeGenreDistribution(artistLists: SpotifyArtist[][], topN = 12): GenreCount[] {
  const seenArtists = new Map<string, SpotifyArtist>();
  for (const list of artistLists) {
    for (const artist of list) {
      seenArtists.set(artist.id, artist);
    }
  }

  const counts = new Map<string, number>();
  for (const artist of seenArtists.values()) {
    for (const genre of artist.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

const POPULARITY_BUCKET_SIZE = 10;

export function computePopularityHistogram(trackLists: SpotifyTrack[][]): {
  histogram: HistogramBucket[];
  summary: { average: number; deepCutsPercent: number; sampleSize: number };
} {
  const seenTracks = new Map<string, SpotifyTrack>();
  for (const list of trackLists) {
    for (const track of list) {
      seenTracks.set(track.id, track);
    }
  }
  const tracks = Array.from(seenTracks.values());

  const buckets = new Array(10).fill(0) as number[];
  let total = 0;
  let deepCuts = 0;

  for (const track of tracks) {
    const bucketIndex = Math.min(9, Math.floor(track.popularity / POPULARITY_BUCKET_SIZE));
    buckets[bucketIndex] += 1;
    total += track.popularity;
    if (track.popularity < 40) deepCuts += 1;
  }

  const histogram: HistogramBucket[] = buckets.map((count, i) => ({
    label: `${i * 10}-${i * 10 + 9}`,
    count,
  }));

  const sampleSize = tracks.length;
  return {
    histogram,
    summary: {
      average: sampleSize ? Math.round(total / sampleSize) : 0,
      deepCutsPercent: sampleSize ? Math.round((deepCuts / sampleSize) * 100) : 0,
      sampleSize,
    },
  };
}

export function computeReleaseEraHistogram(trackLists: SpotifyTrack[][]): HistogramBucket[] {
  const seenTracks = new Map<string, SpotifyTrack>();
  for (const list of trackLists) {
    for (const track of list) {
      seenTracks.set(track.id, track);
    }
  }

  const counts = new Map<number, number>();
  for (const track of seenTracks.values()) {
    const year = Number(track.album.release_date?.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, count]) => ({ label: `${decade}s`, count }));
}

/**
 * Shannon entropy over your genre distribution, normalized to 0-1 by the maximum possible
 * entropy for the number of distinct genres observed. Low = a few genres dominate; high =
 * listening is spread evenly across many.
 */
export function computeDiversityIndex(artistLists: SpotifyArtist[][]): DiversityIndex {
  const seenArtists = new Map<string, SpotifyArtist>();
  for (const list of artistLists) {
    for (const artist of list) seenArtists.set(artist.id, artist);
  }

  const counts = new Map<string, number>();
  for (const artist of seenArtists.values()) {
    for (const genre of artist.genres) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total === 0 || counts.size === 0) {
    return { score: 0, label: "Unknown", distinctGenres: 0 };
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(counts.size);
  const score = maxEntropy > 0 ? entropy / maxEntropy : 0;

  const label = score < 0.4 ? "Focused" : score < 0.7 ? "Balanced" : "Eclectic";

  return { score: Math.round(score * 100) / 100, label, distinctGenres: counts.size };
}

function categorizeCohorts<T extends { id: string }>(
  byRange: Record<TimeRange, T[]>,
  toEntries: (items: T[]) => TopEntryDTO[]
): CohortBreakdown {
  const shortIds = new Set(byRange.short_term.map((x) => x.id));
  const mediumIds = new Set(byRange.medium_term.map((x) => x.id));
  const longIds = new Set(byRange.long_term.map((x) => x.id));

  const all = new Map<string, T>();
  for (const list of [byRange.short_term, byRange.medium_term, byRange.long_term]) {
    for (const item of list) all.set(item.id, item);
  }

  const core: T[] = [];
  const discoveries: T[] = [];
  const fading: T[] = [];

  for (const item of all.values()) {
    const inShort = shortIds.has(item.id);
    const inMedium = mediumIds.has(item.id);
    const inLong = longIds.has(item.id);

    if (inShort && inMedium && inLong) {
      core.push(item);
    } else if (inShort && !inMedium && !inLong) {
      discoveries.push(item);
    } else if (!inShort && (inMedium || inLong)) {
      fading.push(item);
    }
  }

  return {
    core: toEntries(core).slice(0, 8),
    discoveries: toEntries(discoveries).slice(0, 8),
    fading: toEntries(fading).slice(0, 8),
  };
}

/**
 * Splits top artists/tracks into cohorts by comparing Spotify's short/medium/long-term
 * affinity windows: "core" appears in all three (enduring taste), "discoveries" appears only
 * in the short-term window (new to your rotation), "fading" appears in medium/long-term but
 * has dropped out of the short-term window (used to listen more).
 */
export function computeArtistCohorts(byRange: Record<TimeRange, SpotifyArtist[]>): CohortBreakdown {
  return categorizeCohorts(byRange, artistsToTopEntries);
}

export function computeTrackCohorts(byRange: Record<TimeRange, SpotifyTrack[]>): CohortBreakdown {
  return categorizeCohorts(byRange, tracksToTopEntries);
}

/** Ranks which genre pairs co-occur most often on the same artist (simple co-occurrence count). */
export function computeGenreCooccurrence(artistLists: SpotifyArtist[][], topN = 8): GenrePair[] {
  const seenArtists = new Map<string, SpotifyArtist>();
  for (const list of artistLists) {
    for (const artist of list) seenArtists.set(artist.id, artist);
  }

  const pairCounts = new Map<string, number>();
  for (const artist of seenArtists.values()) {
    const genres = artist.genres;
    for (let i = 0; i < genres.length; i++) {
      for (let j = i + 1; j < genres.length; j++) {
        const key = [genres[i], genres[j]].sort().join("|");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .map(([key, count]) => {
      const [genreA, genreB] = key.split("|");
      return { genreA, genreB, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Pearson correlation between a track's release year and its popularity score, across your
 * (deduped) top tracks. Positive = you gravitate to newer, more mainstream-popular releases;
 * negative = older or more niche relative to their era.
 */
export function computePopularityEraCorrelation(trackLists: SpotifyTrack[][]): CorrelationResult {
  const seenTracks = new Map<string, SpotifyTrack>();
  for (const list of trackLists) {
    for (const track of list) seenTracks.set(track.id, track);
  }

  const points: { year: number; popularity: number }[] = [];
  for (const track of seenTracks.values()) {
    const year = Number(track.album.release_date?.slice(0, 4));
    if (Number.isFinite(year)) points.push({ year, popularity: track.popularity });
  }

  const n = points.length;
  if (n < 3) {
    return { coefficient: 0, interpretation: "Not enough data yet.", sampleSize: n };
  }

  const meanYear = points.reduce((s, p) => s + p.year, 0) / n;
  const meanPop = points.reduce((s, p) => s + p.popularity, 0) / n;

  let numerator = 0;
  let yearVariance = 0;
  let popVariance = 0;
  for (const p of points) {
    const dy = p.year - meanYear;
    const dp = p.popularity - meanPop;
    numerator += dy * dp;
    yearVariance += dy * dy;
    popVariance += dp * dp;
  }

  const denominator = Math.sqrt(yearVariance * popVariance);
  const coefficient = denominator === 0 ? 0 : numerator / denominator;

  let interpretation: string;
  if (coefficient > 0.3) {
    interpretation = "You lean toward newer, more mainstream-popular releases.";
  } else if (coefficient < -0.3) {
    interpretation = "You lean toward older or more niche releases relative to their era.";
  } else {
    interpretation = "No strong relationship between release era and popularity in your top tracks.";
  }

  return { coefficient: Math.round(coefficient * 100) / 100, interpretation, sampleSize: n };
}
