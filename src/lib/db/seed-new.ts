import { eq } from "drizzle-orm";
import { db } from "./index";
import { budgetGroups, budgetSubcategories, expenseCategories, recurringExpenses, accounts } from "./schema";

type OldCategory = { id: number; nombre: string; tipo: "gasto" | "ingreso"; icono: string; color: string; grupoPresupuesto: string | null };

function tableExists(name: string): boolean {
  const row = db.$client
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name) as { name: string } | undefined;
  return !!row;
}

const BUDGET_GROUPS: Array<{ key: "necesidades" | "deseos" | "ahorro"; label: string; color: string; icono: string; orden: number }> = [
  { key: "necesidades", label: "Necesidades", color: "#3B82F6", icono: "Umbrella", orden: 1 },
  { key: "deseos", label: "Deseos", color: "#F59E0B", icono: "Wallet", orden: 2 },
  { key: "ahorro", label: "Ahorro", color: "#06D6A0", icono: "PiggyBank", orden: 3 },
];

const DEFAULT_SUBCATEGORIES: Record<"necesidades" | "deseos" | "ahorro", Array<{ nombre: string; icono: string; color: string; orden: number }>> = {
  necesidades: [
    { nombre: "Gastos fijos", icono: "Receipt", color: "#3B82F6", orden: 1 },
    { nombre: "Suscripciones básicas", icono: "Tv", color: "#60A5FA", orden: 2 },
    { nombre: "Variable", icono: "ShoppingCart", color: "#93C5FD", orden: 3 },
  ],
  deseos: [
    { nombre: "Ocio", icono: "Gamepad2", color: "#F59E0B", orden: 1 },
    { nombre: "Regalos", icono: "Gift", color: "#FBBF24", orden: 2 },
    { nombre: "Caprichos", icono: "Sparkles", color: "#FCD34D", orden: 3 },
  ],
  ahorro: [
    { nombre: "Inversión", icono: "TrendingUp", color: "#06D6A0", orden: 1 },
    { nombre: "Emergencia", icono: "Shield", color: "#34D399", orden: 2 },
    { nombre: "Metas", icono: "Target", color: "#6EE7B7", orden: 3 },
  ],
};

export function seedBudgetGroups() {
  const existing = db.select({ id: budgetGroups.id }).from(budgetGroups).all();
  if (existing.length > 0) {
    console.log("Budget groups already seeded");
    return;
  }

  for (const g of BUDGET_GROUPS) {
    db.insert(budgetGroups).values(g).run();
  }
  console.log("Budget groups seeded");
}

export function seedBudgetSubcategories() {
  const existing = db.select({ id: budgetSubcategories.id }).from(budgetSubcategories).all();
  if (existing.length > 0) {
    console.log("Budget subcategories already seeded");
    return;
  }

  const groups = db.select().from(budgetGroups).all();
  const groupByKey = new Map<"necesidades" | "deseos" | "ahorro", number>(groups.map((g) => [g.key, g.id]));

  for (const [groupKey, subcats] of Object.entries(DEFAULT_SUBCATEGORIES)) {
    const groupId = groupByKey.get(groupKey as "necesidades" | "deseos" | "ahorro");
    if (!groupId) continue;
    for (const sc of subcats) {
      db.insert(budgetSubcategories)
        .values({ ...sc, budgetGroupId: groupId })
        .run();
    }
  }
  console.log("Budget subcategories seeded");
}

