import { NextRequest, NextResponse } from "next/server";
import { readStoredTokens } from "@/lib/spotify-auth";
import { ImportParseError, parseStreamingHistoryFile } from "@/lib/importParser";
import { bulkInsertEvents } from "@/lib/importInsert";

export async function POST(request: NextRequest) {
  const tokens = await readStoredTokens();
  if (!tokens) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  let totalParsed = 0;
  let totalInserted = 0;
  const fileResults: { name: string; parsed: number; error?: string }[] = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const events = parseStreamingHistoryFile(json, file.name);
      totalParsed += events.length;

      totalInserted += await bulkInsertEvents(events);
      fileResults.push({ name: file.name, parsed: events.length });
    } catch (err) {
      const message =
        err instanceof ImportParseError
          ? err.message
          : err instanceof SyntaxError
            ? `${file.name} isn't valid JSON.`
            : err instanceof Error
              ? err.message
              : "Unknown error";
      fileResults.push({ name: file.name, parsed: 0, error: message });
    }
  }

  return NextResponse.json({ totalParsed, totalInserted, files: fileResults });
}
