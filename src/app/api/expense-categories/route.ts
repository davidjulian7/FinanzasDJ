import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseCategories, budgetGroups } from "@/lib/db/schema";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = db.select().from(expenseCategories).all();
  const groups = db.select().from(budgetGroups).all();
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const withGroup = cats.map((c) => ({
    ...c,
    budgetGroup: c.budgetGroupId ? groupById.get(c.budgetGroupId) ?? null : null,
  }));

  return NextResponse.json(withGroup);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, icono, color, budgetGroupId } = body;

    if (!nombre) {
      return apiError("nombre es requerido");
    }

    const result = db
      .insert(expenseCategories)
      .values({
        nombre,
        icono: icono ?? "Tag",
        color: color ?? "#7C3AED",
        budgetGroupId: budgetGroupId ?? null,
        tipo: body?.tipo === "ingreso" ? "ingreso" : "gasto",
        activo: true,
      })
      .returning({ id: expenseCategories.id })
      .all()[0];

    return NextResponse.json({ id: result.id });
  } catch (e) {
    return handleError(e);
  }
}
