import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { apiError, handleError } from "@/lib/api-server";
import { seedBudgetGroups, seedCategoriesForUser } from "@/lib/db/seed";
import { bloquearSiExcede, ipDe, limpiarIntentos, registrarIntento } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = ipDe(req);

  try {
    if (await bloquearSiExcede(key)) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos segundos." }, { status: 429 });
    }

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

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const redirectTo = `${req.nextUrl.origin}/login`;
    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: { data: { nombre }, emailRedirectTo: redirectTo },
    });

    if (error || !data.user) {
      await registrarIntento(key);
      return apiError("No se pudo crear el perfil. Verifica los datos o intenta de nuevo.", 400);
    }

    await limpiarIntentos(key);
    await seedBudgetGroups();
    await seedCategoriesForUser(data.user.id);

    return NextResponse.json({ ok: true, email });
  } catch (e) {
    return handleError(e);
  }
}