import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foods } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const rows = await db.select().from(foods).where(and(eq(foods.userId, userId), eq(foods.archived, false)));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { name, protein, kcal } = body ?? {};

  if (!name || typeof protein !== "number") {
    return NextResponse.json(
      { error: "name and numeric protein are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(foods)
    .values({ userId, name, protein, kcal: typeof kcal === "number" ? kcal : 0 })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
