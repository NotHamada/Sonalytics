import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { readStoredTokens } from "@/lib/spotify-auth";
import { prisma } from "@/lib/db";
import { ImportParseError, parseStreamingHistoryFile } from "@/lib/importParser";

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

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

      // SQLite doesn't support Prisma's skipDuplicates, so insert one at a time and
      // skip rows that collide with the unique (trackUri, playedAt) constraint —
      // expected when re-importing an export with overlapping date ranges.
      for (const event of events) {
        try {
          await prisma.playEvent.create({ data: event });
          totalInserted += 1;
        } catch (err) {
          if (!isDuplicateKeyError(err)) throw err;
        }
      }

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
