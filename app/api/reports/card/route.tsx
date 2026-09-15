import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { getMonthlyReport } from "@/lib/reportData";

// Instagram Story dimensions (9:16) — the card is sized to drop straight into a story with no
// letterboxing or cropping.
const WIDTH = 1080;
const HEIGHT = 1920;
const HERO_HEIGHT = 800;

// Literal hex values — Satori renders in an isolated context with no access to the app's own
// CSS custom properties, so the dark-theme palette from globals.css has to be duplicated here.
const COLORS = {
  panelBg: "#0b0b12",
  textPrimary: "#f2f2f9",
  textSecondary: "#aeaec8",
  textTertiary: "#71718f",
  accent: "#1ed760",
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function ListColumn({
  title,
  items,
}: {
  title: string;
  items: { name: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: COLORS.textPrimary }}>{title}</div>
      {items.map((item, i) => (
        <div key={`${i}-${item.name}`} style={{ display: "flex", flexDirection: "row", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 44, color: COLORS.textTertiary }}>{i + 1}</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 500, color: COLORS.textPrimary }}>
            {truncate(item.name, 15)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({ image }: { image?: string | null }) {
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
        background: "linear-gradient(160deg, #2a0f45 0%, #0a0a14 60%, #07231a 100%)",
      }}
    >
      <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: COLORS.textPrimary }}>Sonalytics</div>
    </div>
  );
}

function EmptyCard(message: string) {
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
          background: COLORS.panelBg,
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: COLORS.textPrimary }}>Sonalytics</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: COLORS.textSecondary }}>{message}</div>
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
  const data = await getMonthlyReport(accessToken, searchParams.get("month"));

  if (data.empty) return EmptyCard("Import your Spotify history first");
  if (data.emptyMonth) return EmptyCard(`No plays in ${data.monthLabel}`);

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
          background: COLORS.panelBg,
          fontFamily: "sans-serif",
        }}
      >
        <Hero image={topArtists[0]?.image} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 64 }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 16, height: 16, borderRadius: 999, background: COLORS.accent }} />
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: COLORS.textPrimary }}>
                Sonalytics
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 28, color: COLORS.textSecondary }}>{data.monthLabel}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: COLORS.textPrimary }}>
              Your Wrapped
            </div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: COLORS.textSecondary }}>
              for {data.monthLabel}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "row", gap: 40, marginTop: 60 }}>
            <ListColumn title="Top Artists" items={topArtists} />
            <ListColumn title="Top Tracks" items={topTracks} />
          </div>

          <div style={{ display: "flex", flex: 1, minHeight: 48 }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, color: COLORS.textSecondary }}>Minutes Listened</div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: COLORS.accent }}>
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
