import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { getMonthlyReport } from "@/lib/reportData";
import { resolveCardTheme, type CardTheme } from "@/lib/cardThemes";

// Instagram Story dimensions (9:16) — the card is sized to drop straight into a story with no
// letterboxing or cropping.
const WIDTH = 1080;
const HEIGHT = 1920;
const HERO_HEIGHT = 800;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function ListColumn({
  title,
  items,
  theme,
}: {
  title: string;
  items: { name: string }[];
  theme: CardTheme;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: theme.textPrimary }}>{title}</div>
      {items.map((item, i) => (
        <div key={`${i}-${item.name}`} style={{ display: "flex", flexDirection: "row", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 44, color: theme.textTertiary }}>{i + 1}</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 500, color: theme.textPrimary }}>
            {truncate(item.name, 15)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({ image, theme }: { image?: string | null; theme: CardTheme }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} width={WIDTH} height={HERO_HEIGHT} style={{ objectFit: "cover" }} alt="" />;
  }
  return (
    <div
      style={{
        display: "flex",
        width: WIDTH,
        height: HERO_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        background: theme.heroGradient,
      }}
    >
      <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: theme.textPrimary }}>Sonalytics</div>
    </div>
  );
}

function EmptyCard(message: string, theme: CardTheme) {
  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: theme.panelBg,
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: theme.textPrimary }}>Sonalytics</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: theme.textSecondary }}>{message}</div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

export async function GET(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return new Response("not_authenticated", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const theme = resolveCardTheme(searchParams.get("style"));
  const data = await getMonthlyReport(accessToken, searchParams.get("month"));

  if (data.empty) return EmptyCard("Import your Spotify history first", theme);
  if (data.emptyMonth) return EmptyCard(`No plays in ${data.monthLabel}`, theme);

  const topArtists = data.topArtists.slice(0, 5);
  const topTracks = data.topTracks.slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          background: theme.panelBg,
          fontFamily: "sans-serif",
        }}
      >
        <Hero image={topArtists[0]?.image} theme={theme} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 64 }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, background: theme.accent }} />
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: theme.textPrimary }}>
                Sonalytics
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 28, color: theme.textSecondary }}>{data.monthLabel}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: theme.textPrimary }}>
              Your Wrapped
            </div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: theme.textSecondary }}>
              for {data.monthLabel}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "row", gap: 40, marginTop: 60 }}>
            <ListColumn title="Top Artists" items={topArtists} theme={theme} />
            <ListColumn title="Top Tracks" items={topTracks} theme={theme} />
          </div>

          <div style={{ display: "flex", flex: 1, minHeight: 48 }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, color: theme.textSecondary }}>Minutes Listened</div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: theme.accent }}>
              {data.totalMinutes.toLocaleString()} minutes
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
