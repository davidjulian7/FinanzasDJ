import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringExpenses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nombre, monto, frecuencia, proximoCobro, expenseCategoryId, accountId, budgetGroupId, nota, activo } = body;

    const existing = db.select().from(recurringExpenses).where(eq(recurringExpenses.id, Number(id))).all()[0];
    if (!existing) {
      return apiError("Gasto recurrente no encontrado");
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (monto !== undefined) updateData.monto = monto;
    if (frecuencia !== undefined) updateData.frecuencia = frecuencia;
    if (proximoCobro !== undefined) updateData.proximoCobro = proximoCobro;
    if (expenseCategoryId !== undefined) updateData.expenseCategoryId = expenseCategoryId;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (budgetGroupId !== undefined) updateData.budgetGroupId = budgetGroupId;
    if (nota !== undefined) updateData.nota = nota ?? null;
    if (activo !== undefined) updateData.activo = activo ? 1 : 0;

    db.update(recurringExpenses).set(updateData).where(eq(recurringExpenses.id, Number(id))).run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const recId = Number(id);

    const existing = db.select().from(recurringExpenses).where(eq(recurringExpenses.id, recId)).all()[0];
    if (!existing) {
      return apiError("Gasto recurrente no encontrado");
    }

    db.delete(recurringExpenses).where(eq(recurringExpenses.id, recId)).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}