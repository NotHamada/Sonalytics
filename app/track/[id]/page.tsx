import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import TrackDetailClient from "@/components/TrackDetailClient";

export default async function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  // Route params come through still URL-encoded in this Next.js version (not auto-decoded).
  // Spotify track ids are plain base62 so this is a no-op in practice, but decode for
  // correctness/consistency with the artist route, which does need it.
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  return <TrackDetailClient id={id} />;
}
