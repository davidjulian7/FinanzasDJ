import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const groups = db.select().from(budgetGroups).all();
  return NextResponse.json(groups);
}