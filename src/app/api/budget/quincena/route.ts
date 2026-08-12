import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups, budgetSubcategories, expenseCategories, recurringExpenses, transactions, accounts, budgets, settings } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";
import { getReglaPct, getIngresoQuincena, type ReglaPct } from "@/lib/settings";
import { quincenaRango } from "@/lib/ranges";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = Number(searchParams.get("mes"));
  const anio = Number(searchParams.get("anio"));
  const quincena = Number(searchParams.get("quincena") ?? 1);

  if (!mes || !anio) {
    return apiError("Parámetros mes y año requeridos");
  }

  const groups = db.select().from(budgetGroups).all();
  const subcats = db.select().from(budgetSubcategories).where(eq(budgetSubcategories.activo, true)).all();
  const expCats = db.select().from(expenseCategories).where(eq(expenseCategories.activo, true)).all();
  const recurrents = db.select().from(recurringExpenses).where(eq(recurringExpenses.activo, true)).all();
  const accs = db.select().from(accounts).all();
  const accById = new Map(accs.map((a) => [a.id, a]));

  const budgetRows = db
    .select()
    .from(budgets)
    .where(and(eq(budgets.mes, mes), eq(budgets.anio, anio), eq(budgets.quincena, quincena)))
    .all();
  const budgetBySubcat = new Map(budgetRows.map((b) => [b.budgetSubcategoryId, b.montoPresupuestado]));

  const catBySubcat = new Map<number, typeof expCats>();
  for (const c of expCats) {
    if (c.budgetSubcategoryId) {
      const arr = catBySubcat.get(c.budgetSubcategoryId) ?? [];
      arr.push(c);
      catBySubcat.set(c.budgetSubcategoryId, arr);
    }
  }

  const catIdsBySubcat = new Map<number, number[]>();
  for (const [subcatId, cats] of catBySubcat) {
    catIdsBySubcat.set(subcatId, cats.map((c) => c.id));
  }

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

  const gastadoBySubcat = new Map<number, number>();
  for (const [subcatId, catIds] of catIdsBySubcat) {
    let total = 0;
    for (const catId of catIds) {
      total += gastadoByCat.get(catId) ?? 0;
    }
    gastadoBySubcat.set(subcatId, total);
  }

  const recurrentByGroup = new Map<number, typeof recurrents>();
  for (const r of recurrents) {
    const arr = recurrentByGroup.get(r.budgetGroupId) ?? [];
    arr.push(r);
    recurrentByGroup.set(r.budgetGroupId, arr);
  }

  const subcatByGroup = new Map<number, typeof subcats>();
  for (const s of subcats) {
    const arr = subcatByGroup.get(s.budgetGroupId) ?? [];
    arr.push(s);
    subcatByGroup.set(s.budgetGroupId, arr);
  }

  const regla = getReglaPct();
  const ingresosQuincena = getIngresoQuincena(anio, mes, quincena);

  const groupsWithData = groups.map((g) => {
    const groupSubcats = subcatByGroup.get(g.id) ?? [];
    const groupRecurrents = recurrentByGroup.get(g.id) ?? [];

    const subcatData = groupSubcats.map((s) => {
      const presupuestado = budgetBySubcat.get(s.id) ?? 0;
      const gastado = gastadoBySubcat.get(s.id) ?? 0;
      const progreso = presupuestado > 0 ? Math.min(100, (gastado / presupuestado) * 100) : gastado > 0 ? 100 : 0;

      return {
        ...s,
        expenseCategories: catBySubcat.get(s.id) ?? [],
        recurrents: groupRecurrents.filter((r) => r.expenseCategoryId && (catBySubcat.get(s.id) ?? []).some((c) => c.id === r.expenseCategoryId)),
        presupuestado,
        gastado,
        progreso,
        disponible: presupuestado - gastado,
      };
    });

    const totalPresupuestado = subcatData.reduce((sum, s) => sum + s.presupuestado, 0);
    const totalGastado = subcatData.reduce((sum, s) => sum + s.gastado, 0);
    const progreso = totalPresupuestado > 0 ? Math.min(100, (totalGastado / totalPresupuestado) * 100) : totalGastado > 0 ? 100 : 0;

    return {
      group: g,
      subcategories: subcatData,
      totalPresupuestado,
      totalGastado,
      progreso,
      recurrentTotal: groupRecurrents.reduce((sum, r) => sum + r.monto, 0),
      disponible: totalPresupuestado - totalGastado,
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
}