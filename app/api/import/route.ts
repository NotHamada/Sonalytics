import { NextRequest, NextResponse } from "next/server";
import { readStoredTokens } from "@/lib/spotify-auth";
import { ImportParseError, parseStreamingHistoryFile } from "@/lib/importParser";
import { bulkInsertEvents } from "@/lib/importInsert";

// Receives one chunk of a Streaming_History_*.json file's entries per request — the client splits
// each file up because Vercel rejects request bodies over 4.5 MB (a single export file is bigger).
export async function POST(request: NextRequest) {
  const tokens = await readStoredTokens();
  if (!tokens) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { fileName?: unknown; entries?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "upload";

  try {
    const events = parseStreamingHistoryFile(body.entries, fileName);
    const inserted = await bulkInsertEvents(events);
    return NextResponse.json({ parsed: events.length, inserted });
  } catch (err) {
    if (err instanceof ImportParseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
