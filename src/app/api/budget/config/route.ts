import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups, budgetSubcategories, expenseCategories, recurringExpenses, accounts, budgets, settings } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";
import { getReglaPct, getIngresoQuincena, setSetting, ingresoKey, type ReglaPct } from "@/lib/settings";
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

    return {
      ...g,
      subcategories: groupSubcats.map((s) => ({
        ...s,
        expenseCategories: catBySubcat.get(s.id) ?? [],
        recurrents: groupRecurrents.filter((r) => r.expenseCategoryId && (catBySubcat.get(s.id) ?? []).some((c) => c.id === r.expenseCategoryId)),
        presupuestado: budgetBySubcat.get(s.id) ?? 0,
      })),
      recurrentTotal: groupRecurrents.reduce((sum, r) => sum + r.monto, 0),
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mes, anio, quincena, ingresosQuincena, regla, subcategories } = body;

    if (!mes || !anio) {
      return apiError("Parámetros mes y año requeridos");
    }

    const reglaData: ReglaPct = {
      necesidades: Number(regla?.necesidades) || 0,
      deseos: Number(regla?.deseos) || 0,
      ahorro: Number(regla?.ahorro) || 0,
    };

    const suma = reglaData.necesidades + reglaData.deseos + reglaData.ahorro;
    if (suma !== 100) {
      return apiError("Los porcentajes deben sumar 100%");
    }

    db.transaction((tx) => {
      if (ingresosQuincena > 0) {
        tx.insert(settings)
          .values({ key: ingresoKey(anio, mes, quincena), value: JSON.stringify(ingresosQuincena) })
          .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(ingresosQuincena) } })
          .run();
      }

      tx.insert(settings)
        .values({ key: "regla_pct", value: JSON.stringify(reglaData) })
        .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(reglaData) } })
        .run();

      if (Array.isArray(subcategories)) {
        for (const sc of subcategories) {
          if (sc.budgetSubcategoryId && sc.montoPresupuestado !== undefined) {
            tx.insert(budgets)
              .values({
                mes,
                anio,
                quincena: quincena ?? 1,
                budgetSubcategoryId: sc.budgetSubcategoryId,
                montoPresupuestado: Math.max(0, Number(sc.montoPresupuestado) || 0),
              })
              .onConflictDoUpdate({
                target: [budgets.mes, budgets.anio, budgets.quincena, budgets.budgetSubcategoryId],
                set: { montoPresupuestado: Math.max(0, Number(sc.montoPresupuestado) || 0) },
              })
              .run();
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}