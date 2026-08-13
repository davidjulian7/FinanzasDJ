import { db } from "../src/lib/db";
import { seedDatabase } from "../src/lib/db/seed";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2]?.toLowerCase();

let userId: number | undefined;
if (email) {
  const row = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  userId = row?.id;
  if (!userId) {
    console.log(`Advertencia: no existe un usuario con correo "${email}". El seed se creará sin dueño.`);
  }
}

const result = seedDatabase(userId);
if (result.seeded) {
  console.log(`Seed completado: ${result.transactions} transacciones creadas${userId ? ` para el usuario ${email}` : ""}.`);
} else {
  console.log("La base de datos ya contiene datos. Seed omitido.");
}