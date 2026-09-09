import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseLog } from "@/lib/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, exerciseId, sets, reps, weight } = body ?? {};

  if (!date || typeof exerciseId !== "number") {
    return NextResponse.json(
      { error: "date and numeric exerciseId are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(exerciseLog)
    .values({
      date,
      exerciseId,
      sets: typeof sets === "number" ? sets : null,
      reps: typeof reps === "string" ? reps : null,
      weight: typeof weight === "number" ? weight : null,
      done: false,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
