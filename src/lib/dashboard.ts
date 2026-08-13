import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { accounts, apartadoContribuciones, apartados, budgetGroups, expenseCategories, transactions } from "./db/schema";
import { daysBetween, quincenaDelDia, quincenaRango, type DateRange } from "./ranges";
import { getIngresoQuincena, getReglaPct } from "./settings";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Grupo = "necesidades" | "deseos" | "ahorro";

export function getDashboard(userId: number, range: DateRange) {
  const cuentas = db.select().from(accounts).where(eq(accounts.userId, userId)).all();
  const cats = db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId)).all();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const cuentaById = new Map(cuentas.map((c) => [c.id, c]));
  const groups = db.select().from(budgetGroups).all();
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const grupoDeCat = (catId: number | null): string | null => {
    if (!catId) return null;
    const c = catById.get(catId);
    if (!c?.budgetGroupId) return null;
    return groupById.get(c.budgetGroupId)?.key ?? null;
  };

  const txs = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.fecha, range.from), lte(transactions.fecha, range.to)))
    .all();

  const patrimonio = cuentas.reduce((sum, c) => sum + (c.tipo === "credito" ? -c.saldoActual : c.saldoActual), 0);
  const liquidez = cuentas
    .filter((c) => c.tipo === "debito" || c.tipo === "efectivo")
    .reduce((sum, c) => sum + c.saldoActual, 0);
  const deudas = cuentas.filter((c) => c.tipo === "credito").reduce((sum, c) => sum + Math.max(0, c.saldoActual), 0);
  const inversiones = cuentas.filter((c) => c.tipo === "inversion").reduce((sum, c) => sum + c.saldoActual, 0);

  let ingresos = 0;
  let gastos = 0;
  const porCategoria = new Map<number, number>();
  const porCuenta = new Map<number, number>();
  const deltaPorDia = new Map<string, number>();
  const flujoPorDia = new Map<string, { ingresos: number; gastos: number }>();

  for (const t of txs) {
    if (t.tipo === "ingreso") {
      ingresos += t.monto;
      deltaPorDia.set(t.fecha, (deltaPorDia.get(t.fecha) ?? 0) + t.monto);
      const f = flujoPorDia.get(t.fecha) ?? { ingresos: 0, gastos: 0 };
      f.ingresos += t.monto;
      flujoPorDia.set(t.fecha, f);
    } else if (t.tipo === "gasto") {
      gastos += t.monto;
      deltaPorDia.set(t.fecha, (deltaPorDia.get(t.fecha) ?? 0) - t.monto);
      const f = flujoPorDia.get(t.fecha) ?? { ingresos: 0, gastos: 0 };
      f.gastos += t.monto;
      flujoPorDia.set(t.fecha, f);
      if (t.categoryId) porCategoria.set(t.categoryId, (porCategoria.get(t.categoryId) ?? 0) + t.monto);
      porCuenta.set(t.accountId, (porCuenta.get(t.accountId) ?? 0) + t.monto);
    }
  }

  const donut = [...porCategoria.entries()]
    .map(([catId, monto]) => {
      const c = catById.get(catId);
      return {
        categoria: c?.nombre ?? "Sin categoría",
        monto: Math.round(monto),
        color: c?.color ?? "#6B6B85",
        icono: c?.icono ?? "Tag",
      };
    })
    .sort((a, b) => b.monto - a.monto);

  const gastosPorCuenta = [...porCuenta.entries()]
    .map(([accId, monto]) => {
      const c = cuentaById.get(accId);
      return {
        cuenta: c?.nombre ?? "Desconocida",
        monto: Math.round(monto),
        color: c?.color ?? "#6B6B85",
      };
    })
    .sort((a, b) => b.monto - a.monto);

  const buckets = buildBuckets(range, deltaPorDia, flujoPorDia);
  const totalDelta = buckets.reduce((s, b) => s + b.delta, 0);
  let acumulado = patrimonio - totalDelta;
  const evolucion = buckets.map((b) => {
    acumulado += b.delta;
    return { label: b.label, valor: Math.round(acumulado) };
  });
  const flujo = buckets.map((b) => ({ label: b.label, ingresos: Math.round(b.ingresos), gastos: Math.round(b.gastos) }));

  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();
  const quincena = quincenaDelDia(hoy.getDate());
  const rangoQuincena = quincenaRango(anio, mes, quincena);

  const presupuesto: Record<Grupo, { presupuestado: number; gastado: number; apartado: number }> = {
    necesidades: { presupuestado: 0, gastado: 0, apartado: 0 },
    deseos: { presupuestado: 0, gastado: 0, apartado: 0 },
    ahorro: { presupuestado: 0, gastado: 0, apartado: 0 },
  };
  const txsMes = db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.fecha, rangoQuincena.from),
        lte(transactions.fecha, rangoQuincena.to)
      )
    )
    .all();
  for (const t of txsMes) {
    if (t.tipo !== "gasto" || !t.categoryId) continue;
    if (t.apartadoId != null) continue; // pagado desde apartado: ya no vuelve a contar
    const grupo = grupoDeCat(t.categoryId);
    if (grupo && presupuesto[grupo as Grupo]) presupuesto[grupo as Grupo].gastado += t.monto;
  }
  const ingresosMes = getIngresoQuincena(userId, anio, mes, quincena);
  const regla = getReglaPct(userId);
  presupuesto.necesidades.presupuestado = Math.round((ingresosMes * regla.necesidades) / 100);
  presupuesto.deseos.presupuestado = Math.round((ingresosMes * regla.deseos) / 100);
  presupuesto.ahorro.presupuestado = Math.round((ingresosMes * regla.ahorro) / 100);

  const apartadosActivos = db.select().from(apartados).where(and(eq(apartados.activo, true), eq(apartados.userId, userId))).all();
  const contribsQuincena = db
    .select()
    .from(apartadoContribuciones)
    .where(
      and(
        eq(apartadoContribuciones.userId, userId),
        eq(apartadoContribuciones.anio, anio),
        eq(apartadoContribuciones.mes, mes),
        eq(apartadoContribuciones.quincena, quincena)
      )
    )
    .all();
  const grupoIdByKey = new Map(groups.map((g) => [g.key, g.id]));
  for (const ap of apartadosActivos) {
    if (!ap.budgetGroupId) continue;
    const key = groupById.get(ap.budgetGroupId)?.key as Grupo | undefined;
    if (!key || !presupuesto[key]) continue;
    for (const c of contribsQuincena) {
      if (c.apartadoId === ap.id) presupuesto[key].apartado += c.monto;
    }
  }
  const reservadoTotal = Object.values(presupuesto).reduce((s, g) => s + g.apartado, 0);

  const recientes = db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.fecha), desc(transactions.id))
    .limit(8)
    .all()
    .map((t) => {
      const cat = t.categoryId ? catById.get(t.categoryId) : undefined;
      const ap = t.apartadoId
        ? db
            .select({ nombre: apartados.nombre })
            .from(apartados)
            .where(and(eq(apartados.id, t.apartadoId), eq(apartados.userId, userId)))
            .get()
        : undefined;
      return {
        id: t.id,
        descripcion: t.descripcion,
        monto: t.monto,
        tipo: t.tipo,
        fecha: t.fecha,
        notas: t.notas,
        accountId: t.accountId,
        accountDestinoId: t.accountDestinoId,
        categoryId: t.categoryId,
        apartadoId: t.apartadoId,
        cuenta: cuentaById.get(t.accountId)?.nombre ?? "—",
        cuentaDestino: t.accountDestinoId ? (cuentaById.get(t.accountDestinoId)?.nombre ?? "—") : null,
        categoria: cat?.nombre ?? null,
        icono: cat?.icono ?? null,
        color: cat?.color ?? null,
        apartado: ap?.nombre ?? null,
      };
    });

  return {
    summary: {
      patrimonio: Math.round(patrimonio),
      liquidez: Math.round(liquidez),
      deudas: Math.round(deudas),
      inversiones: Math.round(inversiones),
    },
    totales: { ingresos: Math.round(ingresos), gastos: Math.round(gastos) },
    donut,
    gastosPorCuenta,
    evolucion,
    flujo,
    presupuesto: {
      necesidades: { presupuestado: Math.round(presupuesto.necesidades.presupuestado), gastado: Math.round(presupuesto.necesidades.gastado), apartado: Math.round(presupuesto.necesidades.apartado) },
      deseos: { presupuestado: Math.round(presupuesto.deseos.presupuestado), gastado: Math.round(presupuesto.deseos.gastado), apartado: Math.round(presupuesto.deseos.apartado) },
      ahorro: { presupuestado: Math.round(presupuesto.ahorro.presupuestado), gastado: Math.round(presupuesto.ahorro.gastado), apartado: Math.round(presupuesto.ahorro.apartado) },
    },
    ingresosMes: Math.round(ingresosMes),
    recientes,
    reservado: Math.round(reservadoTotal),
  };
}

