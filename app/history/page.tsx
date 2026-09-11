import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import HistoryClient from "@/components/HistoryClient";

export default async function HistoryPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  return <HistoryClient />;
}
