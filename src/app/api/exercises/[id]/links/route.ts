import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLinks } from "@/lib/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exerciseId = Number(id);
  if (!Number.isInteger(exerciseId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const rows = await db.select().from(exerciseLinks).where(eq(exerciseLinks.exerciseId, exerciseId));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exerciseId = Number(id);
  if (!Number.isInteger(exerciseId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { label, url } = body ?? {};
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(exerciseLinks)
    .values({ exerciseId, label: typeof label === "string" ? label : "", url })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
