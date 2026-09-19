import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseLog } from "@/lib/schema";
import { createDefaultSets } from "@/lib/exerciseSetLog";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { date, exerciseId, sets } = body ?? {};

  if (!date || typeof exerciseId !== "number") {
    return NextResponse.json(
      { error: "date and numeric exerciseId are required" },
      { status: 400 }
    );
  }

  const targetSets = typeof sets === "number" ? sets : null;

  const [row] = await db
    .insert(exerciseLog)
    .values({
      userId,
      date,
      exerciseId,
      sets: targetSets,
      done: false,
    })
    .returning();

  const setRows = await createDefaultSets(row!.id, targetSets ?? 1);

  return NextResponse.json({ ...row, sets: setRows }, { status: 201 });
}
