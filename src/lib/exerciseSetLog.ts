import { inArray, eq, asc } from "drizzle-orm";
import { db } from "./db";
import { exerciseSetLog } from "./schema";

export type SetRow = {
  id: number;
  setNumber: number;
  reps: string | null;
  weight: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  done: boolean;
};

// One query for all log rows on a date, grouped in JS — same pattern as
// getLinkCounts, avoids N+1 across however many exercises are logged.
export async function getSetsByLogId(exerciseLogIds: number[]): Promise<Record<number, SetRow[]>> {
  if (exerciseLogIds.length === 0) return {};
  const rows = await db
    .select()
    .from(exerciseSetLog)
    .where(inArray(exerciseSetLog.exerciseLogId, exerciseLogIds))
    .orderBy(asc(exerciseSetLog.setNumber));

  const grouped: Record<number, SetRow[]> = {};
  for (const row of rows) {
    (grouped[row.exerciseLogId] ??= []).push(row);
  }
  return grouped;
}

// Creates `count` empty set rows (1..count) for a freshly-logged exercise.
export async function createDefaultSets(exerciseLogId: number, count: number) {
  const n = count > 0 ? count : 1;
  const values = Array.from({ length: n }, (_, i) => ({ exerciseLogId, setNumber: i + 1 }));
  return db.insert(exerciseSetLog).values(values).returning();
}

export async function nextSetNumber(exerciseLogId: number): Promise<number> {
  const rows = await db.select().from(exerciseSetLog).where(eq(exerciseSetLog.exerciseLogId, exerciseLogId));
  return rows.reduce((max, r) => Math.max(max, r.setNumber), 0) + 1;
}
