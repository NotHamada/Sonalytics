import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import ImportClient from "@/components/ImportClient";

export default async function ImportPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ImportClient />
    </div>
  );
}
