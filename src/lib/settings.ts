import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).all()[0];
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown) {
  db.insert(settings)
    .values({ key, value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
    .run();
}

export interface ReglaPct {
  necesidades: number;
  deseos: number;
  ahorro: number;
}

export const REGLA_DEFAULT: ReglaPct = { necesidades: 50, deseos: 30, ahorro: 20 };

export function getReglaPct(): ReglaPct {
  return { ...REGLA_DEFAULT, ...getSetting<Partial<ReglaPct>>("regla_pct", {}) };
}

export function ingresoKey(anio: number, mes: number, quincena: number): string {
  return `ingreso_quincena_${anio}_${mes}_${quincena}`;
}

export function getIngresoQuincena(anio: number, mes: number, quincena: number): number {
  return getSetting<number>(ingresoKey(anio, mes, quincena), 0);
}