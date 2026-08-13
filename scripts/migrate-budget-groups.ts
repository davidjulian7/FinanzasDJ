/**
 * Migración: simplificar presupuesto a solo 50/30/20 por grupo.
 *
 * - expense_categories.budget_subcategory_id  ->  budget_group_id (backfill desde subcategoría)
 * - transactions.budget_subcategory_id        ->  se elimina
 * - tabla budgets                             ->  se elimina
 * - tabla budget_subcategories                ->  se elimina
 *
 * Uso: npm run db:migrate:budget-groups
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "finanzas.db");
const BACKUP_PATH = path.join(DATA_DIR, `finanzas.backup-budget-groups-${Date.now()}.db`);

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

const getTable = (name: string) =>
  db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name) as { sql: string } | undefined;
const getCols = (table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);

try {
  // ── expense_categories: budget_subcategory_id -> budget_group_id ──────────
  const catCols = getCols("expense_categories");
  if (catCols.includes("budget_subcategory_id")) {
    console.log("Rebuild de expense_categories: budget_subcategory_id -> budget_group_id…");
    db.prepare(
      `UPDATE expense_categories
       SET budget_group_id = (SELECT budget_group_id FROM budget_subcategories WHERE budget_subcategories.id = expense_categories.budget_subcategory_id)
       WHERE budget_subcategory_id IS NOT NULL`
    ).run();
    db.prepare(
      `CREATE TABLE expense_categories_new (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         nombre TEXT NOT NULL,
         icono TEXT NOT NULL DEFAULT 'Tag',
         color TEXT NOT NULL DEFAULT '#7C3AED',
         tipo TEXT NOT NULL DEFAULT 'gasto',
         budget_group_id INTEGER REFERENCES budget_groups(id),
         activo INTEGER NOT NULL DEFAULT 1
       )`
    ).run();
    db.prepare(
      `INSERT INTO expense_categories_new (id, nombre, icono, color, tipo, budget_group_id, activo)
       SELECT id, nombre, icono, color, tipo, budget_group_id, activo FROM expense_categories`
    ).run();
    db.prepare("DROP TABLE expense_categories").run();
    db.prepare("ALTER TABLE expense_categories_new RENAME TO expense_categories").run();
  } else {
    console.log("expense_categories ya migrada.");
  }

  // ── transactions: quitar budget_subcategory_id ────────────────────────────
  const txCols = getCols("transactions");
  if (txCols.includes("budget_subcategory_id")) {
    console.log("Rebuild de transactions: quitar budget_subcategory_id…");
    db.prepare(
      `CREATE TABLE transactions_new (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         descripcion TEXT NOT NULL,
         monto REAL NOT NULL,
         tipo TEXT NOT NULL,
         account_id INTEGER NOT NULL REFERENCES accounts(id),
         account_destino_id INTEGER REFERENCES accounts(id),
         category_id INTEGER REFERENCES expense_categories(id),
         fecha TEXT NOT NULL,
         notas TEXT
       )`
    ).run();
    db.prepare(
      `INSERT INTO transactions_new (id, descripcion, monto, tipo, account_id, account_destino_id, category_id, fecha, notas)
       SELECT id, descripcion, monto, tipo, account_id, account_destino_id, category_id, fecha, notas FROM transactions`
    ).run();
    db.prepare("DROP TABLE transactions").run();
    db.prepare("ALTER TABLE transactions_new RENAME TO transactions").run();
    db.prepare("CREATE INDEX idx_transactions_fecha ON transactions(fecha)").run();
    db.prepare("CREATE INDEX idx_transactions_account ON transactions(account_id)").run();
    db.prepare("CREATE INDEX idx_transactions_category ON transactions(category_id)").run();
    db.prepare("CREATE INDEX idx_transactions_tipo ON transactions(tipo)").run();
  } else {
    console.log("transactions ya migrada.");
  }

  // ── eliminar tablas derivadas ─────────────────────────────────────────────
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((t) => t.name);
  if (tables.includes("budgets")) {
    console.log("Eliminando tabla budgets…");
    db.prepare("DROP TABLE budgets").run();
  }
  if (tables.includes("budget_subcategories")) {
    console.log("Eliminando tabla budget_subcategories…");
    db.prepare("DROP TABLE budget_subcategories").run();
  }

  const catSinGrupo = db.prepare("SELECT COUNT(*) n FROM expense_categories WHERE budget_group_id IS NULL").get() as { n: number };
  const catConGrupo = db.prepare("SELECT COUNT(*) n FROM expense_categories WHERE budget_group_id IS NOT NULL").get() as { n: number };
  console.log(`Categorías con grupo: ${catConGrupo.n}, sin grupo: ${catSinGrupo.n}`);
} catch (e) {
  console.error("La migración falló:", e);
  process.exitCode = 1;
} finally {
  db.pragma("foreign_keys = ON");
  db.close();
}

console.log("Migración completada.");