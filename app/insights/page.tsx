import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import InsightsClient from "@/components/InsightsClient";

export default async function InsightsPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  return <InsightsClient />;
}
