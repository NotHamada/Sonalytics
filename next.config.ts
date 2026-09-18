import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The OAuth redirect_uri is pinned to 127.0.0.1 (Spotify requires an exact match and
  // rejects `localhost`), but Next's dev server otherwise treats `localhost` as its
  // default trusted origin. Without this, requests via 127.0.0.1 get treated as foreign
  // cross-origin traffic, which was corrupting redirect URLs built from the request.
  allowedDevOrigins: ["127.0.0.1"],
};

export default withNextIntl(nextConfig);
