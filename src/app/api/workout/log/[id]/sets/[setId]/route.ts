import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseSetLog } from "@/lib/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;
  const numericId = Number(setId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
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
  _req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;
  const numericId = Number(setId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await db.delete(exerciseSetLog).where(eq(exerciseSetLog.id, numericId));
  return NextResponse.json({ ok: true });
}
