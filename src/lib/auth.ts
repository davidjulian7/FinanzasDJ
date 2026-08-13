import { createServerSupabaseClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  nombre: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return {
    id: user.id,
    nombre: String(user.user_metadata?.nombre ?? user.email ?? ""),
    email: user.email ?? "",
  };
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}