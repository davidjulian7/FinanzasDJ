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

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  tipo: text("tipo", { enum: ["gasto", "ingreso"] }).notNull(),
  icono: text("icono").notNull().default("Tag"),
  color: text("color").notNull().default("#7C3AED"),
  grupoPresupuesto: text("grupo_presupuesto", {
    enum: ["necesidades", "deseos", "ahorro"],
  }),
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
    categoryId: integer("category_id").references(() => categories.id),
    fecha: text("fecha").notNull(),
    notas: text("notas"),
  },
  (t) => [index("idx_transactions_fecha").on(t.fecha)]
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mes: integer("mes").notNull(),
    anio: integer("anio").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categories.id),
    montoPresupuestado: real("monto_presupuestado").notNull().default(0),
  },
  (t) => [uniqueIndex("idx_budgets_mes_anio_cat").on(t.mes, t.anio, t.categoriaId)]
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

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
