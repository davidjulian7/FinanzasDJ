import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, icono, color, budgetGroupId, activo } = body;

    const existing = db.select().from(expenseCategories).where(eq(expenseCategories.id, Number(id))).all()[0];
    if (!existing) {
      return apiError("Categoría no encontrada");
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (icono !== undefined) updateData.icono = icono;
    if (color !== undefined) updateData.color = color;
    if (budgetGroupId !== undefined) updateData.budgetGroupId = budgetGroupId ?? null;
    if (activo !== undefined) updateData.activo = activo ? 1 : 0;

    db.update(expenseCategories).set(updateData).where(eq(expenseCategories.id, Number(id))).run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
