"use client";

import { useTranslations } from "next-intl";
import type { CardTheme } from "@/lib/cardThemes";

/** Miniature of the 9:16 card that /api/reports/card renders, colored from the same theme
 *  definitions, so what you pick here is what you download. */
export default function ShareCardPreview({
  theme,
  label,
  minutes,
  artists,
  tracks,
  heroImage,
}: {
  theme: CardTheme;
  label: string;
  minutes: string;
  artists: string[];
  tracks: string[];
  heroImage?: string | null;
}) {
  const t = useTranslations("card");

  return (
    <div
      role="img"
      aria-label={`${t("yourWrapped")} ${t("forPeriod", { label })}`}
      className="mx-auto flex aspect-[9/16] w-full max-w-[300px] flex-col gap-4 overflow-hidden rounded-[24px] p-5 shadow-2xl transition-[background] duration-300"
      style={{ background: theme.panelBg, color: theme.textPrimary }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ background: theme.heroGradient }}>
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: theme.textSecondary }}>
          {t("sonalytics")}
        </p>
        <p className="text-lg font-semibold leading-tight">
          {t("yourWrapped")} {t("forPeriod", { label })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        {[
          [t("topArtists"), artists],
          [t("topTracks"), tracks],
        ].map(([title, list]) => (
          <div key={title as string} className="min-w-0">
            <p className="mb-1 font-semibold" style={{ color: theme.textSecondary }}>
              {title as string}
            </p>
            <ol className="flex flex-col gap-0.5">
              {(list as string[]).map((name, i) => (
                <li key={`${i}-${name}`} className="truncate">
                  <span className="mr-1 font-mono opacity-60">{i + 1}</span>
                  {name}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="mt-auto">
        <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>
          {t("minutesListened")}
        </p>
        <p className="font-mono text-4xl font-bold" style={{ color: theme.accent }}>
          {minutes}
        </p>
      </div>
    </div>
  );
}
