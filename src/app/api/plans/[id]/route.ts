import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { workoutPlans } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { name, isActive, fixedRestWeekday } = body ?? {};

  const patch: Partial<typeof workoutPlans.$inferInsert> = {};
  if (typeof name === "string") patch.name = name;
  if (typeof fixedRestWeekday === "number" || fixedRestWeekday === null) patch.fixedRestWeekday = fixedRestWeekday;
  if (isActive === true) patch.isActive = true;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  // Only one plan is active at a time — deactivate any other active plan
  // for this user before activating this one.
  if (isActive === true) {
    await db
      .update(workoutPlans)
      .set({ isActive: false })
      .where(and(eq(workoutPlans.userId, userId), ne(workoutPlans.id, numericId)));
  }

  const [row] = await db
    .update(workoutPlans)
    .set(patch)
    .where(and(eq(workoutPlans.id, numericId), eq(workoutPlans.userId, userId)))
    .returning();
  return NextResponse.json(row);
}

// Soft delete — archive instead of removing, so past workout_sessions/
// exercises referencing its plan_days still resolve.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await db
    .update(workoutPlans)
    .set({ archived: true, isActive: false })
    .where(and(eq(workoutPlans.id, numericId), eq(workoutPlans.userId, userId)));
  return NextResponse.json({ ok: true });
}
