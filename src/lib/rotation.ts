import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "./db";
import { workoutSessions } from "./schema";

export const CYCLE = ["Push", "Pull", "Legs"] as const;
export type DayType = (typeof CYCLE)[number] | "Rest";

function isSunday(date: string): boolean {
  return new Date(date + "T00:00:00").getDay() === 0;
}

function nextInCycle(type: string): DayType {
  const idx = CYCLE.indexOf(type as (typeof CYCLE)[number]);
  if (idx === -1) return "Push"; // unknown/Rest before it — start the cycle
  return CYCLE[(idx + 1) % CYCLE.length]!;
}

/**
 * Resolves what date D's workout day type is:
 * 1. An existing session row for D always wins (logged or manually set).
 * 2. Otherwise Sunday defaults to a Rest suggestion.
 * 3. Otherwise the type advances from the most recent COMPLETED Push/Pull/Legs
 *    session before D. Skipped/rest days never advance the cycle, so a missed
 *    day's type carries forward to the next real session regardless of the
 *    calendar date it lands on.
 *
 * Returns `suggested: true` when no row exists yet — the frontend shows this
 * as an editable suggestion, not a committed fact, until the user acts.
 */
export async function resolveDayType(
  date: string
): Promise<{ dayType: DayType; status: string; suggested: boolean }> {
  const [existing] = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.date, date));

  if (existing) {
    return { dayType: existing.dayType as DayType, status: existing.status, suggested: false };
  }

  const [lastCompleted] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        lt(workoutSessions.date, date),
        eq(workoutSessions.status, "done")
      )
    )
    .orderBy(desc(workoutSessions.date))
    .limit(1);

  if (isSunday(date)) {
    return { dayType: "Rest", status: "planned", suggested: true };
  }

  const suggested = lastCompleted ? nextInCycle(lastCompleted.dayType) : "Push";
  return { dayType: suggested, status: "planned", suggested: true };
}
