import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/api-server";
import { createSessionCookie, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60_000;

const intentos = new Map<string, { count: number; hasta: number }>();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return apiError("Ingresá tu correo y contraseña");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError("Correo inválido");
  }

  const ahora = Date.now();
  const prev = intentos.get(email);
  if (prev && prev.hasta > ahora) {
    const seg = Math.ceil((prev.hasta - ahora) / 1000);
    return NextResponse.json({ error: `Demasiados intentos. Intentá de nuevo en ${seg}s` }, { status: 429 });
  }

  const row = db.select().from(users).where(eq(users.email, email)).get();
  const ok = row ? verifyPassword(password, row.passwordHash) : false;

  if (!ok || !row) {
    const prevCount = prev?.count ?? 0;
    const count = prevCount + 1;
    if (count >= MAX_INTENTOS) {
      intentos.set(email, { count: 0, hasta: ahora + BLOQUEO_MS });
    } else {
      intentos.set(email, { count, hasta: 0 });
    }
    return apiError("Correo o contraseña incorrectos", 401);
  }

  intentos.delete(email);
  await createSessionCookie({ id: row.id, nombre: row.nombre, email: row.email });
  return NextResponse.json({ user: { id: row.id, nombre: row.nombre, email: row.email } });
}