export function migrateCategoriesToExpenseCategories() {
  const existing = db.select({ id: expenseCategories.id }).from(expenseCategories).all();
  if (existing.length > 0) {
    console.log("Expense categories already migrated");
    return;
  }
  if (!tableExists("categories")) {
    console.log("No legacy categories table, skipping migration");
    return;
  }

  const old = db.$client.prepare("SELECT id, nombre, tipo, icono, color, grupo_presupuesto FROM categories").all() as Array<{
    id: number;
    nombre: string;
    tipo: string;
    icono: string;
    color: string;
    grupo_presupuesto: string | null;
  }>;
  const oldCategories: OldCategory[] = old.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo === "ingreso" ? "ingreso" : "gasto",
    icono: c.icono,
    color: c.color,
    grupoPresupuesto: c.grupo_presupuesto,
  }));

  const subcategories = db.select().from(budgetSubcategories).all();
  const subcatByName = new Map(subcategories.map((s) => [s.nombre, s.id]));
  const subcatByGroup = new Map<number, number[]>();
  for (const s of subcategories) {
    const arr = subcatByGroup.get(s.budgetGroupId) ?? [];
    arr.push(s.id);
    subcatByGroup.set(s.budgetGroupId, arr);
  }

  const groupByKey = new Map(
    (db.select().from(budgetGroups).all() as Array<{ key: string; id: number }>).map((g) => [g.key, g.id])
  );

  for (const c of oldCategories) {
    let budgetSubcategoryId: number | null = null;
    if (c.tipo === "gasto" && c.grupoPresupuesto && groupByKey.has(c.grupoPresupuesto)) {
      const groupId = groupByKey.get(c.grupoPresupuesto)!;
      const subcatIds = subcatByGroup.get(groupId) ?? [];
      if (subcatIds.length > 0) budgetSubcategoryId = subcatIds[0];
    }

    db.insert(expenseCategories)
      .values({
        nombre: c.nombre,
        icono: c.icono,
        color: c.color,
        tipo: c.tipo,
        budgetSubcategoryId,
        activo: true,
      })
      .run();
  }
  console.log("Categories migrated to expense_categories");
}

export function remapTransactions() {
  if (!tableExists("categories")) {
    console.log("No legacy categories table, skipping remap");
    return;
  }
  const old = db.$client
    .prepare("SELECT id, nombre, tipo, icono, color FROM categories")
    .all() as Array<{ id: number; nombre: string; tipo: string; icono: string; color: string }>;
  const newCats = db.select().from(expenseCategories).all();
  const newByKey = new Map(newCats.map((c) => [`${c.nombre}|${c.tipo}`, c.id]));

  for (const c of old) {
    const key = `${c.nombre}|${c.tipo}`;
    if (!newByKey.has(key)) {
      const inserted = db
        .insert(expenseCategories)
        .values({
          nombre: c.nombre,
          tipo: c.tipo === "ingreso" ? "ingreso" : "gasto",
          icono: c.icono,
          color: c.color,
          budgetSubcategoryId: null,
          activo: true,
        })
        .returning({ id: expenseCategories.id })
        .all()[0];
      newByKey.set(key, inserted.id);
    }
  }

  const map = new Map<number, number>();
  for (const c of old) {
    const nid = newByKey.get(`${c.nombre}|${c.tipo}`);
    if (nid) map.set(c.id, nid);
  }
  if (map.size === 0) return;

  for (const [oldId, newId] of map) {
    db.$client.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(newId, oldId);
  }
  console.log(`Remapped ${map.size} categories across transactions`);
}

export function seedIncomeCategories() {
  const existing = db.select().from(expenseCategories).where(eq(expenseCategories.tipo, "ingreso")).all();
  if (existing.length > 0) {
    console.log("Income categories already seeded");
    return;
  }

  const incomeCats = [
    { nombre: "Sueldo", icono: "Wallet", color: "#06D6A0" },
    { nombre: "Freelance", icono: "Laptop", color: "#10B981" },
    { nombre: "Otros Ingresos", icono: "Gift", color: "#84CC16" },
    { nombre: "Cobro de deudas", icono: "HandCoins", color: "#A855F7" },
  ];

  for (const c of incomeCats) {
    db.insert(expenseCategories)
      .values({
        ...c,
        tipo: "ingreso",
        budgetSubcategoryId: null,
        activo: true,
      })
      .run();
  }
  console.log("Income categories seeded");
}

