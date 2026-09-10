import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const tokens = await readStoredTokens();
  if (tokens) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sonalytics</h1>
          <p className="text-neutral-400">
            See your top artists and tracks, genre breakdown, listening patterns, and more —
            built on your own Spotify data.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error === "access_denied"
              ? "You declined access, so there's nothing to show yet."
              : `Something went wrong: ${error}`}
          </div>
        )}

        <a
          href="/api/auth/login"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] px-6 py-3 font-semibold text-black hover:bg-[#1ed760] transition-colors"
        >
          Connect with Spotify
        </a>

        <p className="text-xs text-neutral-500">
          Requests read-only access to your top items, recent listening history, and saved
          tracks count. Nothing is modified on your account.
        </p>
      </div>
    </div>
  );
}
