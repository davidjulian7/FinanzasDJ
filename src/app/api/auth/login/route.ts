import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bloquearSiExcede, ipDe, limpiarIntentos, registrarIntento } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const key = `${ipDe(req)}:${email}`;

  try {
    if (await bloquearSiExcede(key)) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos segundos." }, { status: 429 });
    }

    const password = String(body.password ?? "");

    if (!email || !password) {
      return apiError("Ingresa tu correo y contraseña");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("Correo inválido");
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      await registrarIntento(key);
      return apiError("Correo o contraseña incorrectos", 401);
    }

    await limpiarIntentos(key);
    const u = data.user;
    return NextResponse.json({
      user: { id: u.id, nombre: String(u.user_metadata?.nombre ?? u.email), email: u.email },
    });
  } catch (e) {
    return handleError(e);
  }
}