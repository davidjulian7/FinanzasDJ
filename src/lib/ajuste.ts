import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { accounts, expenseCategories, settings, transactions } from "./db/schema";
import { isoDate } from "./format";

const DIAS_PARA_AJUSTE = 7;
const KEY_ULTIMO_AJUSTE = "ultimo_ajuste_fecha";
const CATEGORIA_NOMBRE = "Ajuste / Dinero no registrado";

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
}

export async function getAjusteStatus(userId: string): Promise<AjusteStatus> {
  const rows = await db
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
    necesitaAjuste: dias >= DIAS_PARA_AJUSTE,
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

async function getOrCreateCategoriaAjuste(userId: string): Promise<number> {
  const existing = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.userId, userId), eq(expenseCategories.nombre, CATEGORIA_NOMBRE)))
    .execute();

  if (existing[0]) return existing[0].id;

  const rows = await db
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

function calcularDiferencia(tipo: string, saldoActual: number, saldoReal: number): number {
  if (tipo === "credito") {
    return saldoActual - saldoReal;
  }
  return saldoReal - saldoActual;
}

export async function procesarAjuste(userId: string, input: AjusteInput) {
  const status = await getAjusteStatus(userId);
  if (!status.necesitaAjuste && status.fechaUltimoAjuste) {
    throw new Error("No se requiere ajuste aún. Han pasado menos de 7 días desde el último ajuste.");
  }

  const categoriaId = await getOrCreateCategoriaAjuste(userId);
  const fecha = input.fecha || isoDate(new Date());

  const cuentasLock = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .for("update")
    .execute();

  const cuentasMap = new Map(cuentasLock.map((c) => [c.id, c]));

  let transaccionesCreadas = 0;
  let diferenciaTotal = 0;

  return db.transaction(async (tx) => {
    for (const item of input.cuentas) {
      const cuenta = cuentasMap.get(item.cuentaId);
      if (!cuenta) continue;

      const diff = calcularDiferencia(cuenta.tipo, cuenta.saldoActual, item.saldoReal);
      if (Math.abs(diff) < 0.01) continue;

      diferenciaTotal += diff;

      if (diff < 0) {
        const monto = Math.abs(diff);
        await tx
          .update(accounts)
          .set({ saldoActual: cuenta.saldoActual - monto })
          .where(and(eq(accounts.id, cuenta.id), eq(accounts.userId, userId)))
          .execute();

        await tx
          .insert(transactions)
          .values({
            userId,
            descripcion: `Ajuste: ${cuenta.nombre}`,
            monto,
            tipo: "gasto",
            accountId: cuenta.id,
            categoryId: categoriaId,
            fecha,
            notas: `Ajuste semanal · Saldo sistema: $${cuenta.saldoActual.toLocaleString("es-MX")} · Saldo real: $${item.saldoReal.toLocaleString("es-MX")}`,
          })
          .execute();

        transaccionesCreadas++;
      } else if (diff > 0) {
        const monto = diff;
        const delta = cuenta.tipo === "credito" ? -1 : 1;

        await tx
          .update(accounts)
          .set({ saldoActual: cuenta.saldoActual + monto * delta })
          .where(and(eq(accounts.id, cuenta.id), eq(accounts.userId, userId)))
          .execute();

        await tx
          .insert(transactions)
          .values({
            userId,
            descripcion: `Ajuste: ${cuenta.nombre}`,
            monto,
            tipo: "ingreso",
            accountId: cuenta.id,
            categoryId: null,
            fecha,
            notas: `Ajuste semanal · Saldo sistema: $${cuenta.saldoActual.toLocaleString("es-MX")} · Saldo real: $${item.saldoReal.toLocaleString("es-MX")}`,
          })
          .execute();

        transaccionesCreadas++;
      }
    }

    await tx
      .insert(settings)
      .values({ userId, key: KEY_ULTIMO_AJUSTE, value: JSON.stringify(fecha) })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value: JSON.stringify(fecha) },
      })
      .execute();

    return { transaccionesCreadas, diferenciaTotal };
  });
}
