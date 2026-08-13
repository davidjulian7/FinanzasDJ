import { and, eq, gt, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authAttempts } from "@/lib/db/schema";

const VENTANA_MS = 60_000;
const MAX_INTENTOS = 5;
const LIMPIEZA_MS = 3_600_000;

export function ipDe(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconocido";
}

export async function bloquearSiExcede(key: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_MS);
  const rows = await db
    .select({ n: authAttempts.id })
    .from(authAttempts)
    .where(and(eq(authAttempts.key, key), gt(authAttempts.intentadoEn, desde)))
    .execute();
  return rows.length >= MAX_INTENTOS;
}

export async function registrarIntento(key: string) {
  await db.insert(authAttempts).values({ key }).execute();
  await db.delete(authAttempts).where(lte(authAttempts.intentadoEn, new Date(Date.now() - LIMPIEZA_MS))).execute();
}

export async function limpiarIntentos(key: string) {
  await db.delete(authAttempts).where(eq(authAttempts.key, key)).execute();
}