import { NextResponse } from "next/server";
import { clearTokens, getAppOrigin } from "@/lib/spotify-auth";

export async function POST() {
  await clearTokens();
  return NextResponse.redirect(`${getAppOrigin()}/`);
}
