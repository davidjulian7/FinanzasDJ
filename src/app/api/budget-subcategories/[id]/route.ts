import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetSubcategories, expenseCategories, budgets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, icono, color, orden, activo } = body;

    const existing = db.select().from(budgetSubcategories).where(eq(budgetSubcategories.id, Number(id))).all()[0];
    if (!existing) {
      return apiError("Subcategoría no encontrada");
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (icono !== undefined) updateData.icono = icono;
    if (color !== undefined) updateData.color = color;
    if (orden !== undefined) updateData.orden = orden;
    if (activo !== undefined) updateData.activo = activo ? 1 : 0;

    db.update(budgetSubcategories).set(updateData).where(eq(budgetSubcategories.id, Number(id))).run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const subId = Number(id);

    const existing = db.select().from(budgetSubcategories).where(eq(budgetSubcategories.id, subId)).all()[0];
    if (!existing) {
      return apiError("Subcategoría no encontrada");
    }

    const hasExpenseCats = db.select().from(expenseCategories).where(eq(expenseCategories.budgetSubcategoryId, subId)).all()[0];
    const hasBudgets = db.select().from(budgets).where(eq(budgets.budgetSubcategoryId, subId)).all()[0];

    if (hasExpenseCats || hasBudgets) {
      db.update(budgetSubcategories).set({ activo: false }).where(eq(budgetSubcategories.id, subId)).run();
      return NextResponse.json({ ok: true, softDeleted: true });
    }

    db.delete(budgetSubcategories).where(eq(budgetSubcategories.id, subId)).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}