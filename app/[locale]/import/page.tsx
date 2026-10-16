import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import StatCard from "@/components/StatCard";
import ImportClient from "@/components/ImportClient";
import Header from "@/components/Header";
import { GlassCard, PageContainer } from "@/components/sona/primitives";

const STEPS = ["requestData", "waitEmail", "unzipUpload"] as const;

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
      <Header />

      <PageContainer>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-brand">{t("eyebrow")}</p>
          <h1 className="text-title">{t("title")}</h1>
          <p className="text-text-secondary">{t("subtitle")}</p>
        </div>

        {totalCount > 0 && earliest && latest && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard accent label={t("playsImported")} value={totalCount.toLocaleString()} />
            <StatCard label={tCommon("stats.since")} value={earliest.playedAt.toLocaleDateString(locale)} />
            <StatCard label={tCommon("stats.through")} value={latest.playedAt.toLocaleDateString(locale)} />
          </div>
        )}

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step}>
              <GlassCard className="flex h-full flex-col gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft font-mono text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <h2 className="font-semibold">{t(`steps.${step}.title`)}</h2>
                <p className="break-words text-sm text-text-secondary">{t(`steps.${step}.description`)}</p>
              </GlassCard>
            </li>
          ))}
        </ol>

        <ImportClient />
      </PageContainer>
    </div>
  );
}
