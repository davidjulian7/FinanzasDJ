import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringExpenses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const existing = (
      await db
        .select()
        .from(recurringExpenses)
        .where(and(eq(recurringExpenses.id, Number(id)), eq(recurringExpenses.userId, user.id)))
        .execute()
    )[0];
    if (!existing) {
      return apiError("Gasto recurrente no encontrado");
    }

    const newActivo = existing.activo ? false : true;
    await db
      .update(recurringExpenses)
      .set({ activo: newActivo })
      .where(and(eq(recurringExpenses.id, Number(id)), eq(recurringExpenses.userId, user.id)))
      .execute();

    return NextResponse.json({ ok: true, activo: newActivo });
  } catch (e) {
    return handleError(e);
  }
}