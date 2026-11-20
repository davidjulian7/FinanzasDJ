import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { accounts, expenseCategories, settings, transactions } from "./db/schema";
import { isoDate } from "./format";
import { calcularDiferenciaAjuste, resumirAjuste, type ResultadoAjuste } from "./ajuste-calculos";

// Este plazo solo activa el recordatorio; se pueden guardar ajustes en cualquier momento.
const DIAS_RECORDATORIO_AJUSTE = 7;
const KEY_ULTIMO_AJUSTE = "ultimo_ajuste_fecha";
const CATEGORIA_NOMBRE = "Ajuste / Dinero no registrado";
type AjusteDb = Pick<typeof db, "select" | "insert">;

export class AjusteError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface AjusteStatus {
  necesitaAjuste: boolean;
  diasSinAjuste: number;
  fechaUltimoAjuste: string | null;
}

export interface CuentaAjuste {
  cuentaId: number;
  nombre: string;
  tipo: string;
  color: string;
  icono: string;
  saldoActual: number;
}

export interface AjusteInput {
  fecha: string;
  cuentas: { cuentaId: number; saldoReal: number }[];
  gastosRecordados?: { cuentaId: number; descripcion: string; monto: number }[];
}

export async function getAjusteStatus(userId: string, queryDb: AjusteDb = db): Promise<AjusteStatus> {
  const rows = await queryDb
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, KEY_ULTIMO_AJUSTE)))
    .execute();

  const fechaStr = rows[0]?.value ? (() => { try { return JSON.parse(rows[0].value) as string; } catch { return null; } })() : null;

  if (!fechaStr) {
    return { necesitaAjuste: true, diasSinAjuste: 999, fechaUltimoAjuste: null };
  }

  const [y, m, d] = fechaStr.split("-").map(Number);
  const fechaUltimo = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffMs = hoy.getTime() - fechaUltimo.getTime();
  const dias = Math.floor(diffMs / 86400000);

  return {
    necesitaAjuste: dias >= DIAS_RECORDATORIO_AJUSTE,
    diasSinAjuste: dias,
    fechaUltimoAjuste: fechaStr,
  };
}

export async function getCuentasParaAjuste(userId: string): Promise<CuentaAjuste[]> {
  const rows = await db
    .select({
      id: accounts.id,
      nombre: accounts.nombre,
      tipo: accounts.tipo,
      color: accounts.color,
      icono: accounts.icono,
      saldoActual: accounts.saldoActual,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .execute();

  return rows.map((r) => ({
    cuentaId: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    color: r.color,
    icono: r.icono,
    saldoActual: r.saldoActual,
  }));
}

async function getOrCreateCategoriaAjuste(userId: string, tx: AjusteDb): Promise<number> {
  const existing = await tx
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.userId, userId), eq(expenseCategories.nombre, CATEGORIA_NOMBRE)))
    .execute();

  if (existing[0]) return existing[0].id;

  const rows = await tx
    .insert(expenseCategories)
    .values({
      userId,
      nombre: CATEGORIA_NOMBRE,
      tipo: "gasto",
      icono: "Wrench",
      color: "#F97316",
      budgetGroupId: null,
      activo: true,
    })
    .returning({ id: expenseCategories.id })
    .execute();

  return rows[0].id;
}

