"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const NAV_ITEMS = [
  { key: "history", href: "/history" },
  { key: "insights", href: "/insights" },
  { key: "analysis", href: "/analysis" },
  { key: "reports", href: "/reports" },
  { key: "import", href: "/import" },
] as const;

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4",
  "aria-hidden": true,
};

function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();

  const itemClass = (active: boolean) =>
    `rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${
      active
        ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)]"
        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
    }`;

  return (
    <div className="flex rounded-full border border-[var(--glass-border)] p-0.5">
      <Link href={pathname} locale="en" aria-current={locale === "en" ? "true" : undefined} className={itemClass(locale === "en")}>
        EN
      </Link>
      <Link href={pathname} locale="pt-BR" aria-current={locale === "pt-BR" ? "true" : undefined} className={itemClass(locale === "pt-BR")}>
        PT
      </Link>
    </div>
  );
}

/** Flips <html data-theme> directly instead of holding React state: the attribute is set before
 *  first paint by the script in the root layout, so state here could only ever lag behind it. The
 *  icon swap is pure CSS keyed on that same attribute. */
function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("sona-theme", next);
    } catch {
      // storage unavailable (private mode) — the choice just won't persist
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--glass-border)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
    >
      <svg {...ICON_PROPS} className="hidden h-4 w-4 [[data-theme=dark]_&]:block">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg {...ICON_PROPS} className="block h-4 w-4 [[data-theme=dark]_&]:hidden">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}

/** Shared floating header for every authenticated page — nav links with the current page
 *  highlighted, a language switcher, a light/dark toggle, and the Disconnect logout button.
 *  `titleExtra` lets History show the connected account's name next to the wordmark. */
export default function Header({ titleExtra }: { titleExtra?: ReactNode }) {
  const t = useTranslations("common.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `rounded-full px-3.5 py-1.5 text-sm transition-colors ${
      isActive(href)
        ? "bg-[var(--accent-soft)] font-medium text-[var(--text-primary)]"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`;

  const controls = (
    <>
      <LanguageSwitcher />
      <ThemeToggle label={t("toggleTheme")} />
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          {t("disconnect")}
        </button>
      </form>
    </>
  );

  return (
    <header className="glass-pill sticky top-3 z-30 mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-6xl rounded-3xl px-3 py-2 lg:rounded-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 pl-2">
          <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            <Link href="/" className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]"
                aria-hidden="true"
              />
              Sonalytics
            </Link>
          </h1>
          {titleExtra}
        </div>

        <nav aria-label={t("main")} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={linkClass(item.href)}>
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">{controls}</div>

        <button
          type="button"
          aria-label={t("menu")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--glass-border)] text-[var(--text-secondary)] lg:hidden"
        >
          <svg {...ICON_PROPS}>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="fade-up flex flex-col gap-3 px-2 pb-3 pt-4 lg:hidden">
          <nav aria-label={t("main")}>
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`block py-2.5 ${linkClass(item.href)}`}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2 border-t border-[var(--divider)] pt-3">{controls}</div>
        </div>
      )}
    </header>
  );
}
