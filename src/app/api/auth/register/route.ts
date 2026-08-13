import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedBudgetGroups, seedCategoriesForUser } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 60_000;

const intentos = new Map<string, { count: number; hasta: number }>();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const nombre = String(body.nombre ?? "").trim();

  if (!email || !password || !nombre) {
    return apiError("Completa todos los campos");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError("Correo inválido");
  }
  if (password.length < 8) {
    return apiError("La contraseña debe tener al menos 8 caracteres");
  }
  if (nombre.length > 60) {
    return apiError("El nombre es muy largo");
  }

  const ahora = Date.now();
  const prev = intentos.get(email);
  if (prev && prev.hasta > ahora) {
    const seg = Math.ceil((prev.hasta - ahora) / 1000);
    return NextResponse.json({ error: `Demasiados intentos. Intenta de nuevo en ${seg}s` }, { status: 429 });
  }

  try {
    const admin = createAdminClient();

    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const yaExiste = existing?.users.some((u) => u.email?.toLowerCase() === email);
    if (yaExiste) {
      return apiError("Ya existe un perfil con ese correo");
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (error || !data.user) {
      return apiError(error?.message ?? "No se pudo crear el perfil", 400);
    }

    await seedBudgetGroups();
    await seedCategoriesForUser(data.user.id);

    const u = data.user;
    return NextResponse.json({
      user: { id: u.id, nombre: String(u.user_metadata?.nombre ?? u.email), email: u.email },
    });
  } catch (e) {
    const prevCount = prev?.count ?? 0;
    const count = prevCount + 1;
    if (count >= MAX_INTENTOS) {
      intentos.set(email, { count: 0, hasta: ahora + BLOQUEO_MS });
    } else {
      intentos.set(email, { count, hasta: 0 });
    }
    return handleError(e);
  }
}