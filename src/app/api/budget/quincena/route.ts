import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apartados, budgetGroups, expenseCategories, recurringExpenses, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { apiError, handleError } from "@/lib/api-server";
import { getReglaPct, getIngresoQuincena, type ReglaPct } from "@/lib/settings";
import { quincenaRango } from "@/lib/ranges";
import { cicloInfo, cuotaEfectiva, contribucionQuincena } from "@/lib/apartados";

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
    const allApartados = db.select().from(apartados).orderBy(apartados.orden, apartados.nombre).all();
    const activos = allApartados.filter((a) => a.activo);

    const range = quincenaRango(anio, mes, quincena);
    const txs = db
      .select()
      .from(transactions)
      .where(and(gte(transactions.fecha, range.from), lte(transactions.fecha, range.to)))
      .all();

    // Gasto real que cuenta contra el grupo: sin apartado vinculado.
    const gastadoByCat = new Map<number, number>();
    for (const t of txs) {
      if (t.tipo === "gasto" && t.categoryId && t.apartadoId == null) {
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

    const apartadosByGroup = new Map<number, typeof activos>();
    for (const a of activos) {
      if (!a.budgetGroupId) continue;
      const arr = apartadosByGroup.get(a.budgetGroupId) ?? [];
      arr.push(a);
      apartadosByGroup.set(a.budgetGroupId, arr);
    }

    const regla: ReglaPct = getReglaPct();
    const ingresosQuincena = getIngresoQuincena(anio, mes, quincena);

    const groupsWithData = groups.map((g) => {
      const groupCats = catsByGroup.get(g.id) ?? [];
      const presupuestado = Math.round((ingresosQuincena * regla[g.key]) / 100);
      const gastado = groupCats.reduce((sum, c) => sum + (gastadoByCat.get(c.id) ?? 0), 0);

      const apartadosDelGrupo = apartadosByGroup.get(g.id) ?? [];
      const pendientes = apartadosDelGrupo.map((a) => {
        const contrib = contribucionQuincena(a.id, anio, mes, quincena);
        return {
          id: a.id,
          nombre: a.nombre,
          color: a.color,
          icono: a.icono,
          cuota: cuotaEfectiva(a),
          registrado: contrib > 0,
          monto: contrib,
        };
      });
      const reservado = pendientes.reduce((sum, p) => sum + p.monto, 0);

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
        gastado: Math.round(gastado),
        progreso,
        disponible: presupuestado - Math.round(gastado) - reservado,
        reservado,
        recurrentTotal: (recurrentByGroup.get(g.id) ?? []).reduce((sum, r) => sum + r.monto, 0),
        apartados: pendientes,
      };
    });

    const apartadosListos = activos
      .map((a) => {
        const info = cicloInfo(a);
        return { a, info };
      })
      .filter(({ info }) => info.estado === "listo")
      .map(({ a, info }) => ({
        id: a.id,
        nombre: a.nombre,
        color: a.color,
        icono: a.icono,
        juntado: info.juntado,
        objetivo: a.montoObjetivo,
      }));

    return NextResponse.json({
      mes,
      anio,
      quincena,
      ingresosQuincena,
      regla,
      groups: groupsWithData,
      apartadosListos,
    });
  } catch (e) {
    return handleError(e);
  }
}