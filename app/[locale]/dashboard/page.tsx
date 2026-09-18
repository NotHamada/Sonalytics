import { redirect } from "@/i18n/navigation";

// Everything that used to live here is now part of /history, which is the
// post-login destination. Kept as a redirect so old links/bookmarks still work.
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/history", locale });
}
