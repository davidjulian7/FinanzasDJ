UPDATE apartados AS a
SET budget_group_id = c.budget_group_id
FROM expense_categories AS c
WHERE a.category_id = c.id;
--> statement-breakpoint

UPDATE recurring_expenses AS r
SET budget_group_id = c.budget_group_id
FROM expense_categories AS c
WHERE r.expense_category_id = c.id;
--> statement-breakpoint

ALTER TABLE recurring_expenses ALTER COLUMN budget_group_id DROP NOT NULL;
