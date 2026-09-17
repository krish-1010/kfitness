import { inArray } from "drizzle-orm";
import { db } from "./db";
import { exerciseLinks } from "./schema";

// Merged in JS rather than a SQL join+groupBy — exercise counts here are
// always small (dozens, not thousands), and this keeps the exercises query
// itself simple to read.
export async function getLinkCounts(exerciseIds: number[]): Promise<Record<number, number>> {
  if (exerciseIds.length === 0) return {};
  const rows = await db
    .select({ exerciseId: exerciseLinks.exerciseId })
    .from(exerciseLinks)
    .where(inArray(exerciseLinks.exerciseId, exerciseIds));

  const counts: Record<number, number> = {};
  for (const row of rows) {
    counts[row.exerciseId] = (counts[row.exerciseId] ?? 0) + 1;
  }
  return counts;
}
