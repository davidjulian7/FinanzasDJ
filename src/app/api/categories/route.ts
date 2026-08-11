import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.select().from(categories).orderBy(categories.tipo, categories.id).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nombre = String(body?.nombre ?? "").trim();
    const tipo = body?.tipo === "ingreso" ? "ingreso" : "gasto";
    if (!nombre) return apiError("El nombre de la categoría es obligatorio", 400);
    const existe = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.nombre, nombre))
      .all();
    if (existe.length > 0) return apiError("Ya existe una categoría con ese nombre", 409);
    const row = db
      .insert(categories)
      .values({
        nombre,
        tipo,
        icono: String(body?.icono ?? "Tag"),
        color: String(body?.color ?? "#7C3AED"),
        grupoPresupuesto: null,
      })
      .returning({ id: categories.id })
      .all()[0];
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e) {
    return e instanceof Error ? apiError(e.message) : handleError(e);
  }
}