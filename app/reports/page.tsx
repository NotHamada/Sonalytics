import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import ReportsClient from "@/components/ReportsClient";

export default async function ReportsPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  return <ReportsClient />;
}
