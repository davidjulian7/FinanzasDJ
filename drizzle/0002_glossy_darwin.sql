DROP INDEX `idx_budgets_mes_anio_cat`;--> statement-breakpoint
ALTER TABLE `budgets` ADD `quincena` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budgets_mes_anio_q_cat` ON `budgets` (`mes`,`anio`,`quincena`,`categoria_id`);