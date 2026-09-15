import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import StatCard from "@/components/StatCard";
import ImportClient from "@/components/ImportClient";

const ICON_PROPS = { viewBox: "0 0 24 24", className: "h-5 w-5" };

const STEPS = [
  {
    title: "Request your data",
    description: "Spotify account → Privacy settings → Request data → Extended Streaming History.",
    tint: "accent" as const,
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 L12 15 M7 10 L12 15 L17 10" />
        <path d="M4 19 L20 19" />
      </svg>
    ),
  },
  {
    title: "Wait for the email",
    description: "Spotify emails you a download link once it's ready — usually a few days.",
    tint: "violet" as const,
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 7.5 L12 13.5 L21 7.5" />
      </svg>
    ),
  },
  {
    title: "Unzip and upload",
    description: "Select every Streaming_History_Audio/Video_*.json file from the unzipped folder.",
    tint: "accent" as const,
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21 L12 9 M7 14 L12 9 L17 14" />
        <path d="M4 5 L20 5" />
      </svg>
    ),
  },
];

export default async function ImportPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  const totalCount = await prisma.playEvent.count();
  const [earliest, latest] = totalCount > 0
    ? await Promise.all([
        prisma.playEvent.findFirst({ orderBy: { playedAt: "asc" }, select: { playedAt: true } }),
        prisma.playEvent.findFirst({ orderBy: { playedAt: "desc" }, select: { playedAt: true } }),
      ])
    : [null, null];

  return (
    <div className="min-h-screen">
      <header className="glass-pill sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Sonalytics</h1>
        <div className="flex items-center gap-4">
          <a
            href="/history"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Home
          </a>
          <a
            href="/insights"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Insights
          </a>
          <a
            href="/analysis"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Analysis
          </a>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Disconnect
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 space-y-10 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Import your history
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--text-secondary)]">
            The live Spotify API only exposes your last 50 plays. Import your Extended
            Streaming History for real multi-year stats — a listening calendar, trends, and
            any date range you pick.
          </p>
        </div>

        {totalCount > 0 && earliest && latest && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Plays Imported" value={totalCount.toLocaleString()} />
            <StatCard label="Since" value={earliest.playedAt.toLocaleDateString()} />
            <StatCard label="Through" value={latest.playedAt.toLocaleDateString()} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="glass-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: step.tint === "accent" ? "var(--accent-soft)" : "var(--violet-soft)",
                    color: step.tint === "accent" ? "var(--accent)" : "var(--violet)",
                  }}
                >
                  {step.icon}
                </div>
                <span className="text-xs font-medium text-[var(--text-tertiary)]">Step {i + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">{step.description}</p>
            </div>
          ))}
        </div>

        <ImportClient />
      </main>
    </div>
  );
}
