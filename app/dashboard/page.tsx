import { redirect } from "next/navigation";

// Everything that used to live here is now part of /history, which is the
// post-login destination. Kept as a redirect so old links/bookmarks still work.
export default function DashboardPage() {
  redirect("/history");
}
