import { db } from "../src/lib/db/index";
import { budgetGroups, budgetSubcategories, expenseCategories, recurringExpenses, budgets } from "../src/lib/db/schema";

console.log("=== Budget Groups ===");
console.log(db.select().from(budgetGroups).all());

console.log("\n=== Budget Subcategories ===");
console.log(db.select().from(budgetSubcategories).all());

console.log("\n=== Expense Categories ===");
console.log(db.select().from(expenseCategories).all());

console.log("\n=== Recurring Expenses ===");
console.log(db.select().from(recurringExpenses).all());

console.log("\n=== Budgets (with subcategory) ===");
console.log(db.select().from(budgets).all());