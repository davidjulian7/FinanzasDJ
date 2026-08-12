import { db } from "../src/lib/db/index";
import { expenseCategories, accounts } from "../src/lib/db/schema";

const cats = db.select().from(expenseCategories).all();
console.log("Expense categories:", cats.map((c) => c.nombre));
const accs = db.select().from(accounts).all();
console.log("Accounts:", accs.map((a) => a.nombre));