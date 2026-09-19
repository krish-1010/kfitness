import { and, asc, desc, eq, lt } from "drizzle-orm";
import { db } from "./db";
import { workoutSessions, workoutPlans, planDays } from "./schema";

export type PlanDay = typeof planDays.$inferSelect;

export type ResolvedDay = {
  planDayId: number | null; // null = Rest
  label: string;
  variantMode: "none" | "strength_hypertrophy";
  status: string;
  suggested: boolean;
};

// The active plan and its days in cycle order. Returns null if the user
// has no active plan configured yet (e.g. mid-onboarding).
export async function getActivePlan(userId: number): Promise<{ planId: number; fixedRestWeekday: number | null; days: PlanDay[] } | null> {
  const [plan] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, true), eq(workoutPlans.archived, false)));
  if (!plan) return null;

  const days = await db.select().from(planDays).where(eq(planDays.planId, plan.id)).orderBy(asc(planDays.dayIndex));
  return { planId: plan.id, fixedRestWeekday: plan.fixedRestWeekday, days };
}

function weekdayOf(date: string): number {
  return new Date(date + "T00:00:00").getDay();
}

/**
 * Resolves what date D's plan day is:
 * 1. An existing session row for D always wins (logged or manually set).
 * 2. Otherwise the plan's fixedRestWeekday (if set) defaults to Rest.
 * 3. Otherwise the slot advances from the most recent COMPLETED session's
 *    plan_day, to the next one in the active plan's dayIndex order. Skipped/
 *    rest days never advance the cycle, so a missed day's slot carries
 *    forward to the next real session regardless of the calendar date it
 *    lands on. If there's no completed session yet, starts at dayIndex 0.
 *
 * Returns `suggested: true` when no row exists yet — the frontend shows this
 * as an editable suggestion, not a committed fact, until the user acts.
 */
export async function resolveDayType(userId: number, date: string): Promise<ResolvedDay> {
  const [existing] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.date, date)));

  if (existing) {
    if (existing.planDayId === null) {
      return { planDayId: null, label: "Rest", variantMode: "none", status: existing.status, suggested: false };
    }
    const [day] = await db.select().from(planDays).where(eq(planDays.id, existing.planDayId));
    return {
      planDayId: existing.planDayId,
      label: day?.label ?? "Unknown",
      variantMode: (day?.variantMode as "none" | "strength_hypertrophy") ?? "none",
      status: existing.status,
      suggested: false,
    };
  }

  const active = await getActivePlan(userId);
  if (!active || active.days.length === 0) {
    // No plan configured — nothing to suggest.
    return { planDayId: null, label: "Rest", variantMode: "none", status: "planned", suggested: true };
  }

  if (active.fixedRestWeekday !== null && active.fixedRestWeekday === weekdayOf(date)) {
    return { planDayId: null, label: "Rest", variantMode: "none", status: "planned", suggested: true };
  }

  const [lastCompleted] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        lt(workoutSessions.date, date),
        eq(workoutSessions.status, "done")
      )
    )
    .orderBy(desc(workoutSessions.date))
    .limit(1);

  let nextDay = active.days[0]!;
  if (lastCompleted?.planDayId != null) {
    const idx = active.days.findIndex((d) => d.id === lastCompleted.planDayId);
    if (idx !== -1) nextDay = active.days[(idx + 1) % active.days.length]!;
  }

  return {
    planDayId: nextDay.id,
    label: nextDay.label,
    variantMode: nextDay.variantMode as "none" | "strength_hypertrophy",
    status: "planned",
    suggested: true,
  };
}

/**
 * Resolves the strength/hypertrophy variant for a plan_day on date D, when
 * that plan_day's variantMode is 'strength_hypertrophy': counts COMPLETED
 * sessions of that same plan_day before D, alternating strength (0th, 2nd,
 * 4th...) and hypertrophy (1st, 3rd, 5th...). Same skip-tolerant principle
 * as resolveDayType — only completed sessions advance it. Returns null for
 * a plan_day whose variantMode is 'none' — no alternation applies.
 */
export async function resolveVariant(userId: number, planDayId: number, date: string): Promise<"strength" | "hypertrophy" | null> {
  const [day] = await db.select().from(planDays).where(eq(planDays.id, planDayId));
  if (!day || day.variantMode !== "strength_hypertrophy") return null;

  const completed = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.planDayId, planDayId),
        eq(workoutSessions.status, "done"),
        lt(workoutSessions.date, date)
      )
    );

  return completed.length % 2 === 0 ? "strength" : "hypertrophy";
}
