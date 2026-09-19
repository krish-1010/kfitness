import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutPlans, planDays } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// Lists all of the user's plans (for a plan switcher), each with its days.
export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const plans = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, userId), eq(workoutPlans.archived, false)));

  const withDays = await Promise.all(
    plans.map(async (plan) => ({
      ...plan,
      days: await db.select().from(planDays).where(eq(planDays.planId, plan.id)).orderBy(asc(planDays.dayIndex)),
    }))
  );

  return NextResponse.json(withDays);
}

// Creates a new plan with the given day labels, in order. Does NOT activate
// it automatically — switch via PATCH /api/plans/[id] { isActive: true }
// once its exercises are populated, so the day view never suddenly shows an
// empty plan mid-setup.
export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { name, dayLabels, fixedRestWeekday } = body ?? {};

  if (!name || !Array.isArray(dayLabels) || dayLabels.length === 0 || !dayLabels.every((l) => typeof l === "string" && l.trim())) {
    return NextResponse.json({ error: "name and a non-empty array of dayLabels are required" }, { status: 400 });
  }

  const [plan] = await db
    .insert(workoutPlans)
    .values({
      userId,
      name,
      isActive: false,
      fixedRestWeekday: typeof fixedRestWeekday === "number" ? fixedRestWeekday : null,
    })
    .returning();

  const days = await db
    .insert(planDays)
    .values(dayLabels.map((label: string, i: number) => ({ planId: plan!.id, dayIndex: i, label: label.trim(), variantMode: "none" as const })))
    .returning();

  return NextResponse.json({ ...plan, days }, { status: 201 });
}
