import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplementLog } from "@/lib/schema";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { date, supplementId, done } = body ?? {};

  if (!date || !supplementId || typeof done !== "boolean") {
    return NextResponse.json(
      { error: "date, supplementId, and boolean done are required" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(supplementLog)
    .where(and(eq(supplementLog.date, date), eq(supplementLog.supplementId, supplementId)));

  if (existing.length > 0) {
    await db
      .update(supplementLog)
      .set({ done })
      .where(and(eq(supplementLog.date, date), eq(supplementLog.supplementId, supplementId)));
  } else {
    await db.insert(supplementLog).values({ date, supplementId, done });
  }

  return NextResponse.json({ ok: true });
}
