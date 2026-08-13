import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createServerSupabaseClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, {
                ...options,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production",
              })
            );
          } catch {
            // Llamado desde un Server Component: lo ignora el middleware al refrescar la sesión.
          }
        },
      },
    }
  );
}