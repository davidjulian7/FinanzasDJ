import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["debito", "credito", "efectivo", "inversion"] }).notNull(),
  saldoActual: real("saldo_actual").notNull().default(0),
  saldoInicial: real("saldo_inicial").notNull().default(0),
  limiteCredito: real("limite_credito"),
  fechaCorte: integer("fecha_corte"),
  fechaPago: integer("fecha_pago"),
  color: text("color").notNull().default("#7C3AED"),
  icono: text("icono").notNull().default("Wallet"),
});

export const budgetGroups = sqliteTable("budget_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key", { enum: ["necesidades", "deseos", "ahorro"] }).notNull().unique(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  icono: text("icono").notNull(),
  orden: integer("orden").notNull().default(0),
});

export const expenseCategories = sqliteTable("expense_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  icono: text("icono").notNull().default("Tag"),
  color: text("color").notNull().default("#7C3AED"),
  tipo: text("tipo", { enum: ["gasto", "ingreso"] }).notNull().default("gasto"),
  budgetGroupId: integer("budget_group_id").references(() => budgetGroups.id),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
});

export const recurringExpenses = sqliteTable("recurring_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  monto: real("monto").notNull(),
  frecuencia: text("frecuencia", { enum: ["semanal", "quincenal", "mensual", "anual"] }).notNull(),
  proximoCobro: text("proximo_cobro").notNull(),
  expenseCategoryId: integer("expense_category_id")
    .notNull()
    .references(() => expenseCategories.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  budgetGroupId: integer("budget_group_id")
    .notNull()
    .references(() => budgetGroups.id),
  nota: text("nota"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    descripcion: text("descripcion").notNull(),
    monto: real("monto").notNull(),
    tipo: text("tipo", { enum: ["gasto", "ingreso", "transferencia"] }).notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    accountDestinoId: integer("account_destino_id").references(() => accounts.id),
    categoryId: integer("category_id").references(() => expenseCategories.id),
    apartadoId: integer("apartado_id").references(() => apartados.id, { onDelete: "set null" }),
    fecha: text("fecha").notNull(),
    notas: text("notas"),
  },
  (t) => [
    index("idx_transactions_fecha").on(t.fecha),
    index("idx_transactions_account").on(t.accountId),
    index("idx_transactions_category").on(t.categoryId),
    index("idx_transactions_tipo").on(t.tipo),
    index("idx_transactions_apartado").on(t.apartadoId),
  ]
);

export const apartados = sqliteTable(
  "apartados",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nombre: text("nombre").notNull(),
    montoObjetivo: real("monto_objetivo").notNull(),
    montoQuincena: real("monto_quincena"),
    periodicidad: text("periodicidad", { enum: ["mensual", "anual"] }).notNull(),
    diaPago: integer("dia_pago").notNull(),
    mesPago: integer("mes_pago"),
    budgetGroupId: integer("budget_group_id").references(() => budgetGroups.id),
    categoriaId: integer("category_id").references(() => expenseCategories.id),
    cuentaId: integer("account_id").references(() => accounts.id),
    fechaInicio: text("fecha_inicio").notNull(),
    icono: text("icono").notNull().default("Wallet"),
    color: text("color").notNull().default("#7C3AED"),
    nota: text("nota"),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),
    orden: integer("orden").notNull().default(0),
  },
  (t) => [index("idx_apartados_grupo").on(t.budgetGroupId)]
);

export const apartadoContribuciones = sqliteTable(
  "apartado_contribuciones",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    apartadoId: integer("apartado_id")
      .notNull()
      .references(() => apartados.id, { onDelete: "cascade" }),
    anio: integer("anio").notNull(),
    mes: integer("mes").notNull(),
    quincena: integer("quincena").notNull(),
    monto: real("monto").notNull(),
    fecha: text("fecha").notNull(),
  },
  (t) => [
    index("idx_apartado_contrib_apartado").on(t.apartadoId),
    uniqueIndex("uq_apartado_contrib").on(t.apartadoId, t.anio, t.mes, t.quincena),
  ]
);

export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["por_pagar", "por_cobrar"] }).notNull(),
  personaOAcreedor: text("persona_o_acreedor").notNull(),
  montoOriginal: real("monto_original").notNull(),
  saldoPendiente: real("saldo_pendiente").notNull(),
  fechaInicio: text("fecha_inicio").notNull(),
});

export const cuotas = sqliteTable(
  "cuotas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    descripcion: text("descripcion").notNull(),
    monto: real("monto").notNull(),
    meses: integer("meses").notNull(),
    tasaAnual: real("tasa_anual").notNull().default(0),
    cuota: real("cuota").notNull(),
    total: real("total").notNull(),
    pagadas: integer("pagadas").notNull().default(0),
    fecha: text("fecha").notNull(),
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => transactions.id),
  },
  (t) => [index("idx_cuotas_account").on(t.accountId)]
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type BudgetGroup = typeof budgetGroups.$inferSelect;
export type NewBudgetGroup = typeof budgetGroups.$inferInsert;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;
export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type NewRecurringExpense = typeof recurringExpenses.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type Cuota = typeof cuotas.$inferSelect;
export type NewCuota = typeof cuotas.$inferInsert;
export type Apartado = typeof apartados.$inferSelect;
export type NewApartado = typeof apartados.$inferInsert;
export type ApartadoContribucion = typeof apartadoContribuciones.$inferSelect;
export type NewApartadoContribucion = typeof apartadoContribuciones.$inferInsert;