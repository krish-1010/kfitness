import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLinks } from "@/lib/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { linkId } = await params;
  const numericId = Number(linkId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { label, url } = body ?? {};
  const patch: Partial<typeof exerciseLinks.$inferInsert> = {};
  if (typeof label === "string") patch.label = label;
  if (typeof url === "string" && url) patch.url = url;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
  }

  const [row] = await db.update(exerciseLinks).set(patch).where(eq(exerciseLinks.id, numericId)).returning();
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { linkId } = await params;
  const numericId = Number(linkId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await db.delete(exerciseLinks).where(eq(exerciseLinks.id, numericId));
  return NextResponse.json({ ok: true });
}
