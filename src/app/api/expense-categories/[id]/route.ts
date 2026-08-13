import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseCategories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const { nombre, icono, color, budgetGroupId, activo } = body;

    const existing = (
      await db
        .select()
        .from(expenseCategories)
        .where(and(eq(expenseCategories.id, Number(id)), eq(expenseCategories.userId, user.id)))
        .execute()
    )[0];
    if (!existing) {
      return apiError("Categoría no encontrada");
    }

    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (icono !== undefined) updateData.icono = icono;
    if (color !== undefined) updateData.color = color;
    if (budgetGroupId !== undefined) updateData.budgetGroupId = budgetGroupId ?? null;
    if (activo !== undefined) updateData.activo = activo ? true : false;

    await db
      .update(expenseCategories)
      .set(updateData)
      .where(and(eq(expenseCategories.id, Number(id)), eq(expenseCategories.userId, user.id)))
      .execute();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
