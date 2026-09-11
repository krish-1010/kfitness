import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { waterLog } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  const entries = await db
    .select()
    .from(waterLog)
    .where(eq(waterLog.date, date))
    .orderBy(asc(waterLog.createdAt));

  const total = entries.reduce((s, e) => s + e.amountMl, 0);
  return NextResponse.json({ entries, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, amountMl } = body ?? {};

  if (!date || typeof amountMl !== "number" || amountMl <= 0) {
    return NextResponse.json(
      { error: "date and a positive numeric amountMl are required" },
      { status: 400 }
    );
  }

  const [row] = await db.insert(waterLog).values({ date, amountMl }).returning();
  return NextResponse.json(row, { status: 201 });
}