export function seedRecurringExpenses() {
  const existing = db.select({ id: recurringExpenses.id }).from(recurringExpenses).all();
  if (existing.length > 0) {
    console.log("Recurring expenses already seeded");
    return;
  }

  const expenseCats = db.select().from(expenseCategories).all();
  const catByName = new Map(expenseCats.map((c) => [c.nombre, c.id]));

  const accs = db.select().from(accounts).all();
  const accByName = new Map(accs.map((a) => [a.nombre, a.id]));

  const groups = db.select().from(budgetGroups).all();
  const groupByKey = new Map<"necesidades" | "deseos" | "ahorro", number>(groups.map((g) => [g.key, g.id]));

  const recurrents = [
    { nombre: "Comida", monto: 550, frecuencia: "quincenal" as const, categoria: "🍜 Comida", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "Departamento", monto: 1500, frecuencia: "mensual" as const, categoria: "Departamento", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "Línea telefónica", monto: 150, frecuencia: "mensual" as const, categoria: "📱Servicios", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "Terapia", monto: 1000, frecuencia: "quincenal" as const, categoria: "🧘Salud", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "Transporte", monto: 120, frecuencia: "quincenal" as const, categoria: "🚖 Transporte", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "Apple", monto: 42, frecuencia: "mensual" as const, categoria: "Apple", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "Crunchyroll", monto: 15.6, frecuencia: "mensual" as const, categoria: "Crunchy", cuenta: "BBVA", grupo: "necesidades" },
    { nombre: "IA", monto: 20, frecuencia: "mensual" as const, categoria: "IA", cuenta: "BBVA", grupo: "necesidades" },
  ];

  for (const r of recurrents) {
    const expenseCategoryId = catByName.get(r.categoria);
    const accountId = accByName.get(r.cuenta);
    const budgetGroupId = groupByKey.get(r.grupo as "necesidades" | "deseos" | "ahorro");

    if (!expenseCategoryId || !accountId || !budgetGroupId) {
      console.warn(`Skipping ${r.nombre}: missing refs`, { expenseCategoryId, accountId, budgetGroupId });
      continue;
    }

    const today = new Date();
    let proximoCobro: Date;
    if (r.frecuencia === "quincenal") {
      proximoCobro = new Date(today.getFullYear(), today.getMonth(), today.getDate() <= 15 ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
    } else if (r.frecuencia === "mensual") {
      proximoCobro = new Date(today.getFullYear(), today.getMonth(), 1);
      if (proximoCobro < today) proximoCobro = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    } else {
      proximoCobro = today;
    }

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    db.insert(recurringExpenses)
      .values({
        nombre: r.nombre,
        monto: r.monto,
        frecuencia: r.frecuencia,
        proximoCobro: fmt(proximoCobro),
        expenseCategoryId,
        accountId,
        budgetGroupId,
        nota: null,
        activo: true,
      })
      .run();
  }
  console.log("Recurring expenses seeded");
}

export function migrateBudgetsToSubcategories() {
  const oldBudgets = db.$client
    .prepare(
      "SELECT id, mes, anio, quincena, categoria_id, monto_presupuestado FROM budgets WHERE categoria_id IS NOT NULL AND budget_subcategory_id IS NULL"
    )
    .all() as Array<{ id: number; mes: number; anio: number; quincena: number; categoria_id: number; monto_presupuestado: number }>;
  if (oldBudgets.length === 0) {
    console.log("No old budgets to migrate");
    return;
  }

  const newCats = db.select().from(expenseCategories).all();
  const newByOldName = new Map(newCats.map((c) => [c.nombre, c]));
  const subcategories = db.select().from(budgetSubcategories).all();
  const subcatById = new Map(subcategories.map((s) => [s.id, s]));

  let updated = 0;
  for (const b of oldBudgets) {
    const oldCat = db.$client
      .prepare("SELECT nombre FROM categories WHERE id = ?")
      .get(b.categoria_id) as { nombre: string } | undefined;
    if (!oldCat) continue;

    const newCat = newByOldName.get(oldCat.nombre);
    if (!newCat || !newCat.budgetSubcategoryId) continue;
    if (!subcatById.get(newCat.budgetSubcategoryId)) continue;

    try {
      db.$client
        .prepare("UPDATE budgets SET budget_subcategory_id = ? WHERE id = ?")
        .run(newCat.budgetSubcategoryId, b.id);
      updated++;
    } catch {
      const existing = db.$client
        .prepare(
          "SELECT id, monto_presupuestado FROM budgets WHERE mes=? AND anio=? AND quincena=? AND budget_subcategory_id=?"
        )
        .get(b.mes, b.anio, b.quincena, newCat.budgetSubcategoryId) as
        | { id: number; monto_presupuestado: number }
        | undefined;
      if (existing) {
        db.$client
          .prepare("UPDATE budgets SET monto_presupuestado = monto_presupuestado + ? WHERE id = ?")
          .run(b.monto_presupuestado, existing.id);
        db.$client.prepare("DELETE FROM budgets WHERE id = ?").run(b.id);
        updated++;
      }
    }
  }
  console.log(`Budgets migrated to budget_subcategories (${updated} rows)`);
}

export function rebuildBudgetsTable() {
  const cols = db.$client.prepare("PRAGMA table_info(budgets)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "categoria_id")) {
    console.log("budgets table already rebuilt");
    return;
  }
  db.$client.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE budgets_new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      mes integer NOT NULL,
      anio integer NOT NULL,
      quincena integer DEFAULT 1 NOT NULL,
      budget_subcategory_id integer,
      monto_presupuestado real DEFAULT 0 NOT NULL,
      FOREIGN KEY (budget_subcategory_id) REFERENCES budget_subcategories(id)
    );
    INSERT INTO budgets_new (id, mes, anio, quincena, budget_subcategory_id, monto_presupuestado)
      SELECT id, mes, anio, quincena, budget_subcategory_id, monto_presupuestado FROM budgets;
    DROP TABLE budgets;
    ALTER TABLE budgets_new RENAME TO budgets;
    CREATE UNIQUE INDEX idx_budgets_mes_anio_q_cat ON budgets(mes, anio, quincena, budget_subcategory_id);
    PRAGMA foreign_keys=ON;
  `);
  console.log("budgets table rebuilt (categoria_id removed)");
}

export function rebuildTransactionsTable() {
  const fks = db.$client.prepare("PRAGMA foreign_key_list(transactions)").all() as Array<{ table: string }>;
  if (!fks.some((f) => f.table === "categories")) {
    console.log("transactions table already rebuilt");
    return;
  }
  db.$client.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE transactions_new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      descripcion text NOT NULL,
      monto real NOT NULL,
      tipo text NOT NULL,
      account_id integer NOT NULL,
      account_destino_id integer,
      category_id integer,
      fecha text NOT NULL,
      notas text,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (account_destino_id) REFERENCES accounts(id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON UPDATE no action ON DELETE no action
    );
    INSERT INTO transactions_new (id, descripcion, monto, tipo, account_id, account_destino_id, category_id, fecha, notas)
      SELECT id, descripcion, monto, tipo, account_id, account_destino_id, category_id, fecha, notas FROM transactions;
    DROP TABLE transactions;
    ALTER TABLE transactions_new RENAME TO transactions;
    PRAGMA foreign_keys=ON;
  `);
  console.log("transactions table rebuilt (FK -> expense_categories)");
}

export function dropLegacyCategories() {
  if (!tableExists("categories")) {
    console.log("categories table already dropped");
    return;
  }
  db.$client.exec("DROP TABLE categories;");
  console.log("legacy categories table dropped");
}

export function addBudgetSubcategoryToTransactions() {
  const cols = db.$client.prepare("PRAGMA table_info(transactions)").all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === "budget_subcategory_id")) {
    console.log("transactions already has budget_subcategory_id");
    return;
  }
  db.$client.exec(`
    ALTER TABLE transactions ADD COLUMN budget_subcategory_id integer REFERENCES budget_subcategories(id);
  `);
  console.log("Added budget_subcategory_id to transactions");
}

export function runAllMigrations() {
  seedBudgetGroups();
  seedBudgetSubcategories();
  migrateCategoriesToExpenseCategories();
  seedIncomeCategories();
  seedRecurringExpenses();
  migrateBudgetsToSubcategories();
  rebuildBudgetsTable();
  rebuildTransactionsTable();
  remapTransactions();
  dropLegacyCategories();
  addBudgetSubcategoryToTransactions();
  console.log("All migrations completed");
}