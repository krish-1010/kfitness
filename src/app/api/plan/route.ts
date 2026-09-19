import { NextRequest, NextResponse } from "next/server";
import { asc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutPlans, planDays } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// Returns the current user's active plan and its days in cycle order —
// drives the day dropdown, exercise-creation day picker, manage-library
// grouping, and the Full Program table. Returns { plan: null, days: [] }
// if no plan is active yet (fresh account with no plan configured).
export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const [plan] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, true), eq(workoutPlans.archived, false)));

  if (!plan) {
    return NextResponse.json({ plan: null, days: [] });
  }

  const days = await db.select().from(planDays).where(eq(planDays.planId, plan.id)).orderBy(asc(planDays.dayIndex));
  return NextResponse.json({ plan, days });
}
