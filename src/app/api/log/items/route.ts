import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logItems } from "@/lib/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = getCurrentUserId(req);
  const body = await req.json();
  const { date, name, protein, kcal } = body ?? {};

  if (!date || !name || typeof protein !== "number") {
    return NextResponse.json(
      { error: "date, name, and numeric protein are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(logItems)
    .values({ userId, date, name, protein, kcal: typeof kcal === "number" ? kcal : 0 })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
