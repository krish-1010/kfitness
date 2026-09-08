import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logItems, supplementLog } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  const [items, supps] = await Promise.all([
    db.select().from(logItems).where(eq(logItems.date, date)),
    db.select().from(supplementLog).where(eq(supplementLog.date, date)),
  ]);

  const supplements: Record<string, boolean> = {};
  for (const s of supps) supplements[s.supplementId] = s.done;

  return NextResponse.json({ items, supplements });
}
