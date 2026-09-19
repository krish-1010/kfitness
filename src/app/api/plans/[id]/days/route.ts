import { NextRequest, NextResponse } from "next/server";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { planDays, workoutPlans } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

async function ownsPlan(userId: number, planId: number): Promise<boolean> {
  const [row] = await db.select().from(workoutPlans).where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, userId)));
  return !!row;
}

// Appends a new day at the end of the plan's cycle.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsPlan(userId, planId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const { label, variantMode } = body ?? {};
  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const [row0] = await db.select({ value: max(planDays.dayIndex) }).from(planDays).where(eq(planDays.planId, planId));
  const nextIndex = row0?.value == null ? 0 : row0.value + 1;

  const [row] = await db
    .insert(planDays)
    .values({
      planId,
      dayIndex: nextIndex,
      label: label.trim(),
      variantMode: variantMode === "strength_hypertrophy" ? "strength_hypertrophy" : "none",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

// Reorders every day in the plan to match the given full ordered list of
// day ids — done as one operation (rather than swapping individual
// dayIndex values) to never collide with the (planId, dayIndex) unique
// constraint mid-update.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsPlan(userId, planId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const { orderedDayIds } = body ?? {};
  if (!Array.isArray(orderedDayIds) || !orderedDayIds.every((x) => typeof x === "number")) {
    return NextResponse.json({ error: "orderedDayIds (number[]) is required" }, { status: 400 });
  }

  const existingDays = await db.select().from(planDays).where(eq(planDays.planId, planId));
  if (existingDays.length !== orderedDayIds.length || !existingDays.every((d) => orderedDayIds.includes(d.id))) {
    return NextResponse.json({ error: "orderedDayIds must contain exactly this plan's current day ids" }, { status: 400 });
  }

  // Two-pass update avoids transiently colliding with the unique
  // (planId, dayIndex) constraint: push everything to a high temporary
  // range first, then assign the real final indexes.
  for (let i = 0; i < orderedDayIds.length; i++) {
    await db.update(planDays).set({ dayIndex: 1000 + i }).where(eq(planDays.id, orderedDayIds[i]!));
  }
  for (let i = 0; i < orderedDayIds.length; i++) {
    await db.update(planDays).set({ dayIndex: i }).where(eq(planDays.id, orderedDayIds[i]!));
  }

  const days = await db.select().from(planDays).where(eq(planDays.planId, planId));
  return NextResponse.json(days.sort((a, b) => a.dayIndex - b.dayIndex));
}
