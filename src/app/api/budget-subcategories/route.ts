import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetSubcategories, budgetGroups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const subcats = db.select().from(budgetSubcategories).all();
  const groups = db.select().from(budgetGroups).all();
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const withGroup = subcats.map((s) => ({
    ...s,
    budgetGroup: groupById.get(s.budgetGroupId),
  }));

  return NextResponse.json(withGroup);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, icono, color, orden, budgetGroupId } = body;

    if (!nombre || !budgetGroupId) {
      return apiError("nombre y budgetGroupId son requeridos");
    }

    const group = db.select().from(budgetGroups).where(eq(budgetGroups.id, budgetGroupId)).all()[0];
    if (!group) {
      return apiError("Grupo de presupuesto no encontrado");
    }

    const maxOrden = db
      .select({ max: budgetSubcategories.orden })
      .from(budgetSubcategories)
      .where(eq(budgetSubcategories.budgetGroupId, budgetGroupId))
      .all()[0]?.max ?? 0;

    const result = db
      .insert(budgetSubcategories)
      .values({
        nombre,
        icono: icono ?? "Tag",
        color: color ?? group.color,
        orden: orden ?? maxOrden + 1,
        budgetGroupId,
        activo: true,
      })
      .returning({ id: budgetSubcategories.id })
      .all()[0];

    return NextResponse.json({ id: result.id });
  } catch (e) {
    return handleError(e);
  }
}