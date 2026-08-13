import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
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
  const u = data.user;
  return NextResponse.json({
    user: { id: u.id, nombre: String(u.user_metadata?.nombre ?? u.email), email: u.email },
  });
}