import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups, expenseCategories, recurringExpenses, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";
import { getReglaPct, getIngresoQuincena, ingresoKey, type ReglaPct } from "@/lib/settings";

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
  const expCats = db.select().from(expenseCategories).where(eq(expenseCategories.activo, true)).all();
  const recurrents = db.select().from(recurringExpenses).where(eq(recurringExpenses.activo, true)).all();

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

  const regla = getReglaPct();
  const ingresosQuincena = getIngresoQuincena(anio, mes, quincena);

  const groupsWithData = groups.map((g) => ({
    ...g,
    categorias: catsByGroup.get(g.id) ?? [],
    recurrentTotal: (recurrentByGroup.get(g.id) ?? []).reduce((sum, r) => sum + r.monto, 0),
  }));

  const sinGrupo = expCats.filter((c) => !c.budgetGroupId);

  return NextResponse.json({
    mes,
    anio,
    quincena,
    ingresosQuincena,
    regla,
    groups: groupsWithData,
    sinGrupo,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mes, anio, quincena, ingresosQuincena, regla } = body;

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
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
