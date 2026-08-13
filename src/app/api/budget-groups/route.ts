import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { handleError, unauthorized } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const groups = await db.select().from(budgetGroups).execute();
    return NextResponse.json(groups);
  } catch (e) {
    return handleError(e);
  }
}