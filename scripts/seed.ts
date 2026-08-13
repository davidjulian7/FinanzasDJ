import { seedDatabase } from "../src/lib/db/seed";
import { createAdminClient } from "../src/lib/supabase/admin";

// Crea datos de ejemplo (cuentas, categorías, movimientos, deudas) para un usuario.
// Uso:
//   npm run db:seed -- <email>      (requiere que el usuario ya exista en Supabase)

const email = process.argv[2]?.toLowerCase();

async function main() {
  let userId: string | undefined;
  if (email) {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const found = data?.users.find((u) => u.email?.toLowerCase() === email);
    userId = found?.id;
    if (!userId) {
      console.log(`Advertencia: no existe un usuario con correo "${email}". El seed se creará sin dueño.`);
    }
  }

  const result = await seedDatabase(userId);
  if (result.seeded) {
    console.log(`Seed completado: ${result.transactions} transacciones creadas${userId ? ` para el usuario ${email}` : ""}.`);
  } else {
    console.log("La base de datos ya contiene datos. Seed omitido.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});