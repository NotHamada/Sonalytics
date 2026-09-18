import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Named "proxy.ts", not "middleware.ts" — this Next.js version renamed the file convention
// (middleware.ts still works but is deprecated and warns at build time; using both together
// is a hard build error). See node_modules/next/dist/docs/.../proxy.md.
export default createMiddleware(routing);

export const config = {
  // Everything except /api/**, Next internals, and files with an extension (assets). This is
  // critical for /api/auth/callback and /api/auth/login — Spotify's registered redirect_uri
  // is pinned to an exact URL and must never be locale-rewritten.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
