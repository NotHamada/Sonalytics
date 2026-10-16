import { BarChart3, Compass, Disc3, History, Lock, Network, Shuffle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import { GlassCard } from "@/components/sona/primitives";

const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: "topArtistsTracks", icon: Disc3 },
  { key: "genreBreakdown", icon: BarChart3 },
  { key: "fullHistory", icon: History },
  { key: "tasteDiversity", icon: Shuffle },
  { key: "discoveryLoyalty", icon: Compass },
  { key: "genrePairings", icon: Network },
];

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const tokens = await readStoredTokens();
  if (tokens) {
    redirect({ href: "/history", locale });
  }

  const { error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "landing" });

  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6">
      <div className="flex items-center gap-2 pt-8 text-base font-semibold tracking-tight">
        <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_12px_var(--accent-glow)]" aria-hidden="true" />
        Sonalytics
      </div>

      <section className="fade-up flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="glass rounded-full px-4 py-1.5 text-xs font-medium text-text-secondary">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" />
          {t("eyebrow")}
        </span>

        <h1 className="text-display max-w-3xl">
          {t("headlineLead")} <span className="text-gradient">{t("headlineAccent")}</span>
        </h1>

        <p className="max-w-xl text-base text-text-secondary sm:text-lg">{t("subtitle")}</p>

        {error && (
          <div role="alert" className="max-w-md rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error === "access_denied" ? t("accessDenied") : t("genericError", { error })}
          </div>
        )}

        <NextLink href="/api/auth/login" className="cta-glow mt-2 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold">
          {t("connect")}
        </NextLink>

        <p className="flex max-w-md items-start gap-1.5 text-left text-xs text-text-tertiary">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("connectHint")}
        </p>
      </section>

      <section aria-labelledby="see" className="flex flex-col gap-6 pb-16">
        <h2 id="see" className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
          {t("whatYoullSee")}
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key}>
              <GlassCard className="flex h-full flex-col gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="text-sm text-text-secondary">{t(`features.${key}.description`)}</p>
              </GlassCard>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto border-t border-divider py-6 text-center text-xs text-text-tertiary">
        {t("footer.readOnly")} · {t("footer.noCache")} · {t("footer.notAffiliated")}
      </footer>
    </main>
  );
}
