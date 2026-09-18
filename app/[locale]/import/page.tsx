import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import StatCard from "@/components/StatCard";
import ImportClient from "@/components/ImportClient";
import Header from "@/components/Header";

const ICON_PROPS = { viewBox: "0 0 24 24", className: "h-5 w-5" };

const STEPS = [
  {
    key: "requestData" as const,
    tint: "accent" as const,
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 L12 15 M7 10 L12 15 L17 10" />
        <path d="M4 19 L20 19" />
      </svg>
    ),
  },
  {
    key: "waitEmail" as const,
    tint: "violet" as const,
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 7.5 L12 13.5 L21 7.5" />
      </svg>
    ),
  },
  {
    key: "unzipUpload" as const,
    tint: "accent" as const,
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21 L12 9 M7 14 L12 9 L17 14" />
        <path d="M4 5 L20 5" />
      </svg>
    ),
  },
];

export default async function ImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations({ locale, namespace: "import" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const totalCount = await prisma.playEvent.count();
  const [earliest, latest] = totalCount > 0
    ? await Promise.all([
        prisma.playEvent.findFirst({ orderBy: { playedAt: "asc" }, select: { playedAt: true } }),
        prisma.playEvent.findFirst({ orderBy: { playedAt: "desc" }, select: { playedAt: true } }),
      ])
    : [null, null];

  return (
    <div className="min-h-screen">
      <Header active="import" />

      <main className="mx-auto max-w-3xl px-4 py-12 space-y-10 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-[var(--text-secondary)]">{t("subtitle")}</p>
        </div>

        {totalCount > 0 && earliest && latest && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label={t("playsImported")} value={totalCount.toLocaleString()} />
            <StatCard label={tCommon("stats.since")} value={earliest.playedAt.toLocaleDateString(locale)} />
            <StatCard label={tCommon("stats.through")} value={latest.playedAt.toLocaleDateString(locale)} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.key} className="glass-card p-5">
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
                <span className="text-xs font-medium text-[var(--text-tertiary)]">
                  {t("stepLabel", { number: i + 1 })}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t(`steps.${step.key}.title`)}</h3>
              <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">
                {t(`steps.${step.key}.description`)}
              </p>
            </div>
          ))}
        </div>

        <ImportClient />
      </main>
    </div>
  );
}
