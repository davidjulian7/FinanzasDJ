import Database from "better-sqlite3";
import path from "node:path";

const db = new Database(path.join(process.cwd(), "data", "finanzas.db"));
try {
  db.exec('ALTER TABLE expense_categories ADD COLUMN tipo TEXT DEFAULT "gasto" NOT NULL');
  console.log("Column added");
} catch (e) {
  console.log("Error:", e instanceof Error ? e.message : String(e))
}