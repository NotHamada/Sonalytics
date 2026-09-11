import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

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
// callback request, breaking the OAuth state check. Bounce to 127.0.0.1 before anything loads.
const CANONICAL_HOST_SCRIPT = `
if (location.hostname === "localhost") {
  location.replace(location.href.replace("localhost", "127.0.0.1"));
}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {process.env.NODE_ENV !== "production" && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: CANONICAL_HOST_SCRIPT }} />
        </head>
      )}
      <body className="min-h-full flex flex-col">
        <div className="bg-mesh" aria-hidden="true">
          <div className="blob-3" />
        </div>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
