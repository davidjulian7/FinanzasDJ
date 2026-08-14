import { createAdminClient } from "../src/lib/supabase/admin";
import { seedBudgetGroups, seedCategoriesForUser } from "../src/lib/db/seed";

// Crea un usuario con acceso a la aplicación (no hay registro público).
// Usa la service role key de Supabase (SUPABASE_SERVICE_ROLE_KEY en .env.local).
// Uso:
//   npm run user:create -- <email> <password> [nombre]

const email = process.argv[2]?.toLowerCase() ?? "";
const password = process.argv[3] ?? "";
const nombre = process.argv[4]?.trim() ?? email.split("@")[0] ?? "Usuario";

if (!email || !password) {
  console.log("Uso: npm run user:create -- <correo> <contraseña> [nombre]");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Correo inválido.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

async function main() {
  const admin = createAdminClient();

  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const yaExiste = existing?.users.some((u) => u.email?.toLowerCase() === email);
  if (yaExiste) {
    console.error(`Ya existe un usuario con el correo "${email}".`);
    process.exit(1);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error || !data.user) {
    console.error("No se pudo crear el usuario:", error?.message ?? "error desconocido");
    process.exit(1);
  }

  await seedBudgetGroups();
  await seedCategoriesForUser(data.user.id);

  console.log(`Usuario creado: ${data.user.email} (${nombre}) — id ${data.user.id}`);
  console.log("Ya puede iniciar sesión en /login.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});