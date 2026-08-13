/**
 * Migración: tablas apartados + apartado_contribuciones y
 * transactions.apartado_id (reservas quincenales hacia pagos futuros).
 *
 * - apartados: plan de reserva (objetivo, periodicidad, día de pago, grupo)
 * - apartado_contribuciones: monto apartado por quincena (único por plan+quincena)
 * - transactions.apartado_id: vínculo del gasto real con su apartado
 *
 * Uso: npm run db:migrate:apartados
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "finanzas.db");
const BACKUP_PATH = path.join(DATA_DIR, `finanzas.backup-apartados-${Date.now()}.db`);

if (!fs.existsSync(DB_PATH)) {
  console.error("No se encontró la base de datos en", DB_PATH);
  process.exit(1);
}

console.log("Punto de control WAL…");
const pre = new Database(DB_PATH);
pre.pragma("wal_checkpoint(TRUNCATE)");
pre.close();

fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log("Backup creado:", BACKUP_PATH);

const db = new Database(DB_PATH);
db.pragma("foreign_keys = OFF");
db.pragma("journal_mode = WAL");

const getCols = (table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);

try {
  // ── tabla apartados ────────────────────────────────────────────────────────
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((t) => t.name);
  if (!tables.includes("apartados")) {
    console.log("Creando tabla apartados…");
    db.exec(`
      CREATE TABLE apartados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        monto_objetivo REAL NOT NULL,
        monto_quincena REAL,
        periodicidad TEXT NOT NULL CHECK (periodicidad IN ('mensual','anual')),
        dia_pago INTEGER NOT NULL,
        mes_pago INTEGER,
        budget_group_id INTEGER REFERENCES budget_groups(id),
        category_id INTEGER REFERENCES expense_categories(id),
        account_id INTEGER REFERENCES accounts(id),
        fecha_inicio TEXT NOT NULL,
        icono TEXT NOT NULL DEFAULT 'Wallet',
        color TEXT NOT NULL DEFAULT '#7C3AED',
        nota TEXT,
        activo INTEGER NOT NULL DEFAULT 1,
        orden INTEGER NOT NULL DEFAULT 0
      )
    `);
    db.exec("CREATE INDEX idx_apartados_grupo ON apartados(budget_group_id)");
  } else {
    console.log("apartados ya existe.");
  }

  // ── tabla apartado_contribuciones ──────────────────────────────────────────
  if (!tables.includes("apartado_contribuciones")) {
    console.log("Creando tabla apartado_contribuciones…");
    db.exec(`
      CREATE TABLE apartado_contribuciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartado_id INTEGER NOT NULL REFERENCES apartados(id) ON DELETE CASCADE,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        quincena INTEGER NOT NULL,
        monto REAL NOT NULL,
        fecha TEXT NOT NULL
      )
    `);
    db.exec("CREATE INDEX idx_apartado_contrib_apartado ON apartado_contribuciones(apartado_id)");
    db.exec("CREATE UNIQUE INDEX uq_apartado_contrib ON apartado_contribuciones(apartado_id, anio, mes, quincena)");
  } else {
    console.log("apartado_contribuciones ya existe.");
  }

  // ── transactions.apartado_id ───────────────────────────────────────────────
  const txCols = getCols("transactions");
  if (!txCols.includes("apartado_id")) {
    console.log("Agregando transactions.apartado_id…");
    db.exec("ALTER TABLE transactions ADD COLUMN apartado_id INTEGER REFERENCES apartados(id) ON DELETE SET NULL");
    db.exec("CREATE INDEX idx_transactions_apartado ON transactions(apartado_id)");
  } else {
    console.log("transactions.apartado_id ya existe.");
  }
} catch (e) {
  console.error("La migración falló:", e);
  process.exitCode = 1;
} finally {
  db.pragma("foreign_keys = ON");
  db.close();
}

console.log("Migración completada.");