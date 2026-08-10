import { seedDatabase } from "../src/lib/db/seed";

const result = seedDatabase();
if (result.seeded) {
  console.log(`Seed completado: ${result.transactions} transacciones creadas.`);
} else {
  console.log("La base de datos ya contiene datos. Seed omitido.");
}
