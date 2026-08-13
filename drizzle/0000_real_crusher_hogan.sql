CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"saldo_actual" double precision DEFAULT 0 NOT NULL,
	"saldo_inicial" double precision DEFAULT 0 NOT NULL,
	"limite_credito" double precision,
	"fecha_corte" integer,
	"fecha_pago" integer,
	"color" text DEFAULT '#7C3AED' NOT NULL,
	"icono" text DEFAULT 'Wallet' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apartado_contribuciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"apartado_id" integer NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"quincena" integer NOT NULL,
	"monto" double precision NOT NULL,
	"fecha" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apartados" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"nombre" text NOT NULL,
	"monto_objetivo" double precision NOT NULL,
	"monto_quincena" double precision,
	"periodicidad" text NOT NULL,
	"dia_pago" integer NOT NULL,
	"mes_pago" integer,
	"budget_group_id" integer,
	"category_id" integer,
	"account_id" integer,
	"fecha_inicio" text NOT NULL,
	"icono" text DEFAULT 'Wallet' NOT NULL,
	"color" text DEFAULT '#7C3AED' NOT NULL,
	"nota" text,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"icono" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "budget_groups_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "cuotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"account_id" integer NOT NULL,
	"descripcion" text NOT NULL,
	"monto" double precision NOT NULL,
	"meses" integer NOT NULL,
	"tasa_anual" double precision DEFAULT 0 NOT NULL,
	"cuota" double precision NOT NULL,
	"total" double precision NOT NULL,
	"pagadas" integer DEFAULT 0 NOT NULL,
	"fecha" text NOT NULL,
	"transaction_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"persona_o_acreedor" text NOT NULL,
	"monto_original" double precision NOT NULL,
	"saldo_pendiente" double precision NOT NULL,
	"fecha_inicio" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"nombre" text NOT NULL,
	"icono" text DEFAULT 'Tag' NOT NULL,
	"color" text DEFAULT '#7C3AED' NOT NULL,
	"tipo" text DEFAULT 'gasto' NOT NULL,
	"budget_group_id" integer,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"nombre" text NOT NULL,
	"monto" double precision NOT NULL,
	"frecuencia" text NOT NULL,
	"proximo_cobro" text NOT NULL,
	"expense_category_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"budget_group_id" integer NOT NULL,
	"nota" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"descripcion" text NOT NULL,
	"monto" double precision NOT NULL,
	"tipo" text NOT NULL,
	"account_id" integer NOT NULL,
	"account_destino_id" integer,
	"category_id" integer,
	"apartado_id" integer,
	"fecha" text NOT NULL,
	"notas" text
);
--> statement-breakpoint
ALTER TABLE "apartado_contribuciones" ADD CONSTRAINT "apartado_contribuciones_apartado_id_apartados_id_fk" FOREIGN KEY ("apartado_id") REFERENCES "public"."apartados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_budget_group_id_budget_groups_id_fk" FOREIGN KEY ("budget_group_id") REFERENCES "public"."budget_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_budget_group_id_budget_groups_id_fk" FOREIGN KEY ("budget_group_id") REFERENCES "public"."budget_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_budget_group_id_budget_groups_id_fk" FOREIGN KEY ("budget_group_id") REFERENCES "public"."budget_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_destino_id_accounts_id_fk" FOREIGN KEY ("account_destino_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_apartado_id_apartados_id_fk" FOREIGN KEY ("apartado_id") REFERENCES "public"."apartados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_apartado_contrib_apartado" ON "apartado_contribuciones" USING btree ("apartado_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_apartado_contrib" ON "apartado_contribuciones" USING btree ("apartado_id","anio","mes","quincena");--> statement-breakpoint
CREATE INDEX "idx_apartados_grupo" ON "apartados" USING btree ("budget_group_id");--> statement-breakpoint
CREATE INDEX "idx_cuotas_account" ON "cuotas" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_fecha" ON "transactions" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "idx_transactions_account" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_category" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_tipo" ON "transactions" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_transactions_apartado" ON "transactions" USING btree ("apartado_id");