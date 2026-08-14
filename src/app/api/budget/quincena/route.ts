import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apartados, budgetGroups, expenseCategories, recurringExpenses, transactions } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { getReglaPct, getIngresoQuincena, type ReglaPct } from "@/lib/settings";
import { quincenaRango } from "@/lib/ranges";
import { montoQuincena } from "@/lib/recurrentes";
import { cicloInfo, cuotaEfectiva, contribucionQuincena, gastadoEnCategoria } from "@/lib/apartados";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { searchParams } = new URL(req.url);
    const mes = Number(searchParams.get("mes"));
    const anio = Number(searchParams.get("anio"));
    const quincena = Number(searchParams.get("quincena") ?? 1);

    if (!mes || !anio) {
      return apiError("Parámetros mes y año requeridos");
    }

    const range = quincenaRango(anio, mes, quincena);
    const [groups, expCats, recurrents, allApartados, txs] = await Promise.all([
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
      db
        .select()
        .from(apartados)
        .where(eq(apartados.userId, user.id))
        .orderBy(apartados.orden, apartados.nombre)
        .execute(),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            gte(transactions.fecha, range.from),
            lte(transactions.fecha, range.to)
          )
        )
        .execute(),
    ]);
    const activos = allApartados.filter((a) => a.activo);
    const catsById = new Map(expCats.map((c) => [c.id, c]));

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

    const regla: ReglaPct = await getReglaPct(user.id);
    const ingresosQuincena = await getIngresoQuincena(user.id, anio, mes, quincena);

    const groupsWithData = await Promise.all(
      groups.map(async (g) => {
        const groupCats = catsByGroup.get(g.id) ?? [];
        const presupuestado = Math.round((ingresosQuincena * regla[g.key]) / 100);
        const gastado = groupCats.reduce((sum, c) => sum + (gastadoByCat.get(c.id) ?? 0), 0);

        const apartadosDelGrupo = apartadosByGroup.get(g.id) ?? [];
        const pendientes = await Promise.all(
          apartadosDelGrupo.map(async (a) => {
            const contrib = await contribucionQuincena(user.id, a.id, anio, mes, quincena);
            const cat = a.categoriaId ? catsById.get(a.categoriaId) : undefined;
            return {
              id: a.id,
              nombre: a.nombre,
              color: a.color,
              icono: a.icono,
              cuota: cuotaEfectiva(a),
              registrado: contrib > 0,
              monto: contrib,
              categoriaId: a.categoriaId,
              categoriaNombre: cat?.nombre ?? null,
              gastadoQuincena: a.categoriaId ? await gastadoEnCategoria(user.id, a.categoriaId, anio, mes, quincena) : 0,
            };
          })
        );
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
        recurrentTotal: (recurrentByGroup.get(g.id) ?? []).reduce((sum, r) => sum + montoQuincena(r.monto, r.frecuencia), 0),
        apartados: pendientes,
      };
      })
    );

    const apartadosListos = (
      await Promise.all(
        activos.map(async (a) => {
          const info = await cicloInfo(user.id, a);
          return { a, info };
        })
      )
    )
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