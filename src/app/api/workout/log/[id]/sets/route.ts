import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseLog, exerciseSetLog } from "@/lib/schema";
import { nextSetNumber } from "@/lib/exerciseSetLog";
import { getCurrentUserId } from "@/lib/auth";

// Appends one more set row (the "+ set" control) — numbered after whatever
// the highest existing setNumber is, so it works the same whether earlier
// sets were ever removed or not.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getCurrentUserId(req);
  const { id } = await params;
  const exerciseLogId = Number(id);
  if (!Number.isInteger(exerciseLogId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [owned] = await db.select().from(exerciseLog).where(and(eq(exerciseLog.id, exerciseLogId), eq(exerciseLog.userId, userId)));
  if (!owned) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const setNumber = await nextSetNumber(exerciseLogId);
  const [row] = await db.insert(exerciseSetLog).values({ exerciseLogId, setNumber }).returning();
  return NextResponse.json(row, { status: 201 });
}
