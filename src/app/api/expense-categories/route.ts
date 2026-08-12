import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseCategories, budgetSubcategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = db.select().from(expenseCategories).all();
  const subcats = db.select().from(budgetSubcategories).all();
  const subcatById = new Map(subcats.map((s) => [s.id, s]));

  const withSubcat = cats.map((c) => ({
    ...c,
    budgetSubcategory: c.budgetSubcategoryId ? subcatById.get(c.budgetSubcategoryId) : null,
  }));

  return NextResponse.json(withSubcat);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, icono, color, budgetSubcategoryId } = body;

    if (!nombre) {
      return apiError("nombre es requerido");
    }

    const result = db
      .insert(expenseCategories)
      .values({
        nombre,
        icono: icono ?? "Tag",
        color: color ?? "#7C3AED",
        budgetSubcategoryId: budgetSubcategoryId ?? null,
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