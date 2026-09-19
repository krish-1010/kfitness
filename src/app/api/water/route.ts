import { NextRequest, NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { waterLog } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param required" }, { status: 400 });
  }

  const entries = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), eq(waterLog.date, date)))
    .orderBy(asc(waterLog.createdAt));

  const total = entries.reduce((s, e) => s + e.amountMl, 0);
  return NextResponse.json({ entries, total });
}

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { date, amountMl } = body ?? {};

  if (!date || typeof amountMl !== "number" || amountMl <= 0) {
    return NextResponse.json(
      { error: "date and a positive numeric amountMl are required" },
      { status: 400 }
    );
  }

  const [row] = await db.insert(waterLog).values({ userId, date, amountMl }).returning();
  return NextResponse.json(row, { status: 201 });
}
