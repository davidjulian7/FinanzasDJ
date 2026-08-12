import Database from "better-sqlite3";
import path from "node:path";

const db = new Database(path.join(process.cwd(), "data", "finanzas.db"));

console.log("=== Tables ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

console.log("\n=== budget_groups ===");
console.log(db.prepare("PRAGMA table_info(budget_groups)").all());

console.log("\n=== budget_subcategories ===");
console.log(db.prepare("PRAGMA table_info(budget_subcategories)").all());

console.log("\n=== expense_categories ===");
console.log(db.prepare("PRAGMA table_info(expense_categories)").all());

console.log("\n=== recurring_expenses ===");
console.log(db.prepare("PRAGMA table_info(recurring_expenses)").all());

console.log("\n=== budgets ===");
console.log(db.prepare("PRAGMA table_info(budgets)").all());