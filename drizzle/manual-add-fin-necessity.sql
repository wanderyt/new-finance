-- Migration: Add spending priorities to fin records and items
-- Date: 2026-11-06
-- Description: Adds priority fields with all four allowed levels.
-- Prerequisite: The spending-priority columns must not exist yet.
-- Back up the database before running this one-time migration.
-- Execute this SQL as one script. Stop execution if any statement fails.

-- Step 1: Start the transaction
PRAGMA busy_timeout = 10000;
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

-- Step 2: Add the record default
ALTER TABLE fin ADD COLUMN necessity_level TEXT NOT NULL DEFAULT 'essential'
  CHECK (necessity_level IN ('essential', 'personal_priority', 'flexible', 'unexpected'));

-- Step 3: Add the item override and optional reason
ALTER TABLE fin_items ADD COLUMN necessity_level TEXT
  CHECK (necessity_level IS NULL OR necessity_level IN ('essential', 'personal_priority', 'flexible', 'unexpected'));

ALTER TABLE fin_items ADD COLUMN necessity_reason TEXT;

-- Step 4: Assign Essential to exact legacy tax rows
UPDATE fin_items
SET necessity_level = 'essential'
WHERE name = '税'
  AND notes = 'Tax (HST/GST/PST combined)'
  AND necessity_level IS NULL;

-- Step 5: Commit the changes
COMMIT;

-- Verification queries (uncomment after applying the migration)
-- PRAGMA table_info(fin);
-- PRAGMA table_info(fin_items);
-- SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('fin', 'fin_items');
