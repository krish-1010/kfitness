import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLog } from "@/lib/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { sets, reps, weight, done } = body ?? {};

  const patch: Partial<typeof exerciseLog.$inferInsert> = {};
  if (typeof sets === "number") patch.sets = sets;
  if (typeof reps === "string") patch.reps = reps;
  if (typeof weight === "number") patch.weight = weight;
  if (typeof done === "boolean") patch.done = done;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db.update(exerciseLog).set(patch).where(eq(exerciseLog.id, numericId)).returning();
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await db.delete(exerciseLog).where(eq(exerciseLog.id, numericId));
  return NextResponse.json({ ok: true });
}
