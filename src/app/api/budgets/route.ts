import { and, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { budgets, categories, transactions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = Number(req.nextUrl.searchParams.get("mes"));
  const anio = Number(req.nextUrl.searchParams.get("anio"));
  if (!mes || !anio) return apiError("Parámetros mes y año requeridos");

  const cats = db.select().from(categories).all();
  const budgetRows = db.select().from(budgets).where(and(eq(budgets.mes, mes), eq(budgets.anio, anio))).all();
  const presupuestoPorCat = new Map(budgetRows.map((b) => [b.categoriaId, b.montoPresupuestado]));

  const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const finMes = `${anio}-${String(mes).padStart(2, "0")}-31`;
  const txs = db
    .select()
    .from(transactions)
    .where(and(gte(transactions.fecha, inicioMes), lte(transactions.fecha, finMes)))
    .all();
  const gastadoPorCat = new Map<number, number>();
  let ingresosMes = 0;
  for (const t of txs) {
    if (t.tipo === "ingreso") {
      ingresosMes += t.monto;
    } else if (t.tipo === "gasto" && t.categoryId) {
      gastadoPorCat.set(t.categoryId, (gastadoPorCat.get(t.categoryId) ?? 0) + t.monto);
    }
  }

  const items = cats
    .filter((c) => c.tipo === "gasto")
    .map((c) => ({
      categoriaId: c.id,
      nombre: c.nombre,
      icono: c.icono,
      color: c.color,
      grupo: c.grupoPresupuesto,
      presupuestado: Math.round(presupuestoPorCat.get(c.id) ?? 0),
      gastado: Math.round(gastadoPorCat.get(c.id) ?? 0),
    }))
    .sort((a, b) => (a.presupuestado === b.presupuestado ? a.nombre.localeCompare(b.nombre) : b.presupuestado - a.presupuestado));

  return NextResponse.json({ mes, anio, ingresosMes: Math.round(ingresosMes), items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mes = Number(body.mes);
    const anio = Number(body.anio);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!mes || !anio) return apiError("Parámetros mes y año requeridos");

    db.transaction((tx) => {
      tx.delete(budgets).where(and(eq(budgets.mes, mes), eq(budgets.anio, anio))).run();
      for (const it of items) {
        const categoriaId = Number(it.categoriaId);
        const monto = Math.max(0, Number(it.monto) || 0);
        tx.insert(budgets)
          .values({ mes, anio, categoriaId, montoPresupuestado: monto })
          .onConflictDoUpdate({
            target: [budgets.mes, budgets.anio, budgets.categoriaId],
            set: { montoPresupuestado: monto },
          })
          .run();
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
