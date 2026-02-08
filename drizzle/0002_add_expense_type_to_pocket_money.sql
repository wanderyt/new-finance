-- Migration: Add 'expense' transaction type to pocket_money table
-- Date: 2026-02-08
-- Description: Updates the CHECK constraint to include 'expense' as a valid transaction_type

-- Step 1: Rename the existing table
ALTER TABLE pocket_money RENAME TO pocket_money_old;

-- Step 2: Create new table with updated CHECK constraint
CREATE TABLE pocket_money (
  pocket_money_id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL,
  transaction_date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('initial', 'weekly_allowance', 'bonus', 'deduction', 'expense')),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL DEFAULT 'system',
  FOREIGN KEY (person_id) REFERENCES persons(person_id) ON DELETE CASCADE
);

-- Step 3: Copy all data from old table to new table
INSERT INTO pocket_money (
  pocket_money_id,
  person_id,
  transaction_date,
  amount_cents,
  transaction_type,
  reason,
  created_at,
  created_by
)
SELECT
  pocket_money_id,
  person_id,
  transaction_date,
  amount_cents,
  transaction_type,
  reason,
  created_at,
  created_by
FROM pocket_money_old;

-- Step 4: Drop the old table
DROP TABLE pocket_money_old;

-- Step 5: Recreate indexes
CREATE INDEX idx_pocket_money_person ON pocket_money(person_id);
CREATE INDEX idx_pocket_money_date ON pocket_money(transaction_date);
CREATE INDEX idx_pocket_money_type ON pocket_money(transaction_type);

-- Verification query (commented out - uncomment to test)
-- SELECT name, sql FROM sqlite_master WHERE type='table' AND name='pocket_money';
