import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __dbConn?: ReturnType<typeof postgres>;
};

function createConnection(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida. Configurala en .env.local (ver .env.example).");
  }
  return postgres(url, { max: 10, prepare: false });
}

function getDb() {
  const conn = (globalForDb.__dbConn ??= createConnection());
  return drizzle(conn, { schema });
}

type Db = ReturnType<typeof getDb>;

let cached: Db | undefined;

// Cliente diferido: no crea la conexión hasta el primer uso real,
// para que el build funcione sin DATABASE_URL configurada.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    cached ??= getDb();
    return Reflect.get(cached, prop, receiver);
  },
  set(_target, prop, value, receiver) {
    cached ??= getDb();
    return Reflect.set(cached, prop, value, receiver);
  },
});