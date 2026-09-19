import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLinks, exercises } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

// exerciseLinks has no userId of its own — ownership is proven by checking
// the parent exercise belongs to the current user before touching its links.
async function ownsExercise(userId: number, exerciseId: number): Promise<boolean> {
  const [row] = await db.select().from(exercises).where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
  return !!row;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const exerciseId = Number(id);
  if (!Number.isInteger(exerciseId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsExercise(userId, exerciseId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rows = await db.select().from(exerciseLinks).where(eq(exerciseLinks.exerciseId, exerciseId));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const exerciseId = Number(id);
  if (!Number.isInteger(exerciseId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!(await ownsExercise(userId, exerciseId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
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
