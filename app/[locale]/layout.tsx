import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sonalytics",
  description: "Personal Spotify listening analytics dashboard.",
};

// Spotify's redirect_uri (and our OAuth state cookie) is pinned to 127.0.0.1 for local dev,
// since Spotify requires an exact match and won't accept `localhost`. If the browser reaches
// this app via `localhost` instead, the cookie set there won't be sent back on the 127.0.0.1
// callback request, breaking the OAuth state check. Bounce to 127.0.0.1 as soon as possible.
// `afterInteractive` (not `beforeInteractive`) because this layout remounts on client-side
// locale switches, and `beforeInteractive`'s special first-load-only injection triggers a
// React warning ("script tag ... never executed on the client") on any later re-render.
const CANONICAL_HOST_SCRIPT = `
if (location.hostname === "localhost") {
  location.replace(location.href.replace("localhost", "127.0.0.1"));
}
`;

// Runs before first paint so the saved (or OS-preferred) theme is on <html> before any CSS paints —
// otherwise a light-theme user with a dark OS would see a dark flash on every load.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("sona-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {process.env.NODE_ENV !== "production" && (
          <Script id="canonical-host" strategy="afterInteractive">
            {CANONICAL_HOST_SCRIPT}
          </Script>
        )}
        <div className="bg-mesh" aria-hidden="true">
          <div className="blob-3" />
        </div>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
