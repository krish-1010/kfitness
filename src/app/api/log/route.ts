import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logItems, supplementLog } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  const [items, supps] = await Promise.all([
    db.select().from(logItems).where(and(eq(logItems.userId, userId), eq(logItems.date, date))),
    db.select().from(supplementLog).where(and(eq(supplementLog.userId, userId), eq(supplementLog.date, date))),
  ]);

  const supplements: Record<string, boolean> = {};
  for (const s of supps) supplements[s.supplementId] = s.done;

  return NextResponse.json({ items, supplements });
}
