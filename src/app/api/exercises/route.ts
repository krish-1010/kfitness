import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercises } from "@/lib/schema";

export async function GET(req: NextRequest) {
  const dayType = req.nextUrl.searchParams.get("dayType");
  const variant = req.nextUrl.searchParams.get("variant");
  const conditions = [eq(exercises.archived, false)];
  if (dayType) conditions.push(eq(exercises.dayType, dayType));
  // 'standard' variant exercises (e.g. core) always show alongside whichever
  // strength/hypertrophy variant is active for that day type.
  if (variant) {
    conditions.push(
      or(eq(exercises.variant, variant), eq(exercises.variant, "standard"))!
    );
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(and(...conditions));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, dayType, defaultSets, defaultReps, restSeconds, variant, block } = body ?? {};

  if (!name || !dayType || !["Push", "Pull", "Legs"].includes(dayType)) {
    return NextResponse.json(
      { error: "name and dayType (Push/Pull/Legs) are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(exercises)
    .values({
      name,
      dayType,
      defaultSets: typeof defaultSets === "number" ? defaultSets : 3,
      defaultReps: defaultReps || "8-12",
      restSeconds: typeof restSeconds === "number" ? restSeconds : null,
      variant: variant || "standard",
      block: block || "main",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
