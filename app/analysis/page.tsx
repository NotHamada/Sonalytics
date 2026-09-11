import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import AnalysisClient from "@/components/AnalysisClient";

export default async function AnalysisPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  return <AnalysisClient />;
}
