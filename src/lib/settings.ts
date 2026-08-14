import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { settings, transactions } from "./db/schema";
import { quincenaRango } from "./ranges";

export async function getSetting<T>(userId: string, key: string, fallback: T): Promise<T> {
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .execute();
  if (!row[0]) return fallback;
  try {
    return JSON.parse(row[0].value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(userId: string, key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ userId, key, value: JSON.stringify(value) })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value: JSON.stringify(value) },
    })
    .execute();
}

export interface ReglaPct {
  necesidades: number;
  deseos: number;
  ahorro: number;
}

export const REGLA_DEFAULT: ReglaPct = { necesidades: 50, deseos: 30, ahorro: 20 };

export async function getReglaPct(userId: string): Promise<ReglaPct> {
  return { ...REGLA_DEFAULT, ...(await getSetting<Partial<ReglaPct>>(userId, "regla_pct", {})) };
}

export function ingresoKey(anio: number, mes: number, quincena: number): string {
  return `ingreso_quincena_${anio}_${mes}_${quincena}`;
}

function periodoIndex(anio: number, mes: number, quincena: number): number {
  return (anio * 12 + (mes - 1)) * 2 + quincena;
}

const KEY_INGRESO = /^ingreso_quincena_(\d{4})_(\d{1,2})_(\d{1,2})$/;

// Última quincena anterior (cronológicamente) que tenga un ingreso guardado > 0.
export async function getUltimoIngresoQuincena(userId: string, anio: number, mes: number, quincena: number): Promise<number> {
  const target = periodoIndex(anio, mes, quincena);
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.userId, userId))
    .execute();

  let best: { index: number; value: number } | null = null;
  for (const r of rows) {
    const m = KEY_INGRESO.exec(r.key);
    if (!m) continue;
    const idx = periodoIndex(Number(m[1]), Number(m[2]), Number(m[3]));
    if (idx >= target) continue;
    let value: number;
    try {
      value = JSON.parse(r.value) as number;
    } catch {
      continue;
    }
    if (!Number.isFinite(value) || value <= 0) continue;
    if (!best || idx > best.index) best = { index: idx, value };
  }
  return best?.value ?? 0;
}

export async function getIngresoQuincena(userId: string, anio: number, mes: number, quincena: number): Promise<number> {
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, ingresoKey(anio, mes, quincena))))
    .execute();
  if (row[0]) {
    try {
      const v = JSON.parse(row[0].value) as number;
      if (Number.isFinite(v)) return v;
    } catch {
      /* valor corrupto: usa el fallback */
    }
  }

  const range = quincenaRango(anio, mes, quincena);
  const ingresos = await db
    .select({ monto: transactions.monto })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.tipo, "ingreso"),
        gte(transactions.fecha, range.from),
        lte(transactions.fecha, range.to)
      )
    )
    .execute();
  const suma = ingresos.reduce((s, t) => s + t.monto, 0);
  if (suma > 0) return suma;

  return getUltimoIngresoQuincena(userId, anio, mes, quincena);
}