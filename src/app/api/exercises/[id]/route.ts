import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercises } from "@/lib/schema";

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
  const { name, dayType, defaultSets, defaultReps } = body ?? {};

  const patch: Partial<typeof exercises.$inferInsert> = {};
  if (typeof name === "string") patch.name = name;
  if (dayType && ["Push", "Pull", "Legs"].includes(dayType)) patch.dayType = dayType;
  if (typeof defaultSets === "number") patch.defaultSets = defaultSets;
  if (typeof defaultReps === "string") patch.defaultReps = defaultReps;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db.update(exercises).set(patch).where(eq(exercises.id, numericId)).returning();
  return NextResponse.json(row);
}

// Soft delete — archive instead of removing, so past exercise_log rows
// (which reference exerciseId but aren't a DB foreign key) still resolve.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await db.update(exercises).set({ archived: true }).where(eq(exercises.id, numericId));
  return NextResponse.json({ ok: true });
}
