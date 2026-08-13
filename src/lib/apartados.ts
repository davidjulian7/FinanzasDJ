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
export async function ultimoPagoDe(userId: string, apartadoId: number): Promise<string | null> {
  const rows = await db
    .select({ fecha: transactions.fecha })
    .from(transactions)
    .where(and(eq(transactions.apartadoId, apartadoId), eq(transactions.userId, userId)))
    .orderBy(desc(transactions.fecha), desc(transactions.id))
    .execute();
  return rows[0]?.fecha ?? null;
}

function quincenaFin(anio: number, mes: number, quincena: number): string {
  return quincenaRango(anio, mes, quincena).to;
}

// Total apartado desde el inicio del ciclo actual (último pago, o fecha de creación).
export async function juntadoEnCiclo(userId: string, apartadoId: number, inicioCiclo: string): Promise<number> {
  const rows = await db
    .select({ monto: apartadoContribuciones.monto, anio: apartadoContribuciones.anio, mes: apartadoContribuciones.mes, quincena: apartadoContribuciones.quincena })
    .from(apartadoContribuciones)
    .where(and(eq(apartadoContribuciones.apartadoId, apartadoId), eq(apartadoContribuciones.userId, userId)))
    .execute();
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

export async function cicloInfo(userId: string, a: {
  id: number;
  montoObjetivo: number;
  periodicidad: "mensual" | "anual";
  diaPago: number;
  mesPago: number | null;
  montoQuincena: number | null;
  fechaInicio: string;
}): Promise<CicloInfo> {
  const ultimoPago = await ultimoPagoDe(userId, a.id);
  const inicioCiclo = ultimoPago ?? a.fechaInicio;
  const vencimiento = proximoVencimiento(a, inicioCiclo);
  const juntado = await juntadoEnCiclo(userId, a.id, inicioCiclo);
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
async function grupoDe(id: number | null): Promise<BudgetGroupRow | null> {
  if (id == null) return null;
  if (!GROUP_CACHE.has(id)) {
    const rows = await db.select().from(budgetGroups).where(eq(budgetGroups.id, id)).execute();
    const g = rows[0];
    if (g) GROUP_CACHE.set(id, g);
  }
  return GROUP_CACHE.get(id) ?? null;
}

export async function cargarApartados(userId: string): Promise<ApartadoRow[]> {
  const [rows, cats, accs] = await Promise.all([
    db.select().from(apartados).where(eq(apartados.userId, userId)).orderBy(apartados.orden, apartados.nombre).execute(),
    db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId)).execute(),
    db.select().from(accounts).where(eq(accounts.userId, userId)).execute(),
  ]);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const accById = new Map(accs.map((a) => [a.id, a]));

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const quincena = hoy.getDate() <= 15 ? 1 : 2;

  const resultado: ApartadoRow[] = [];
  for (const a of rows) {
    const info = await cicloInfo(userId, a);
    const contrib = await contribucionQuincena(userId, a.id, anio, mes, quincena);
    const cat = a.categoriaId ? catById.get(a.categoriaId) : undefined;
    resultado.push({
      ...a,
      ...info,
      grupo: await grupoDe(a.budgetGroupId),
      categoria: cat
        ? {
            ...cat,
            budgetGroup: cat.budgetGroupId ? await grupoDe(cat.budgetGroupId) : null,
          }
        : null,
      cuenta: a.cuentaId ? (accById.get(a.cuentaId) ?? null) : null,
      apartadoQuincena: { anio, mes, quincena, registrado: contrib > 0, monto: contrib },
    });
  }
  return resultado;
}

export async function contribucionQuincena(userId: string, apartadoId: number, anio: number, mes: number, quincena: number): Promise<number> {
  const rows = await db
    .select({ monto: apartadoContribuciones.monto })
    .from(apartadoContribuciones)
    .where(
      and(
        eq(apartadoContribuciones.apartadoId, apartadoId),
        eq(apartadoContribuciones.userId, userId),
        eq(apartadoContribuciones.anio, anio),
        eq(apartadoContribuciones.mes, mes),
        eq(apartadoContribuciones.quincena, quincena)
      )
    )
    .execute();
  return rows[0]?.monto ?? 0;
}

export async function registrarContribucion(userId: string, apartadoId: number, anio: number, mes: number, quincena: number, monto: number) {
  await db
    .insert(apartadoContribuciones)
    .values({ userId, apartadoId, anio, mes, quincena, monto, fecha: todayISO() })
    .onConflictDoUpdate({
      target: [apartadoContribuciones.apartadoId, apartadoContribuciones.anio, apartadoContribuciones.mes, apartadoContribuciones.quincena],
      set: { monto },
    })
    .execute();
}

export async function quitarContribucion(userId: string, apartadoId: number, anio: number, mes: number, quincena: number) {
  await db
    .delete(apartadoContribuciones)
    .where(
      and(
        eq(apartadoContribuciones.apartadoId, apartadoId),
        eq(apartadoContribuciones.userId, userId),
        eq(apartadoContribuciones.anio, anio),
        eq(apartadoContribuciones.mes, mes),
        eq(apartadoContribuciones.quincena, quincena)
      )
    )
    .execute();
}