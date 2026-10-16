"use client";

import { Menu, Moon, Sun, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Link, usePathname } from "@/i18n/navigation";

const NAV_ITEMS = [
  { key: "history", href: "/history" },
  { key: "insights", href: "/insights" },
  { key: "analysis", href: "/analysis" },
  { key: "reports", href: "/reports" },
  { key: "import", href: "/import" },
] as const;

function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();

  const itemClass = (active: boolean) =>
    cn(
      "rounded-full px-2.5 py-1 font-mono text-xs",
      active ? "bg-glass-strong text-text-primary" : "text-text-tertiary hover:text-text-primary",
    );

  return (
    <div role="group" className="flex rounded-full border border-glass-border p-0.5">
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
      className="grid h-9 w-9 place-items-center rounded-full border border-glass-border text-text-secondary hover:text-text-primary"
    >
      <Sun className="hidden h-4 w-4 [[data-theme=dark]_&]:block" aria-hidden="true" />
      <Moon className="block h-4 w-4 [[data-theme=dark]_&]:hidden" aria-hidden="true" />
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
    cn(
      "rounded-full px-3.5 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary",
      isActive(href) && "bg-brand-soft font-medium !text-text-primary",
    );

  const controls = (
    <>
      <LanguageSwitcher />
      <ThemeToggle label={t("toggleTheme")} />
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="rounded-full px-2 py-1 text-sm text-text-secondary hover:text-text-primary">
          {t("disconnect")}
        </button>
      </form>
    </>
  );

  return (
    <header className="glass sticky top-3 z-30 mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-6xl rounded-3xl border px-3 py-2 lg:rounded-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 pl-2">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_12px_var(--accent-glow)]" aria-hidden="true" />
            Sonalytics
          </Link>
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
          className="grid h-9 w-9 place-items-center rounded-full border border-glass-border lg:hidden"
        >
          {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
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
                    className={cn("block py-2.5", linkClass(item.href))}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2 border-t border-divider pt-3">{controls}</div>
        </div>
      )}
    </header>
  );
}
