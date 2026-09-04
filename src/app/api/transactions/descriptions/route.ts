import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();

    const rows = await db
      .select({ descripcion: transactions.descripcion })
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .groupBy(transactions.descripcion)
      .orderBy(sql`count(*) desc`)
      .limit(30)
      .execute();

    return NextResponse.json(rows.map((r) => r.descripcion));
  } catch (e) {
    return handleError(e);
  }
}
