import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foods } from "@/lib/schema";
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
  const { name, protein, kcal } = body ?? {};

  const patch: Partial<typeof foods.$inferInsert> = {};
  if (typeof name === "string") patch.name = name;
  if (typeof protein === "number") patch.protein = protein;
  if (typeof kcal === "number") patch.kcal = kcal;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(foods)
    .set(patch)
    .where(and(eq(foods.id, numericId), eq(foods.userId, userId)))
    .returning();
  return NextResponse.json(row);
}

// Soft delete — logItems stores name/protein/kcal as a snapshot, not a
// foreign key, so archiving a food never touches past logged days.
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

  await db.update(foods).set({ archived: true }).where(and(eq(foods.id, numericId), eq(foods.userId, userId)));
  return NextResponse.json({ ok: true });
}
