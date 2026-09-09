import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foods } from "@/lib/schema";

export async function GET() {
  const rows = await db.select().from(foods).where(eq(foods.archived, false));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
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
    .values({ name, protein, kcal: typeof kcal === "number" ? kcal : 0 })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
