import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetGroups, expenseCategories, recurringExpenses, settings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { getReglaPct, getIngresoQuincena, ingresoKey, type ReglaPct } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const mes = Number(searchParams.get("mes"));
  const anio = Number(searchParams.get("anio"));
  const quincena = Number(searchParams.get("quincena") ?? 1);

  if (!mes || !anio) {
    return apiError("Parámetros mes y año requeridos");
  }

  const [groups, expCats, recurrents] = await Promise.all([
    db.select().from(budgetGroups).execute(),
    db
      .select()
      .from(expenseCategories)
      .where(and(eq(expenseCategories.activo, true), eq(expenseCategories.userId, user.id)))
      .execute(),
    db
      .select()
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.activo, true), eq(recurringExpenses.userId, user.id)))
      .execute(),
  ]);

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

  const regla = await getReglaPct(user.id);
  const ingresosQuincena = await getIngresoQuincena(user.id, anio, mes, quincena);

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
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const { mes, anio, quincena, ingresosQuincena, regla } = body;

    if (!mes || !anio) {
      return apiError("Parámetros mes y año requeridos");
    }

    const ingresoNum = Number(ingresosQuincena ?? 0);
    if (!Number.isFinite(ingresoNum) || ingresoNum < 0) {
      return apiError("El ingreso de quincena no es válido");
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

    await db.transaction(async (tx) => {
      if (ingresoNum > 0) {
        await tx
          .insert(settings)
          .values({ userId: user.id, key: ingresoKey(anio, mes, quincena), value: JSON.stringify(ingresoNum) })
          .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value: JSON.stringify(ingresoNum) } })
          .execute();
      }

      await tx
        .insert(settings)
        .values({ userId: user.id, key: "regla_pct", value: JSON.stringify(reglaData) })
        .onConflictDoUpdate({ target: [settings.userId, settings.key], set: { value: JSON.stringify(reglaData) } })
        .execute();
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
