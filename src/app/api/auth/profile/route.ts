import { NextRequest, NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api-server";
import { getSessionUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function emailEnUso(email: string, exceptoUserId?: string): Promise<boolean> {
  const admin = createAdminClient();
  for (let page = 1; page <= 3; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data?.users) break;
    const encontrado = data.users.find((u) => u.email?.toLowerCase() === email && u.id !== exceptoUserId);
    if (encontrado) return true;
    if (data.users.length < 1000) break;
  }
  return false;
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!nombre) return apiError("El nombre no puede estar vacío");
  if (nombre.length > 80) return apiError("El nombre es demasiado largo");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Correo inválido");

  const supabase = await createServerSupabaseClient();

  if (email !== user.email) {
    if (await emailEnUso(email, user.id)) {
      return apiError("Ese correo ya está en uso por otro usuario");
    }
    const admin = createAdminClient();
    const { error: emailError } = await admin.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
    });
    if (emailError) return apiError("No se pudo actualizar el correo", 500);
  }

  if (nombre !== user.nombre) {
    const { error: nombreError } = await supabase.auth.updateUser({ data: { nombre } });
    if (nombreError) return apiError("No se pudo actualizar el nombre", 500);
  }

  return NextResponse.json({ user: { id: user.id, nombre, email } });
}