import type { ReactNode } from "react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  className: "h-5 w-5",
};

const FEATURES: { key: string; tint: "accent" | "violet"; icon: ReactNode }[] = [
  {
    key: "topArtistsTracks",
    tint: "accent",
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18 L9 12 L13 15 L21 6" />
        <circle cx="3" cy="18" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="13" cy="15" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="21" cy="6" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "genreBreakdown",
    tint: "violet",
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="6" rx="3" />
        <rect x="9" y="14" width="12" height="6" rx="3" />
      </svg>
    ),
  },
  {
    key: "fullHistory",
    tint: "accent",
    icon: (
      <svg {...ICON_PROPS} fill="currentColor" stroke="none">
        <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" opacity="0.3" />
        <rect x="9" y="1.5" width="6" height="6" rx="1.5" opacity="0.9" />
        <rect x="16.5" y="1.5" width="6" height="6" rx="1.5" opacity="0.5" />
        <rect x="1.5" y="9" width="6" height="6" rx="1.5" opacity="0.7" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" opacity="0.3" />
        <rect x="16.5" y="9" width="6" height="6" rx="1.5" opacity="0.8" />
        <rect x="1.5" y="16.5" width="6" height="6" rx="1.5" opacity="0.4" />
        <rect x="9" y="16.5" width="6" height="6" rx="1.5" opacity="0.6" />
        <rect x="16.5" y="16.5" width="6" height="6" rx="1.5" opacity="0.3" />
      </svg>
    ),
  },
  {
    key: "tasteDiversity",
    tint: "violet",
    icon: (
      <svg {...ICON_PROPS} fill="currentColor" stroke="none">
        <circle cx="5" cy="6" r="2.2" opacity="0.9" />
        <circle cx="14" cy="4" r="1.4" opacity="0.6" />
        <circle cx="19" cy="10" r="2.6" opacity="0.8" />
        <circle cx="6" cy="16" r="1.8" opacity="0.5" />
        <circle cx="13" cy="18" r="2.2" opacity="0.9" />
        <circle cx="19" cy="19" r="1.3" opacity="0.4" />
      </svg>
    ),
  },
  {
    key: "discoveryLoyalty",
    tint: "accent",
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5 L10.5 10.5 L8.5 15.5 L13.5 13.5 Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "genrePairings",
    tint: "violet",
    icon: (
      <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="16" cy="12" r="5.5" opacity="0.55" />
      </svg>
    ),
  },
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
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-20 sm:pt-28">
      <section className="text-center">
        <div className="glass-pill mx-auto mb-6 inline-flex rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          {t("eyebrow")}
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-[var(--text-primary)] sm:text-6xl">{t("title")}</h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--text-secondary)]">{t("subtitle")}</p>

        {error && (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            {error === "access_denied" ? t("accessDenied") : t("genericError", { error })}
          </div>
        )}

        <NextLink
          href="/api/auth/login"
          className="glow-accent mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3.5 font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[var(--accent-2)]"
        >
          {t("connect")}
        </NextLink>

        <p className="mx-auto mt-4 max-w-md text-xs text-[var(--text-tertiary)]">{t("connectHint")}</p>
      </section>

      <section className="mt-24">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {t("whatYoullSee")}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.key} className="glass-card p-6">
              <div
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: feature.tint === "accent" ? "var(--accent-soft)" : "var(--violet-soft)",
                  color: feature.tint === "accent" ? "var(--accent)" : "var(--violet)",
                }}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {t(`features.${feature.key}.title`)}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                {t(`features.${feature.key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-tertiary)]">
        <span>{t("footer.readOnly")}</span>
        <span aria-hidden="true">·</span>
        <span>{t("footer.noCache")}</span>
        <span aria-hidden="true">·</span>
        <span>{t("footer.notAffiliated")}</span>
      </section>
    </div>
  );
}
