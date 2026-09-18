import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import ArtistDetailClient from "@/components/ArtistDetailClient";

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ locale: string; name: string }>;
}) {
  const { locale, name: rawName } = await params;
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect({ href: "/", locale });
  }

  // Route params come through still URL-encoded in this Next.js version (not auto-decoded),
  // so "Cool Band" arrives as "Cool%20Band" — decode it before use, or names with spaces (or
  // any other character requiring escaping) get double-encoded downstream and never match.
  const name = decodeURIComponent(rawName);

  return <ArtistDetailClient name={name} />;
}
