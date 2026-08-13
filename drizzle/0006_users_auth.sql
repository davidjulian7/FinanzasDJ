CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_email` ON `users` (`email`);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `expense_categories` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `apartados` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `apartado_contribuciones` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `debts` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `cuotas` ADD `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
CREATE TABLE `new_settings` (
	`user_id` integer,
	`key` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`user_id`,`key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `new_settings` (`user_id`, `key`, `value`) SELECT NULL, `key`, `value` FROM `settings`;
--> statement-breakpoint
DROP TABLE `settings`;
--> statement-breakpoint
ALTER TABLE `new_settings` RENAME TO `settings`;