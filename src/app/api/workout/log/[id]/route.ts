import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLog, exerciseSetLog } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// Only toggles the whole-exercise `done` flag now — per-set reps/weight/
// duration/distance are edited via /api/workout/log/[id]/sets/[setId].
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
  const { done } = body ?? {};

  if (typeof done !== "boolean") {
    return NextResponse.json({ error: "done (boolean) is required" }, { status: 400 });
  }

  const [row] = await db
    .update(exerciseLog)
    .set({ done })
    .where(and(eq(exerciseLog.id, numericId), eq(exerciseLog.userId, userId)))
    .returning();
  return NextResponse.json(row);
}

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

  // No DB foreign key, so the child set rows need an explicit delete first.
  await db.delete(exerciseSetLog).where(eq(exerciseSetLog.exerciseLogId, numericId));
  await db.delete(exerciseLog).where(and(eq(exerciseLog.id, numericId), eq(exerciseLog.userId, userId)));
  return NextResponse.json({ ok: true });
}
