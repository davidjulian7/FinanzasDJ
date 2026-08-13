import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups, expenseCategories, recurringExpenses, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";
import { getReglaPct, getIngresoQuincena, type ReglaPct } from "@/lib/settings";
import { quincenaRango } from "@/lib/ranges";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const anio = Number(searchParams.get("anio"));
    const quincena = Number(searchParams.get("quincena") ?? 1);

    if (!mes || !anio) {
      return apiError("Parámetros mes y año requeridos");
    }

    const groups = db.select().from(budgetGroups).all();
    const expCats = db.select().from(expenseCategories).where(eq(expenseCategories.activo, true)).all();
    const recurrents = db.select().from(recurringExpenses).where(eq(recurringExpenses.activo, true)).all();

    const range = quincenaRango(anio, mes, quincena);
    const txs = db
      .select()
      .from(transactions)
      .where(and(gte(transactions.fecha, range.from), lte(transactions.fecha, range.to)))
      .all();

    const gastadoByCat = new Map<number, number>();
    for (const t of txs) {
      if (t.tipo === "gasto" && t.categoryId) {
        gastadoByCat.set(t.categoryId, (gastadoByCat.get(t.categoryId) ?? 0) + t.monto);
      }
    }

    const catsByGroup = new Map<number, typeof expCats>();
    for (const c of expCats) {
      if (!c.budgetGroupId) continue;
      const arr = catsByGroup.get(c.budgetGroupId) ?? [];
      arr.push(c);
      catsByGroup.set(c.budgetGroupId, arr);
    }

    const recurrentByGroup = new Map<number, typeof recurrents>();
    for (const r of recurrents) {
      const arr = recurrentByGroup.get(r.budgetGroupId) ?? [];
      arr.push(r);
      recurrentByGroup.set(r.budgetGroupId, arr);
    }

    const regla: ReglaPct = getReglaPct();
    const ingresosQuincena = getIngresoQuincena(anio, mes, quincena);

    const groupsWithData = groups.map((g) => {
      const groupCats = catsByGroup.get(g.id) ?? [];
      const presupuestado = Math.round((ingresosQuincena * regla[g.key]) / 100);
      const gastado = groupCats.reduce((sum, c) => sum + (gastadoByCat.get(c.id) ?? 0), 0);
      const progreso = presupuestado > 0 ? Math.min(100, (gastado / presupuestado) * 100) : gastado > 0 ? 100 : 0;

      return {
        group: g,
        categorias: groupCats.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          icono: c.icono,
          color: c.color,
          gastado: Math.round(gastadoByCat.get(c.id) ?? 0),
        })),
        presupuestado,
        gastado,
        progreso,
        disponible: presupuestado - gastado,
        recurrentTotal: (recurrentByGroup.get(g.id) ?? []).reduce((sum, r) => sum + r.monto, 0),
      };
    });

    return NextResponse.json({
      mes,
      anio,
      quincena,
      ingresosQuincena,
      regla,
      groups: groupsWithData,
    });
  } catch (e) {
    return handleError(e);
  }
}
