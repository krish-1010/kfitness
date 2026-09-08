import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { weights } from "@/lib/schema";

export async function GET() {
  const rows = await db.select().from(weights).orderBy(asc(weights.date));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, weight } = body ?? {};

  if (!date || typeof weight !== "number") {
    return NextResponse.json({ error: "date and numeric weight are required" }, { status: 400 });
  }

  const existing = await db.select().from(weights).where(eq(weights.date, date));
  if (existing.length > 0) {
    await db.update(weights).set({ weight }).where(eq(weights.date, date));
  } else {
    await db.insert(weights).values({ date, weight });
  }

  const rows = await db.select().from(weights).orderBy(asc(weights.date));
  return NextResponse.json(rows);
}
