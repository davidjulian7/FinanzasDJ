import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";

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

export async function getIngresoQuincena(userId: string, anio: number, mes: number, quincena: number): Promise<number> {
  return getSetting<number>(userId, ingresoKey(anio, mes, quincena), 0);
}