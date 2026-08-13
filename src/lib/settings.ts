import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";

export function getSetting<T>(userId: number, key: string, fallback: T): T {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .all()[0];
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(userId: number, key: string, value: unknown) {
  db.insert(settings)
    .values({ userId, key, value: JSON.stringify(value) })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value: JSON.stringify(value) },
    })
    .run();
}

export interface ReglaPct {
  necesidades: number;
  deseos: number;
  ahorro: number;
}

export const REGLA_DEFAULT: ReglaPct = { necesidades: 50, deseos: 30, ahorro: 20 };

export function getReglaPct(userId: number): ReglaPct {
  return { ...REGLA_DEFAULT, ...getSetting<Partial<ReglaPct>>(userId, "regla_pct", {}) };
}

export function ingresoKey(anio: number, mes: number, quincena: number): string {
  return `ingreso_quincena_${anio}_${mes}_${quincena}`;
}

export function getIngresoQuincena(userId: number, anio: number, mes: number, quincena: number): number {
  return getSetting<number>(userId, ingresoKey(anio, mes, quincena), 0);
}