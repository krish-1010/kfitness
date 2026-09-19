import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplements } from "@/lib/schema";
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
  const { name, time } = body ?? {};

  const patch: Partial<typeof supplements.$inferInsert> = {};
  if (typeof name === "string") patch.name = name;
  if (typeof time === "string") patch.time = time;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(supplements)
    .set(patch)
    .where(and(eq(supplements.id, numericId), eq(supplements.userId, userId)))
    .returning();
  return NextResponse.json(row);
}

// Soft delete — supplement_log stores supplementId as text (this table's id,
// stringified), not a foreign key, so archiving never touches past logs.
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

  await db.update(supplements).set({ archived: true }).where(and(eq(supplements.id, numericId), eq(supplements.userId, userId)));
  return NextResponse.json({ ok: true });
}
