import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringExpenses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = db.select().from(recurringExpenses).where(eq(recurringExpenses.id, Number(id))).all()[0];
    if (!existing) {
      return apiError("Gasto recurrente no encontrado");
    }

    const newActivo = existing.activo ? false : true;
    db.update(recurringExpenses).set({ activo: newActivo }).where(eq(recurringExpenses.id, Number(id))).run();

    return NextResponse.json({ ok: true, activo: newActivo });
  } catch (e) {
    return handleError(e);
  }
}