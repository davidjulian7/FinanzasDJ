import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "finanzas.db");

const globalForDb = globalThis as unknown as { __dbConn?: Database.Database };

function createConnection(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  return conn;
}

function getDb() {
  const conn = (globalForDb.__dbConn ??= createConnection());
  return drizzle(conn, { schema });
}

export const db = getDb();

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
