import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "pt-BR"],
  defaultLocale: "en",
  // English keeps today's unprefixed URLs (/history, /insights, ...); only pt-BR gets a
  // /pt-BR prefix. Lowest-risk choice — no existing SEO/URL-stability constraint to weigh
  // against it, and it means the English routes are byte-identical to before this change.
  localePrefix: "as-needed",
});
