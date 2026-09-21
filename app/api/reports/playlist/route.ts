import { NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getValidAccessToken, hasPlaylistWriteScope } from "@/lib/spotify-auth";
import { addTracksToPlaylist, createPlaylist, getCurrentUserId, SpotifyApiError } from "@/lib/spotify-api";
import { getPeriodReport } from "@/lib/reportData";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { routing } from "@/i18n/routing";
import type { ReportGranularity } from "@/lib/reportPeriods";

interface PlaylistRequestBody {
  granularity?: string;
  period?: string;
  locale?: string;
}

export async function POST(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Proactive check — avoids a wasted Spotify round trip for the common case (every session
  // that hasn't reconnected since playlist-write was added).
  if (!(await hasPlaylistWriteScope())) {
    return NextResponse.json({ error: "reconnect_required" }, { status: 403 });
  }

  let body: PlaylistRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const granularity: ReportGranularity = body.granularity === "year" ? "year" : "month";
  const period = typeof body.period === "string" ? body.period : null;
  const locale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;

  if (!period) {
    return NextResponse.json({ error: "invalid_period" }, { status: 400 });
  }

  try {
    await syncRecentPlays(accessToken);
  } catch {
    // best-effort, same as /api/reports and /api/reports/year
  }

  const report = await getPeriodReport(accessToken, granularity, period, locale);
  if (report.empty || report.emptyPeriod) {
    return NextResponse.json({ error: "no_tracks" }, { status: 422 });
  }

  const uris = report.topTracks.map((t) => t.trackUri).filter((uri): uri is string => uri !== null);
  if (uris.length === 0) {
    return NextResponse.json({ error: "no_tracks" }, { status: 422 });
  }

  const t = await getTranslations({ locale, namespace: "playlist" });

  try {
    const userId = await getCurrentUserId(accessToken);
    const playlist = await createPlaylist(accessToken, userId, {
      name: t("name", { label: report.label }),
      description: t("description", { label: report.label }),
      public: false,
    });
    await addTracksToPlaylist(accessToken, playlist.id, uris);
    return NextResponse.json({ playlistId: playlist.id, playlistUrl: playlist.url, trackCount: uris.length });
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      // Reactive fallback: covers the narrow case where the scope cookie was missing/stale but
      // Spotify itself rejects the call for lack of scope.
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json({ error: "reconnect_required" }, { status: 403 });
      }
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
