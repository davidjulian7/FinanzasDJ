CREATE TABLE "auth_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"intentado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apartado_contribuciones" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apartados" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cuotas" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
--> statement-breakpoint
-- FKs a auth.users: al eliminar un usuario se borran sus datos.
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "fk_expense_categories_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "fk_recurring_expenses_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "fk_transactions_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "apartados" ADD CONSTRAINT "fk_apartados_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "apartado_contribuciones" ADD CONSTRAINT "fk_apartado_contribuciones_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "fk_debts_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "cuotas" ADD CONSTRAINT "fk_cuotas_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "fk_settings_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- CHECKs: montos y saldos coherentes a nivel base de datos.
ALTER TABLE "transactions" ADD CONSTRAINT "chk_transactions_monto" CHECK ("monto" > 0);
ALTER TABLE "cuotas" ADD CONSTRAINT "chk_cuotas_monto" CHECK ("monto" > 0 AND "meses" >= 1 AND "cuota" > 0);
ALTER TABLE "debts" ADD CONSTRAINT "chk_debts_montos" CHECK ("monto_original" > 0 AND "saldo_pendiente" >= 0);
ALTER TABLE "apartados" ADD CONSTRAINT "chk_apartados_monto" CHECK ("monto_objetivo" > 0);
ALTER TABLE "apartado_contribuciones" ADD CONSTRAINT "chk_apartado_contrib_monto" CHECK ("monto" > 0);
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "chk_recurring_monto" CHECK ("monto" > 0);
--> statement-breakpoint
CREATE INDEX "idx_auth_attempts_key" ON "auth_attempts" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_cuotas_user_account" ON "cuotas" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_fecha" ON "transactions" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_account" ON "transactions" USING btree ("user_id","account_id");