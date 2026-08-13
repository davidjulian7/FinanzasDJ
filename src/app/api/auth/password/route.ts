import { NextRequest, NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api-server";
import { getSessionUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const supabase = await createServerSupabaseClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: actual,
  });
  if (reauthError) return apiError("La contraseña actual es incorrecta", 401);

  const { error: updateError } = await supabase.auth.updateUser({ password: nueva });
  if (updateError) return apiError("No se pudo cambiar la contraseña", 500);

  return NextResponse.json({ ok: true });
}