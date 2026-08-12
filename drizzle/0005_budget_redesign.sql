CREATE TABLE `budget_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`color` text NOT NULL,
	`icono` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_groups_key_unique` ON `budget_groups` (`key`);
--> statement-breakpoint
CREATE TABLE `budget_subcategories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_group_id` integer NOT NULL,
	`nombre` text NOT NULL,
	`icono` text DEFAULT 'Tag' NOT NULL,
	`color` text DEFAULT '#7C3AED' NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`budget_group_id`) REFERENCES `budget_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`icono` text DEFAULT 'Tag' NOT NULL,
	`color` text DEFAULT '#7C3AED' NOT NULL,
	`budget_subcategory_id` integer,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`budget_subcategory_id`) REFERENCES `budget_subcategories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`monto` real NOT NULL,
	`frecuencia` text NOT NULL,
	`proximo_cobro` text NOT NULL,
	`expense_category_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`budget_group_id` integer NOT NULL,
	`nota` text,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`budget_group_id`) REFERENCES `budget_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `budgets` ADD `budget_subcategory_id` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budgets_mes_anio_q_subcat` ON `budgets` (`mes`,`anio`,`quincena`,`budget_subcategory_id`);