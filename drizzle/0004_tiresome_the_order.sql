CREATE INDEX `idx_transactions_account` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_tipo` ON `transactions` (`tipo`);