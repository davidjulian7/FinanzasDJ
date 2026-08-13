import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { accounts, apartadoContribuciones, apartados, budgetGroups, expenseCategories, transactions } from "./db/schema";
import { quincenaRango } from "./ranges";
import { todayISO } from "./format";
import type { ApartadoRow, BudgetGroupRow } from "./types";

export const QUINCENAS_POR_CICLO = { mensual: 2, anual: 24 } as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function lastDayOfMonth(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

// Próximo vencimiento estrictamente posterior a `ref` (ISO "YYYY-MM-DD").
export function proximoVencimiento(
  a: { periodicidad: "mensual" | "anual"; diaPago: number; mesPago: number | null },
  ref: string
): string {
  const [ry, rm, rd] = ref.split("-").map(Number);
  let y = ry;
  let m: number;

  if (a.periodicidad === "anual" && a.mesPago) {
    m = a.mesPago;
    if (m < rm || (m === rm && a.diaPago <= rd)) y++;
  } else {
    m = rm + (a.diaPago <= rd ? 1 : 0);
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return `${y}-${pad(m)}-${pad(Math.min(a.diaPago, lastDayOfMonth(y, m)))}`;
}

export function cuotaSugerida(a: { montoObjetivo: number; periodicidad: "mensual" | "anual" }): number {
  const n = a.montoObjetivo / QUINCENAS_POR_CICLO[a.periodicidad];
  return Math.round(n * 100) / 100;
}

export function cuotaEfectiva(a: {
  montoObjetivo: number;
  periodicidad: "mensual" | "anual";
  montoQuincena: number | null;
}): number {
  return a.montoQuincena != null && a.montoQuincena > 0 ? a.montoQuincena : cuotaSugerida(a);
}

// Último pago real del apartado (fecha de la transacción más reciente vinculada).
export function ultimoPagoDe(apartadoId: number): string | null {
  const row = db
    .select({ fecha: transactions.fecha })
    .from(transactions)
    .where(eq(transactions.apartadoId, apartadoId))
    .orderBy(desc(transactions.fecha), desc(transactions.id))
    .all()[0];
  return row?.fecha ?? null;
}

function quincenaFin(anio: number, mes: number, quincena: number): string {
  return quincenaRango(anio, mes, quincena).to;
}

// Total apartado desde el inicio del ciclo actual (último pago, o fecha de creación).
export function juntadoEnCiclo(apartadoId: number, inicioCiclo: string): number {
  const rows = db
    .select({ monto: apartadoContribuciones.monto, anio: apartadoContribuciones.anio, mes: apartadoContribuciones.mes, quincena: apartadoContribuciones.quincena })
    .from(apartadoContribuciones)
    .where(eq(apartadoContribuciones.apartadoId, apartadoId))
    .all();
  let total = 0;
  for (const c of rows) {
    if (quincenaFin(c.anio, c.mes, c.quincena) > inicioCiclo) total += c.monto;
  }
  return Math.round(total * 100) / 100;
}

export type ApartadoEstado = "activo" | "listo" | "atrasado";

export interface CicloInfo {
  cuotaSugerida: number;
  cuotaEfectiva: number;
  ultimoPago: string | null;
  vencimiento: string;
  juntado: number;
  faltante: number;
  progreso: number;
  estado: ApartadoEstado;
}

export function cicloInfo(a: {
  id: number;
  montoObjetivo: number;
  periodicidad: "mensual" | "anual";
  diaPago: number;
  mesPago: number | null;
  montoQuincena: number | null;
  fechaInicio: string;
}): CicloInfo {
  const ultimoPago = ultimoPagoDe(a.id);
  const inicioCiclo = ultimoPago ?? a.fechaInicio;
  const vencimiento = proximoVencimiento(a, inicioCiclo);
  const juntado = juntadoEnCiclo(a.id, inicioCiclo);
  const hoy = todayISO();
  const objetivo = a.montoObjetivo;

  const estado: ApartadoEstado =
    juntado >= objetivo - 0.001 ? "listo" : vencimiento < hoy ? "atrasado" : "activo";

  return {
    cuotaSugerida: cuotaSugerida(a),
    cuotaEfectiva: cuotaEfectiva(a),
    ultimoPago,
    vencimiento,
    juntado,
    faltante: Math.max(0, Math.round((objetivo - juntado) * 100) / 100),
    progreso: objetivo > 0 ? Math.min(100, (juntado / objetivo) * 100) : 0,
    estado,
  };
}

const GROUP_CACHE = new Map<number, BudgetGroupRow>();
function grupoDe(id: number | null): BudgetGroupRow | null {
  if (id == null) return null;
  if (!GROUP_CACHE.has(id)) {
    const g = db.select().from(budgetGroups).where(eq(budgetGroups.id, id)).get();
    if (g) GROUP_CACHE.set(id, g);
  }
  return GROUP_CACHE.get(id) ?? null;
}

export function cargarApartados(): ApartadoRow[] {
  const rows = db.select().from(apartados).orderBy(apartados.orden, apartados.nombre).all();

  const cats = db.select().from(expenseCategories).all();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const accs = db.select().from(accounts).all();
  const accById = new Map(accs.map((a) => [a.id, a]));

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const quincena = hoy.getDate() <= 15 ? 1 : 2;

  return rows.map((a) => {
    const info = cicloInfo(a);
    const contrib = contribucionQuincena(a.id, anio, mes, quincena);
    const cat = a.categoriaId ? catById.get(a.categoriaId) : undefined;
    return {
      ...a,
      ...info,
      grupo: grupoDe(a.budgetGroupId),
      categoria: cat
        ? {
            ...cat,
            budgetGroup: cat.budgetGroupId ? grupoDe(cat.budgetGroupId) : null,
          }
        : null,
      cuenta: a.cuentaId ? (accById.get(a.cuentaId) ?? null) : null,
      apartadoQuincena: { anio, mes, quincena, registrado: contrib > 0, monto: contrib },
    };
  });
}

export function contribucionQuincena(apartadoId: number, anio: number, mes: number, quincena: number) {
  return db
    .select({ monto: apartadoContribuciones.monto })
    .from(apartadoContribuciones)
    .where(
      and(
        eq(apartadoContribuciones.apartadoId, apartadoId),
        eq(apartadoContribuciones.anio, anio),
        eq(apartadoContribuciones.mes, mes),
        eq(apartadoContribuciones.quincena, quincena)
      )
    )
    .all()[0]?.monto ?? 0;
}

export function registrarContribucion(apartadoId: number, anio: number, mes: number, quincena: number, monto: number) {
  db.insert(apartadoContribuciones)
    .values({ apartadoId, anio, mes, quincena, monto, fecha: todayISO() })
    .onConflictDoUpdate({
      target: [apartadoContribuciones.apartadoId, apartadoContribuciones.anio, apartadoContribuciones.mes, apartadoContribuciones.quincena],
      set: { monto },
    })
    .run();
}

export function quitarContribucion(apartadoId: number, anio: number, mes: number, quincena: number) {
  db.delete(apartadoContribuciones)
    .where(
      and(
        eq(apartadoContribuciones.apartadoId, apartadoId),
        eq(apartadoContribuciones.anio, anio),
        eq(apartadoContribuciones.mes, mes),
        eq(apartadoContribuciones.quincena, quincena)
      )
    )
    .run();
}
