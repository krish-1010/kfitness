import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercises, planDays, workoutPlans } from "@/lib/schema";
import { getLinkCounts } from "@/lib/exerciseLinks";
import { getCurrentUserId } from "@/lib/auth";

// plan_days has no userId of its own — ownership is proven by joining to
// its parent workout_plans row.
async function ownsPlanDay(userId: number, planDayId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: planDays.id })
    .from(planDays)
    .innerJoin(workoutPlans, eq(planDays.planId, workoutPlans.id))
    .where(and(eq(planDays.id, planDayId), eq(workoutPlans.userId, userId)));
  return !!row;
}

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const planDayIdParam = req.nextUrl.searchParams.get("planDayId");
  const variant = req.nextUrl.searchParams.get("variant");
  const conditions = [eq(exercises.userId, userId), eq(exercises.archived, false)];
  if (planDayIdParam) conditions.push(eq(exercises.planDayId, Number(planDayIdParam)));
  // 'standard' variant exercises (e.g. core) always show alongside whichever
  // strength/hypertrophy variant is active for that plan day.
  if (variant) {
    conditions.push(
      or(eq(exercises.variant, variant), eq(exercises.variant, "standard"))!
    );
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(and(...conditions));

  const linkCounts = await getLinkCounts(rows.map((r) => r.id));
  return NextResponse.json(rows.map((r) => ({ ...r, linkCount: linkCounts[r.id] ?? 0 })));
}

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { name, planDayId, defaultSets, defaultReps, restSeconds, variant, block, muscleGroup, trackingType } = body ?? {};

  if (!name || typeof planDayId !== "number") {
    return NextResponse.json(
      { error: "name and numeric planDayId are required" },
      { status: 400 }
    );
  }
  if (!(await ownsPlanDay(userId, planDayId))) {
    return NextResponse.json({ error: "invalid planDayId" }, { status: 400 });
  }

  const [row] = await db
    .insert(exercises)
    .values({
      userId,
      name,
      planDayId,
      defaultSets: typeof defaultSets === "number" ? defaultSets : 3,
      defaultReps: defaultReps || "8-12",
      restSeconds: typeof restSeconds === "number" ? restSeconds : null,
      variant: variant || "standard",
      block: block || "main",
      muscleGroup: typeof muscleGroup === "string" ? muscleGroup : "",
      trackingType: ["reps_weight", "duration_distance"].includes(trackingType) ? trackingType : "reps_weight",
    })
    .returning();

  return NextResponse.json({ ...row, linkCount: 0 }, { status: 201 });
}
