CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`saldo_actual` real DEFAULT 0 NOT NULL,
	`saldo_inicial` real DEFAULT 0 NOT NULL,
	`limite_credito` real,
	`fecha_corte` integer,
	`fecha_pago` integer,
	`color` text DEFAULT '#7C3AED' NOT NULL,
	`icono` text DEFAULT 'Wallet' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mes` integer NOT NULL,
	`anio` integer NOT NULL,
	`categoria_id` integer NOT NULL,
	`monto_presupuestado` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budgets_mes_anio_cat` ON `budgets` (`mes`,`anio`,`categoria_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`icono` text DEFAULT 'Tag' NOT NULL,
	`color` text DEFAULT '#7C3AED' NOT NULL,
	`grupo_presupuesto` text
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`persona_o_acreedor` text NOT NULL,
	`monto_original` real NOT NULL,
	`saldo_pendiente` real NOT NULL,
	`fecha_inicio` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`descripcion` text NOT NULL,
	`monto` real NOT NULL,
	`tipo` text NOT NULL,
	`account_id` integer NOT NULL,
	`account_destino_id` integer,
	`category_id` integer,
	`fecha` text NOT NULL,
	`notas` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_destino_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_fecha` ON `transactions` (`fecha`);