import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weights } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const rows = await db.select().from(weights).where(eq(weights.userId, userId)).orderBy(asc(weights.date));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { date, weight } = body ?? {};

  if (!date || typeof weight !== "number") {
    return NextResponse.json({ error: "date and numeric weight are required" }, { status: 400 });
  }

  const existing = await db.select().from(weights).where(and(eq(weights.userId, userId), eq(weights.date, date)));
  if (existing.length > 0) {
    await db.update(weights).set({ weight }).where(and(eq(weights.userId, userId), eq(weights.date, date)));
  } else {
    await db.insert(weights).values({ userId, date, weight });
  }

  const rows = await db.select().from(weights).where(eq(weights.userId, userId)).orderBy(asc(weights.date));
  return NextResponse.json(rows);
}
