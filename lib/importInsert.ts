import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { ParsedPlayEvent } from "./importParser";

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const CHUNK_SIZE = 300;

/**
 * Inserts events in chunked transactions. A real multi-year export is tens of
 * thousands of rows — one autocommit-per-row insert loop is painfully slow on SQLite
 * (every row pays a full commit/fsync). Falls back to per-row inserts only for chunks
 * that hit a duplicate-key conflict, so the common case (a fresh import) stays fast.
 */
export async function bulkInsertEvents(events: ParsedPlayEvent[]): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < events.length; i += CHUNK_SIZE) {
    const chunk = events.slice(i, i + CHUNK_SIZE);
    try {
      await prisma.$transaction(chunk.map((event) => prisma.playEvent.create({ data: event })));
      inserted += chunk.length;
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      // At least one duplicate in this chunk rolled the whole transaction back —
      // insert its rows individually so the valid ones aren't lost too.
      for (const event of chunk) {
        try {
          await prisma.playEvent.create({ data: event });
          inserted += 1;
        } catch (innerErr) {
          if (!isDuplicateKeyError(innerErr)) throw innerErr;
        }
      }
    }
  }

  return inserted;
}
