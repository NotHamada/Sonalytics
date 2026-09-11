import { prisma } from "./db";
import type { ParsedPlayEvent } from "./importParser";

const BATCH_SIZE = 1000;

/**
 * Bulk-inserts events using Postgres's native createMany + skipDuplicates — one round
 * trip per batch instead of one per row. That distinction barely mattered on local
 * SQLite (near-zero network cost either way), but against a remote database it's the
 * difference between seconds and tens of minutes for a real multi-year export.
 */
export async function bulkInsertEvents(events: ParsedPlayEvent[]): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const result = await prisma.playEvent.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += result.count;
  }

  return inserted;
}
