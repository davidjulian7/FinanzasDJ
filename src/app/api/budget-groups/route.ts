import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const groups = db.select().from(budgetGroups).all();
  return NextResponse.json(groups);
}