import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, unauthorized } from "@/lib/api-server";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const actual = String(body.actual ?? "");
  const nueva = String(body.nueva ?? "");

  if (!actual || !nueva) return apiError("Ingresá la contraseña actual y la nueva");
  if (nueva.length < 8) return apiError("La contraseña debe tener al menos 8 caracteres");
  if (nueva === actual) return apiError("La contraseña nueva debe ser distinta a la actual");

  const row = db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).get();
  if (!row || !verifyPassword(actual, row.passwordHash)) {
    return apiError("La contraseña actual es incorrecta", 401);
  }

  db.update(users).set({ passwordHash: hashPassword(nueva) }).where(eq(users.id, user.id)).run();
  return NextResponse.json({ ok: true });
}