interface Bucket {
  key: string;
  label: string;
  delta: number;
  ingresos: number;
  gastos: number;
}

function buildBuckets(
  range: DateRange,
  deltaPorDia: Map<string, number>,
  flujoPorDia: Map<string, { ingresos: number; gastos: number }>
): Bucket[] {
  const dias = daysBetween(range.from, range.to);
  const mode: "dia" | "semana" | "mes" = dias <= 40 ? "dia" : dias <= 160 ? "semana" : "mes";

  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);

  const bucketMap = new Map<string, Bucket>();

  function ensure(d: Date) {
    let key: string;
    if (mode === "dia") {
      key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    } else if (mode === "semana") {
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = `w${lunes.getTime()}`;
    } else {
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    }
    let b = bucketMap.get(key);
    if (!b) {
      let label = "";
      if (mode === "dia") {
        label = `${d.getDate()} ${MESES[d.getMonth()]}`;
      } else if (mode === "semana") {
        const lunes = new Date(d);
        lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        label = `${lunes.getDate()} ${MESES[lunes.getMonth()]}`;
      } else {
        label = MESES[d.getMonth()];
      }
      b = { key, label, delta: 0, ingresos: 0, gastos: 0 };
      bucketMap.set(key, b);
    }
    return b;
  }

  for (let t = new Date(start); t <= end; t = new Date(t.getTime() + 86400000)) {
    ensure(t);
    const fecha = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    const delta = deltaPorDia.get(fecha) ?? 0;
    const flujo = flujoPorDia.get(fecha) ?? { ingresos: 0, gastos: 0 };
    const b = ensure(t);
    b.delta += delta;
    b.ingresos += flujo.ingresos;
    b.gastos += flujo.gastos;
  }

  const labels = [...bucketMap.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  if (mode === "semana") {
    labels.forEach((b, i) => {
      b.label = `Sem ${i + 1} · ${b.label}`;
    });
  }
  return labels;
}
