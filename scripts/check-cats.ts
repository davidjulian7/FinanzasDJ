import { db } from "../src/lib/db/index";
import { expenseCategories } from "../src/lib/db/schema";

const cats = db.select().from(expenseCategories).all();
cats.forEach(c => console.log(c.nombre, c.tipo, c.budgetSubcategoryId));