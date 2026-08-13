import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";

// Aplica las migraciones de la carpeta /drizzle a la base de Postgres.
// Uso: npm run db:migrate

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no está definida. Configurala en .env.local (ver .env.example).");
    process.exit(1);
  }
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await client.end();
  console.log("Migraciones aplicadas correctamente.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});