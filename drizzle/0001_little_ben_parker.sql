CREATE TABLE `cuotas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`monto` real NOT NULL,
	`meses` integer NOT NULL,
	`tasa_anual` real DEFAULT 0 NOT NULL,
	`cuota` real NOT NULL,
	`total` real NOT NULL,
	`pagadas` integer DEFAULT 0 NOT NULL,
	`fecha` text NOT NULL,
	`transaction_id` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cuotas_account` ON `cuotas` (`account_id`);