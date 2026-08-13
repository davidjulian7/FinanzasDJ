import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { apiError, unauthorized } from "@/lib/api-server";
import { createSessionCookie, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!nombre) return apiError("El nombre no puede estar vacío");
  if (nombre.length > 80) return apiError("El nombre es demasiado largo");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Correo inválido");

  const enUso = db
    .select({ id: users.id })
    .from(users)
    .where(and(ne(users.id, user.id), eq(users.email, email)))
    .get();
  if (enUso) return apiError("Ese correo ya está en uso por otro usuario");

  db.update(users).set({ nombre, email }).where(eq(users.id, user.id)).run();

  const actualizado = { id: user.id, nombre, email };
  await createSessionCookie(actualizado);
  return NextResponse.json({ user: actualizado });
}