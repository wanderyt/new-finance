ALTER TABLE fin ADD COLUMN necessity_level TEXT NOT NULL DEFAULT 'essential'
  CHECK (necessity_level IN ('essential', 'personal_priority', 'flexible'));
--> statement-breakpoint
ALTER TABLE fin_items ADD COLUMN necessity_level TEXT
  CHECK (necessity_level IS NULL OR necessity_level IN ('essential', 'personal_priority', 'flexible'));
--> statement-breakpoint
ALTER TABLE fin_items ADD COLUMN necessity_reason TEXT;
