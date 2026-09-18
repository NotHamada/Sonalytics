"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export type NavItem = "history" | "insights" | "analysis" | "reports" | "import";

const NAV_ITEMS: { key: NavItem; href: string }[] = [
  { key: "history", href: "/history" },
  { key: "insights", href: "/insights" },
  { key: "analysis", href: "/analysis" },
  { key: "reports", href: "/reports" },
  { key: "import", href: "/import" },
];

function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <div className="flex items-center gap-1 text-xs">
      <Link
        href={pathname}
        locale="en"
        className={
          locale === "en"
            ? "font-semibold text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        }
      >
        EN
      </Link>
      <span className="text-[var(--text-tertiary)]">/</span>
      <Link
        href={pathname}
        locale="pt-BR"
        className={
          locale === "pt-BR"
            ? "font-semibold text-[var(--text-primary)]"
            : "text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        }
      >
        PT
      </Link>
    </div>
  );
}

/** Shared sticky header for every authenticated page — nav links (each page omits itself),
 *  a language switcher, and the Disconnect logout button. `hideImport` is for the track/artist
 *  detail pages, which don't surface an Import link. `titleExtra` lets History append the
 *  connected account's display name next to the wordmark. */
export default function Header({
  active,
  hideImport,
  titleExtra,
}: {
  active?: NavItem;
  hideImport?: boolean;
  titleExtra?: ReactNode;
}) {
  const t = useTranslations("common.nav");
  const items = NAV_ITEMS.filter((item) => item.key !== active && !(hideImport && item.key === "import"));

  return (
    <header className="glass-pill sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        Sonalytics
        {titleExtra}
      </h1>
      <div className="flex items-center gap-4">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {t(item.key)}
          </Link>
        ))}
        <LanguageSwitcher />
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {t("disconnect")}
          </button>
        </form>
      </div>
    </header>
  );
}
