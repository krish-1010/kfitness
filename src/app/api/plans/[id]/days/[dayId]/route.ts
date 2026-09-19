import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { planDays, workoutPlans, exercises } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

async function ownsDay(userId: number, planId: number, dayId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: planDays.id })
    .from(planDays)
    .innerJoin(workoutPlans, eq(planDays.planId, workoutPlans.id))
    .where(and(eq(planDays.id, dayId), eq(planDays.planId, planId), eq(workoutPlans.userId, userId)));
  return !!row;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id, dayId } = await params;
  const planId = Number(id);
  const numericDayId = Number(dayId);
  if (!Number.isInteger(planId) || !Number.isInteger(numericDayId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsDay(userId, planId, numericDayId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const { label, variantMode } = body ?? {};
  const patch: Partial<typeof planDays.$inferInsert> = {};
  if (typeof label === "string" && label.trim()) patch.label = label.trim();
  if (variantMode === "none" || variantMode === "strength_hypertrophy") patch.variantMode = variantMode;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db.update(planDays).set(patch).where(eq(planDays.id, numericDayId)).returning();
  return NextResponse.json(row);
}

// Blocked if any active exercise still references this day — delete/move
// those first, rather than silently orphaning them.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id, dayId } = await params;
  const planId = Number(id);
  const numericDayId = Number(dayId);
  if (!Number.isInteger(planId) || !Number.isInteger(numericDayId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsDay(userId, planId, numericDayId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [stillUsed] = await db.select().from(exercises).where(and(eq(exercises.planDayId, numericDayId), eq(exercises.archived, false)));
  if (stillUsed) {
    return NextResponse.json({ error: "this day still has active exercises — move or delete them first" }, { status: 409 });
  }

  await db.delete(planDays).where(eq(planDays.id, numericDayId));
  return NextResponse.json({ ok: true });
}
