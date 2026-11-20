import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringExpenses, expenseCategories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { validarMonto } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const { nombre, monto, frecuencia, proximoCobro, expenseCategoryId, accountId, nota, activo } = body;

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

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (monto !== undefined) updateData.monto = validarMonto(monto, "El monto debe ser mayor a cero");
    if (frecuencia !== undefined) {
      if (!["semanal", "quincenal", "mensual", "anual"].includes(frecuencia)) return apiError("Frecuencia inválida");
      updateData.frecuencia = frecuencia;
    }
    if (proximoCobro !== undefined) updateData.proximoCobro = proximoCobro;
    if (expenseCategoryId !== undefined) {
      const category = (await db.select().from(expenseCategories).where(and(eq(expenseCategories.id, Number(expenseCategoryId)), eq(expenseCategories.userId, user.id))).execute())[0];
      if (!category || category.tipo !== "gasto") return apiError("Categoría de gasto inválida");
      updateData.expenseCategoryId = category.id;
      updateData.budgetGroupId = category.budgetGroupId;
    }
    if (accountId !== undefined) updateData.accountId = accountId;
    if (nota !== undefined) updateData.nota = nota ?? null;
    if (activo !== undefined) updateData.activo = activo ? true : false;

    await db
      .update(recurringExpenses)
      .set(updateData)
      .where(and(eq(recurringExpenses.id, Number(id)), eq(recurringExpenses.userId, user.id)))
      .execute();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const recId = Number(id);

    const existing = (
      await db
        .select()
        .from(recurringExpenses)
        .where(and(eq(recurringExpenses.id, recId), eq(recurringExpenses.userId, user.id)))
        .execute()
    )[0];
    if (!existing) {
      return apiError("Gasto recurrente no encontrado");
    }

    await db.delete(recurringExpenses).where(and(eq(recurringExpenses.id, recId), eq(recurringExpenses.userId, user.id))).execute();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
