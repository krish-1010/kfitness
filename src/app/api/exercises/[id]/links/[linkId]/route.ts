import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLinks, exercises } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

async function ownsExercise(userId: number, exerciseId: number): Promise<boolean> {
  const [row] = await db.select().from(exercises).where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
  return !!row;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id, linkId } = await params;
  const exerciseId = Number(id);
  const numericId = Number(linkId);
  if (!Number.isInteger(exerciseId) || !Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsExercise(userId, exerciseId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const { label, url } = body ?? {};
  const patch: Partial<typeof exerciseLinks.$inferInsert> = {};
  if (typeof label === "string") patch.label = label;
  if (typeof url === "string" && url) patch.url = url;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(exerciseLinks)
    .set(patch)
    .where(and(eq(exerciseLinks.id, numericId), eq(exerciseLinks.exerciseId, exerciseId)))
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id, linkId } = await params;
  const exerciseId = Number(id);
  const numericId = Number(linkId);
  if (!Number.isInteger(exerciseId) || !Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsExercise(userId, exerciseId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db.delete(exerciseLinks).where(and(eq(exerciseLinks.id, numericId), eq(exerciseLinks.exerciseId, exerciseId)));
  return NextResponse.json({ ok: true });
}
