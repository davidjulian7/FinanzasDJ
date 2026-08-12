import { and, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { budgets, categories, transactions } from "@/lib/db/schema";
import {
  getAhorroSplit,
  getIngresoQuincena,
  getReglaPct,
  ingresoKey,
  setSetting,
  type AhorroSplit,
  type ReglaPct,
} from "@/lib/settings";
import { quincenaRango } from "@/lib/ranges";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mes = Number(req.nextUrl.searchParams.get("mes"));
  const anio = Number(req.nextUrl.searchParams.get("anio"));
  const quincena = Number(req.nextUrl.searchParams.get("quincena") ?? 1);
  if (!mes || !anio) return apiError("Parámetros mes y año requeridos");

  const cats = db.select().from(categories).all();
  const budgetRows = db
    .select()
    .from(budgets)
    .where(and(eq(budgets.mes, mes), eq(budgets.anio, anio), eq(budgets.quincena, quincena)))
    .all();
  const presupuestoPorCat = new Map(budgetRows.map((b) => [b.categoriaId, b.montoPresupuestado]));

  const rango = quincenaRango(anio, mes, quincena);
  const txs = db
    .select()
    .from(transactions)
    .where(and(gte(transactions.fecha, rango.from), lte(transactions.fecha, rango.to)))
    .all();
  const gastadoPorCat = new Map<number, number>();
  for (const t of txs) {
    if (t.tipo === "gasto" && t.categoryId) {
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
      parentId: c.parentId ?? null,
      presupuestado: Math.round(presupuestoPorCat.get(c.id) ?? 0),
      gastado: Math.round(gastadoPorCat.get(c.id) ?? 0),
    }))
    .sort((a, b) => (a.presupuestado === b.presupuestado ? a.nombre.localeCompare(b.nombre) : b.presupuestado - a.presupuestado));

  return NextResponse.json({
    mes,
    anio,
    quincena,
    ingresosQuincena: Math.round(getIngresoQuincena(anio, mes, quincena)),
    regla: getReglaPct(),
    ahorroSplit: getAhorroSplit(),
    items,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mes = Number(body.mes);
    const anio = Number(body.anio);
    const quincena = Number(body.quincena ?? 1);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!mes || !anio) return apiError("Parámetros mes y año requeridos");

    const regla: ReglaPct = {
      necesidades: Number(body.regla?.necesidades) || 0,
      deseos: Number(body.regla?.deseos) || 0,
      ahorro: Number(body.regla?.ahorro) || 0,
    };
    const ahorroSplit: AhorroSplit = {
      habilitado: Boolean(body.ahorroSplit?.habilitado),
      telefonoPct: Math.min(100, Math.max(0, Number(body.ahorroSplit?.telefonoPct) || 50)),
    };

    db.transaction((tx) => {
      tx.delete(budgets)
        .where(and(eq(budgets.mes, mes), eq(budgets.anio, anio), eq(budgets.quincena, quincena)))
        .run();
      for (const it of items) {
        const categoriaId = Number(it.categoriaId);
        const monto = Math.max(0, Number(it.monto) || 0);
        tx.insert(budgets)
          .values({ mes, anio, quincena, categoriaId, montoPresupuestado: monto })
          .onConflictDoUpdate({
            target: [budgets.mes, budgets.anio, budgets.quincena, budgets.categoriaId],
            set: { montoPresupuestado: monto },
          })
          .run();
      }
      const ingresoManual = Math.max(0, Number(body.ingresosQuincena) || 0);
      if (ingresoManual > 0) setSetting(ingresoKey(anio, mes, quincena), ingresoManual);
      setSetting("regla_pct", regla);
      setSetting("ahorro_split", ahorroSplit);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}