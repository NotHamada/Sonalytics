import { redirect } from "@/i18n/navigation";
import { readStoredTokens } from "@/lib/spotify-auth";
import AnalysisClient from "@/components/AnalysisClient";

export default async function AnalysisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tokens = await readStoredTokens();
  if (!tokens) {
    redirect({ href: "/", locale });
  }

  return <AnalysisClient />;
}
