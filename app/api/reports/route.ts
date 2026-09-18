import { NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { getValidAccessToken } from "@/lib/spotify-auth";
import { syncRecentPlays } from "@/lib/syncRecentPlays";
import { getPeriodReport } from "@/lib/reportData";
import { routing } from "@/i18n/routing";

export async function GET(request: NextRequest) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    await syncRecentPlays(accessToken);
  } catch {
    // ignore — fall through to whatever's already in the local database
  }

  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale");
  const locale = hasLocale(routing.locales, localeParam) ? localeParam : routing.defaultLocale;
  const data = await getPeriodReport(accessToken, "month", searchParams.get("month"), locale);
  return NextResponse.json(data);
}
