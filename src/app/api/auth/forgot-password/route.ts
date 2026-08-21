import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();

  if (!email) return apiError("Ingresa tu correo electrónico");

  const origin = req.headers.get("origin") ?? process.env.SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${origin}/reset-password`;

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) return apiError("No se pudo enviar el correo de recuperación", 500);

  return Response.json({ ok: true });
}
