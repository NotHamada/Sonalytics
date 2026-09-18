import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import AlbumDetailClient from "@/components/AlbumDetailClient";

export default async function AlbumDetailPage({
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
  // so "Cool Album" arrives as "Cool%20Album" — decode it before use, or names with spaces (or
  // any other character requiring escaping) get double-encoded downstream and never match.
  const name = decodeURIComponent(rawName);

  return <AlbumDetailClient name={name} />;
}
