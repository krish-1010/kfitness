import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLog, exerciseSetLog } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// exerciseSetLog has no userId of its own — ownership is proven by joining
// to its parent exerciseLog row.
async function ownsSet(userId: number, setId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: exerciseSetLog.id })
    .from(exerciseSetLog)
    .innerJoin(exerciseLog, eq(exerciseSetLog.exerciseLogId, exerciseLog.id))
    .where(and(eq(exerciseSetLog.id, setId), eq(exerciseLog.userId, userId)));
  return !!row;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  const userId = getCurrentUserId(req);
  const { setId } = await params;
  const numericId = Number(setId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsSet(userId, numericId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const { reps, weight, durationSeconds, distanceMeters, done } = body ?? {};

  const patch: Partial<typeof exerciseSetLog.$inferInsert> = {};
  if (typeof reps === "string" || reps === null) patch.reps = reps;
  if (typeof weight === "number" || weight === null) patch.weight = weight;
  if (typeof durationSeconds === "number" || durationSeconds === null) patch.durationSeconds = durationSeconds;
  if (typeof distanceMeters === "number" || distanceMeters === null) patch.distanceMeters = distanceMeters;
  if (typeof done === "boolean") patch.done = done;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db.update(exerciseSetLog).set(patch).where(eq(exerciseSetLog.id, numericId)).returning();
  return NextResponse.json(row);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> }
) {
  const userId = getCurrentUserId(req);
  const { setId } = await params;
  const numericId = Number(setId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsSet(userId, numericId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db.delete(exerciseSetLog).where(eq(exerciseSetLog.id, numericId));
  return NextResponse.json({ ok: true });
}
