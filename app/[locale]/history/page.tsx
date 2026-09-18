import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import HistoryClient from "@/components/HistoryClient";

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect({ href: "/", locale });
  }

  return <HistoryClient />;
}
