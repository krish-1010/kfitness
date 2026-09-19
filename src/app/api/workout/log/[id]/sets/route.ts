import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseSetLog } from "@/lib/schema";
import { nextSetNumber } from "@/lib/exerciseSetLog";

// Appends one more set row (the "+ set" control) — numbered after whatever
// the highest existing setNumber is, so it works the same whether earlier
// sets were ever removed or not.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exerciseLogId = Number(id);
  if (!Number.isInteger(exerciseLogId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const setNumber = await nextSetNumber(exerciseLogId);
  const [row] = await db.insert(exerciseSetLog).values({ exerciseLogId, setNumber }).returning();
  return NextResponse.json(row, { status: 201 });
}
