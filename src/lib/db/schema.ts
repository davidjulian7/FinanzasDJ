import {
  pgTable,
  text,
  integer,
  boolean,
  doublePrecision,
  uuid,
  serial,
  index,
  uniqueIndex,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";

export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    intentadoEn: timestamp("intentado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_auth_attempts_key").on(t.key)]
);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["debito", "credito", "efectivo", "inversion"] }).notNull(),
  saldoActual: doublePrecision("saldo_actual").notNull().default(0),
  saldoInicial: doublePrecision("saldo_inicial").notNull().default(0),
  limiteCredito: doublePrecision("limite_credito"),
  fechaCorte: integer("fecha_corte"),
  fechaPago: integer("fecha_pago"),
  color: text("color").notNull().default("#2D3748"),
  icono: text("icono").notNull().default("Wallet"),
});

export const budgetGroups = pgTable("budget_groups", {
  id: serial("id").primaryKey(),
  key: text("key", { enum: ["necesidades", "deseos", "ahorro"] }).notNull().unique(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  icono: text("icono").notNull(),
  orden: integer("orden").notNull().default(0),
});

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  nombre: text("nombre").notNull(),
  icono: text("icono").notNull().default("Tag"),
  color: text("color").notNull().default("#2D3748"),
  tipo: text("tipo", { enum: ["gasto", "ingreso"] }).notNull().default("gasto"),
  budgetGroupId: integer("budget_group_id").references(() => budgetGroups.id),
  activo: boolean("activo").notNull().default(true),
});

export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  nombre: text("nombre").notNull(),
  monto: doublePrecision("monto").notNull(),
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
  activo: boolean("activo").notNull().default(true),
});

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    descripcion: text("descripcion").notNull(),
    monto: doublePrecision("monto").notNull(),
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
    index("idx_transactions_user_fecha").on(t.userId, t.fecha),
    index("idx_transactions_user_account").on(t.userId, t.accountId),
  ]
);

export const apartados = pgTable(
  "apartados",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    nombre: text("nombre").notNull(),
    montoObjetivo: doublePrecision("monto_objetivo").notNull(),
    montoQuincena: doublePrecision("monto_quincena"),
    periodicidad: text("periodicidad", { enum: ["mensual", "anual"] }).notNull(),
    diaPago: integer("dia_pago").notNull(),
    mesPago: integer("mes_pago"),
    budgetGroupId: integer("budget_group_id").references(() => budgetGroups.id),
    categoriaId: integer("category_id").references(() => expenseCategories.id),
    cuentaId: integer("account_id").references(() => accounts.id),
    fechaInicio: text("fecha_inicio").notNull(),
    icono: text("icono").notNull().default("Wallet"),
    color: text("color").notNull().default("#2D3748"),
    nota: text("nota"),
    activo: boolean("activo").notNull().default(true),
    orden: integer("orden").notNull().default(0),
  },
  (t) => [index("idx_apartados_grupo").on(t.budgetGroupId)]
);

export const apartadoContribuciones = pgTable(
  "apartado_contribuciones",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    apartadoId: integer("apartado_id")
      .notNull()
      .references(() => apartados.id, { onDelete: "cascade" }),
    anio: integer("anio").notNull(),
    mes: integer("mes").notNull(),
    quincena: integer("quincena").notNull(),
    monto: doublePrecision("monto").notNull(),
    fecha: text("fecha").notNull(),
  },
  (t) => [
    index("idx_apartado_contrib_apartado").on(t.apartadoId),
    uniqueIndex("uq_apartado_contrib").on(t.apartadoId, t.anio, t.mes, t.quincena),
  ]
);

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["por_pagar", "por_cobrar"] }).notNull(),
  personaOAcreedor: text("persona_o_acreedor").notNull(),
  montoOriginal: doublePrecision("monto_original").notNull(),
  saldoPendiente: doublePrecision("saldo_pendiente").notNull(),
  fechaInicio: text("fecha_inicio").notNull(),
});

export const cuotas = pgTable(
  "cuotas",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    descripcion: text("descripcion").notNull(),
    monto: doublePrecision("monto").notNull(),
    meses: integer("meses").notNull(),
    tasaAnual: doublePrecision("tasa_anual").notNull().default(0),
    cuota: doublePrecision("cuota").notNull(),
    total: doublePrecision("total").notNull(),
    pagadas: integer("pagadas").notNull().default(0),
    fecha: text("fecha").notNull(),
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => transactions.id),
  },
  (t) => [
    index("idx_cuotas_account").on(t.accountId),
    index("idx_cuotas_user_account").on(t.userId, t.accountId),
  ]
);

export const settings = pgTable(
  "settings",
  {
    userId: uuid("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })]
);

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