export async function procesarAjuste(userId: string, input: AjusteInput): Promise<ResultadoAjuste> {
  if (!input || !Array.isArray(input.cuentas) || input.cuentas.length === 0) {
    throw new AjusteError("Debes ingresar al menos un saldo");
  }
  const ids = new Set<number>();
  for (const item of input.cuentas) {
    if (!item || !Number.isInteger(item.cuentaId) || item.cuentaId <= 0 || !Number.isFinite(item.saldoReal)) {
      throw new AjusteError("Los saldos y las cuentas deben ser v�lidos");
    }
    if (ids.has(item.cuentaId)) throw new AjusteError("Una cuenta no puede aparecer dos veces en el ajuste");
    ids.add(item.cuentaId);
  }
  const fecha = input.fecha || isoDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) {
    throw new AjusteError("La fecha del ajuste no es v�lida");
  }

  return db.transaction(async (tx) => {
    const cuentasLock = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.id)
      .for("update")
      .execute();
    const cuentasMap = new Map(cuentasLock.map((c) => [c.id, c]));
    if (input.cuentas.some((item) => !cuentasMap.has(item.cuentaId))) {
      throw new AjusteError("Una de las cuentas ya no est� disponible. Recarga el ajuste.");
    }

    const gastosPorCuenta = new Map<number, NonNullable<AjusteInput["gastosRecordados"]>>();
    for (const gasto of input.gastosRecordados ?? []) {
      if (!gasto || !Number.isInteger(gasto.cuentaId) || !ids.has(gasto.cuentaId) || !gasto.descripcion?.trim() || !Number.isFinite(gasto.monto) || gasto.monto <= 0) throw new AjusteError("Revisa los gastos recordados");
      const gastos = gastosPorCuenta.get(gasto.cuentaId) ?? [];
      gastos.push({ ...gasto, monto: Math.round(gasto.monto * 100) / 100 });
      gastosPorCuenta.set(gasto.cuentaId, gastos);
    }
    const diferencias: number[] = [];
    let transaccionesCreadas = 0;
    let categoriaId: number | null = null;
    for (const item of input.cuentas) {
      const cuenta = cuentasMap.get(item.cuentaId)!;
      const saldoReal = Math.round(item.saldoReal * 100) / 100;
      const diff = calcularDiferenciaAjuste(cuenta.tipo, cuenta.saldoActual, saldoReal);
      diferencias.push(diff);
      const esGasto = diff < 0;
      const gastos = gastosPorCuenta.get(cuenta.id) ?? [];
      const declarado = Math.round(gastos.reduce((sum, gasto) => sum + gasto.monto, 0) * 100) / 100;
      const faltante = esGasto ? Math.abs(diff) : 0;
      if (declarado > faltante + 0.001) throw new AjusteError(`Los gastos recordados de ${cuenta.nombre} superan la diferencia pendiente (${faltante.toFixed(2)})`);
      if (gastos.length > 0 && !esGasto) throw new AjusteError(`No hay faltante que declarar en ${cuenta.nombre}`);
      if (diff === 0 && gastos.length === 0) continue;
      const restante = Math.round((faltante - declarado) * 100) / 100;
      if ((gastos.length > 0 || restante > 0) && categoriaId === null) {
        categoriaId = await getOrCreateCategoriaAjuste(userId, tx);
      }

      await tx
        .update(accounts)
        .set({ saldoActual: saldoReal })
        .where(and(eq(accounts.id, cuenta.id), eq(accounts.userId, userId)))
        .execute();

      for (const gasto of gastos) {
        await tx.insert(transactions).values({
          userId,
          descripcion: gasto.descripcion.trim(),
          monto: gasto.monto,
          tipo: "gasto",
          accountId: cuenta.id,
          categoryId: categoriaId,
          fecha,
          notas: "Gasto recordado durante el ajuste de cuentas",
        }).execute();
        transaccionesCreadas++;
      }

      if (esGasto && restante === 0) continue;
      await tx
        .insert(transactions)
        .values({
          userId,
          descripcion: `Ajuste: ${cuenta.nombre}`,
          monto: esGasto ? restante : diff,
          tipo: esGasto ? "gasto" : "ingreso",
          accountId: cuenta.id,
          categoryId: esGasto ? categoriaId : null,
          fecha,
          notas: `Ajuste de cuentas � Saldo sistema: $${cuenta.saldoActual.toLocaleString("es-MX")} � Saldo real: $${saldoReal.toLocaleString("es-MX")}`,
        })
        .execute();
      transaccionesCreadas++;
    }

    await tx
      .insert(settings)
      .values({ userId, key: KEY_ULTIMO_AJUSTE, value: JSON.stringify(fecha) })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value: JSON.stringify(fecha) },
      })
      .execute();

    return { ...resumirAjuste(diferencias), transaccionesCreadas };
  });
}
