import { redirect } from "next/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect("/");
  }

  return <DashboardClient />;
}
