# Financial Records Migration: test.db → finance.db

**Date**: 2026-01-11
**Migration Version**: v1.0
**Target Records**: Latest 500 non-scheduled transactions from 2025

## Overview

This document describes the migration process for transferring financial records from the legacy database (`db/test.db`) to the new schema (`db/finance.db`).

### Migration Scope

- **Source**: `db/test.db` - FIN table (old schema)
- **Target**: `db/finance.db` - fin table (new schema)
- **Record Count**: ~500 latest non-scheduled records from 2025
- **Data Types**: Transactions, Tags, Person-specific line items

### Key Features

1. **Schema Transformation**: Convert from 13-column legacy schema to 20-column modern schema
2. **Currency Multi-Support**: Convert dollar amounts to cents, apply FX rates for CAD/USD/CNY
3. **Tag Migration**: Parse comma-separated tags and create proper tag relationships
4. **Person Attribution**: Auto-create line items for person-specific categories (骐骐→Robin, 慢慢→Luna)
5. **Filtering**: Skip scheduled transactions (isScheduled=1)

---

## Schema Comparison

### Legacy Schema (test.db FIN)

```sql
CREATE TABLE FIN (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  comment VARCHAR(200),
  date TEXT,
  amount DECIMAL(10, 2),     -- stored as dollars
  isScheduled NUMBER,
  scheduleId VARCHAR(100),
  place VARCHAR(100),
  city VARCHAR(100),
  USERID NUMBER,
  tags VARCHAR(500),          -- comma-separated string
  details VARCHAR(200)
);
```

**Key Characteristics**:
- Amounts stored as decimal dollars
- Tags stored as comma-separated string in single column
- No person attribution
- No multi-currency support
- Single user tracking via USERID

### New Schema (finance.db fin)

```sql
CREATE TABLE fin (
  fin_id text PRIMARY KEY,
  user_id integer NOT NULL,
  type text DEFAULT 'expense' NOT NULL,
  date text NOT NULL,
  scheduled_on text,
  schedule_rule_id integer,
  merchant text,
  comment text,
  place text,
  city text,
  category text,
  subcategory text,
  details text,
  original_currency text NOT NULL,
  original_amount_cents integer NOT NULL,    -- stored as cents
  fx_id integer,
  amount_cad_cents integer NOT NULL,
  amount_usd_cents integer NOT NULL,
  amount_cny_cents integer NOT NULL,
  amount_base_cad_cents integer NOT NULL,
  is_scheduled integer DEFAULT false NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE cascade,
  FOREIGN KEY (schedule_rule_id) REFERENCES schedule_rules(schedule_rule_id) ON DELETE set null,
  FOREIGN KEY (fx_id) REFERENCES fx_snapshots(fx_id) ON DELETE set null
);
```

**Key Characteristics**:
- Amounts stored as integer cents (avoids floating-point issues)
- Multi-currency support with historical FX rates
- Separate tags table with many-to-many relationship (fin_tags)
- Person attribution via line items (fin_items)
- Enhanced merchant tracking
- Strong foreign key relationships

---

## Field Mapping

| Legacy Field (FIN) | New Field (fin) | Transformation | Notes |
|--------------------|-----------------|----------------|-------|
| id | fin_id | Direct copy | UUID preserved |
| USERID | user_id | Always → 1 | Map all records to demo user |
| - | type | Set 'expense' | Assuming all are expenses |
| date | date | Direct copy | Timestamp preserved |
| - | scheduled_on | NULL | Not applicable for non-scheduled |
| scheduleId | schedule_rule_id | NULL | Ignored, filtered out |
| comment | merchant | Direct copy | Merchant name from comment |
| comment | comment | Direct copy | Preserved as comment too |
| place | place | Direct copy | Location preserved |
| city | city | Direct copy | City preserved |
| category | category | Direct copy | Category preserved |
| subcategory | subcategory | Direct copy | Subcategory preserved |
| details | details | Direct copy | Details preserved |
| amount | original_currency | Set 'CAD' | Assuming CAD currency |
| amount | original_amount_cents | `Math.round(amount × 100)` | Convert dollars to cents |
| - | fx_id | 13 | Latest FX snapshot |
| amount | amount_cad_cents | `Math.round(amount × 100)` | CAD amount in cents |
| amount | amount_usd_cents | `Math.round(amount × 100 × 0.72029)` | Using fx_id=13 rate |
| amount | amount_cny_cents | `Math.round(amount × 100 × 5.0293)` | Using fx_id=13 rate |
| amount | amount_base_cad_cents | `Math.round(amount × 100)` | Base CAD amount |
| isScheduled | is_scheduled | 0 | Always 0 (filtered) |

---

## FX Rate Conversion

**Reference FX Snapshot** (fx_id=13):
- **Captured**: 2026-01-10T03:02:25.157Z
- **Provider**: Frankfurter
- **Base Currency**: CAD
- **Rates**:
  - CAD → USD: 0.72029
  - CAD → CNY: 5.0293

**Conversion Formula**:
```javascript
const originalAmountCents = Math.round(oldRecord.amount * 100);
const amountUsdCents = Math.round(oldRecord.amount * 100 * 0.72029);
const amountCnyCents = Math.round(oldRecord.amount * 100 * 5.0293);
```

**Example**:
- Old amount: $52.90
- original_amount_cents: 5290
- amount_usd_cents: 3810 ($38.10 USD)
- amount_cny_cents: 26605 (¥266.05 CNY)

---

## Tag Migration

### Legacy Format (test.db)
- Tags stored in single column: `tags VARCHAR(500)`
- Format: Comma-separated string (e.g., "travel,food,urgent")

### New Format (finance.db)
- **tags table**: Stores unique tag names per user
- **fin_tags table**: Many-to-many relationship between transactions and tags

### Migration Process

1. **Parse tags**: Split comma-separated string, trim whitespace
2. **Create tags**: For each unique tag, INSERT OR IGNORE into `tags` table
3. **Link tags**: Create relationships in `fin_tags` table

**SQL Operations**:
```sql
-- Create tag if not exists
INSERT OR IGNORE INTO tags (user_id, name) VALUES (1, 'travel');

-- Get tag_id
SELECT tag_id FROM tags WHERE user_id=1 AND name='travel';

-- Link tag to transaction
INSERT INTO fin_tags (fin_id, tag_id) VALUES ('ABC-123', 42);
```

---

## Person-Category Mapping

### Detection Logic

Certain categories and tags indicate person-specific expenses:

| Identifier | Person Name | Person ID | Detection |
|------------|-------------|-----------|-----------|
| 骐骐 | Robin | 1 | category='骐骐' OR tags contains '骐骐' |
| 慢慢 | Luna | 4 | category='慢慢' OR tags contains '慢慢' |

### Fin_Items Creation

When a person identifier is detected, create a line item in `fin_items`:

```sql
INSERT INTO fin_items (
  fin_id,
  line_no,
  name,
  original_amount_cents,
  person_id,
  category,
  subcategory
) VALUES (
  'ABC-123',       -- transaction ID
  NULL,            -- line number (optional)
  'Merchant Name', -- item name from merchant/comment
  5290,            -- same as transaction amount
  1,               -- person_id for Robin
  '骐骐',          -- category
  '教育'           -- subcategory
);
```

**Fields Set**:
- `name`: Merchant name (or comment if merchant empty)
- `original_amount_cents`: Same as parent transaction
- `category`, `subcategory`: Copy from parent transaction
- `person_id`: 1 (Robin) or 4 (Luna)
- `qty`, `unit`, `unit_price_cents`: NULL (not tracking item details)

---

## Filter Rules

### Records to INCLUDE:
- ✅ `date LIKE '2025%'` (year 2025)
- ✅ `isScheduled = 0 OR isScheduled IS NULL` (non-scheduled)
- ✅ Latest 500 records (`ORDER BY date DESC LIMIT 500`)

### Records to EXCLUDE:
- ❌ `isScheduled = 1` (scheduled transactions)
- ❌ Records outside 2025

### Expected Count:
- Total 2025 records in test.db: 833
- Non-scheduled: 774
- After LIMIT 500: ~500 records

---

## Edge Cases & Handling

| Edge Case | Handling Strategy |
|-----------|-------------------|
| **Duplicate fin_ids** | Use `INSERT OR IGNORE` to skip silently |
| **Negative amounts** | Take absolute value, log warning |
| **NULL/empty fields** | Preserve as NULL in new schema |
| **Empty tags** | Skip empty strings after splitting |
| **Multiple persons** | Create multiple fin_items (one per person) |
| **Missing merchant** | Use comment field as fallback |
| **Rounding errors** | Use `Math.round()` to avoid floating-point issues |
| **Unknown categories** | Preserve as-is, no validation |

---

## Validation Queries

### Before Migration

```sql
-- Check current fin record count
SELECT COUNT(*) FROM fin WHERE user_id=1;

-- Check test.db record count
SELECT COUNT(*) FROM FIN WHERE date LIKE '2025%' AND (isScheduled=0 OR isScheduled IS NULL);

-- Check persons table
SELECT person_id, name FROM persons WHERE user_id=1;

-- Check latest FX rate
SELECT fx_id, captured_at, cad_to_usd, cad_to_cny FROM fx_snapshots ORDER BY captured_at DESC LIMIT 1;
```

### After Migration

**1. Record Count Validation**
```sql
SELECT COUNT(*) FROM fin WHERE user_id=1;
-- Expected: ~500 new records
```

**2. Amount Accuracy Spot Check**
```sql
-- Compare old vs new amounts (manual check in test.db)
SELECT
  fin_id,
  date,
  merchant,
  original_amount_cents,
  amount_cad_cents / 100.0 as amount_cad,
  amount_usd_cents / 100.0 as amount_usd,
  amount_cny_cents / 100.0 as amount_cny
FROM fin
WHERE user_id=1
ORDER BY date DESC
LIMIT 10;
```

**3. Date Range Validation**
```sql
SELECT MIN(date) as earliest, MAX(date) as latest FROM fin WHERE user_id=1;
-- Expected: Latest dates from late December 2025
```

**4. User Assignment**
```sql
SELECT DISTINCT user_id FROM fin;
-- Expected: Only 1
```

**5. Tags Migration Validation**
```sql
-- Count unique tags created
SELECT COUNT(*) FROM tags WHERE user_id=1;

-- List all tags
SELECT name FROM tags WHERE user_id=1 ORDER BY name;

-- Count tag relationships
SELECT COUNT(*) FROM fin_tags;

-- Sample tag relationships
SELECT f.date, f.merchant, t.name as tag
FROM fin_tags ft
JOIN fin f ON ft.fin_id = f.fin_id
JOIN tags t ON ft.tag_id = t.tag_id
WHERE f.user_id=1
ORDER BY f.date DESC
LIMIT 20;
```

**6. Person-Specific Items Validation**
```sql
-- Count items for Robin and Luna
SELECT COUNT(*) FROM fin_items WHERE person_id IN (1, 4);

-- Detailed view of person items
SELECT
  fi.name as item_name,
  p.name as person,
  f.date,
  fi.original_amount_cents / 100.0 as amount,
  fi.category,
  fi.subcategory
FROM fin_items fi
JOIN persons p ON fi.person_id = p.person_id
JOIN fin f ON fi.fin_id = f.fin_id
WHERE fi.person_id IN (1, 4)
ORDER BY f.date DESC
LIMIT 20;
```

**7. Sample Transaction Comparison**
```sql
-- Pick a specific transaction and compare all fields
-- (Run in both databases and compare manually)

-- In test.db:
SELECT * FROM FIN WHERE id='95B67B03-404C-4BC5-8B2F-08EFBD5CDA31';

-- In finance.db:
SELECT * FROM fin WHERE fin_id='95B67B03-404C-4BC5-8B2F-08EFBD5CDA31';
```

---

## Migration Script Usage

### Dry-Run Mode (Recommended First)

```bash
yarn migrate:fin:dry-run
```

**Output**:
- List of records to be migrated (first 10 samples)
- Amount conversions (dollars → cents)
- FX rate applications
- Tags to be created
- Person-specific items to be created
- **NO actual database changes**

### Execute Migration

```bash
yarn migrate:fin
```

**Output**:
- Total records processed
- Records inserted successfully
- Records skipped (duplicates)
- Tags created
- Fin_items created
- Errors encountered (if any)

### Re-run Safety

The script is **idempotent** - safe to re-run multiple times:
- Uses `INSERT OR IGNORE` for transactions
- Uses `INSERT OR IGNORE` for tags
- Skips existing fin_tags relationships

---

## Rollback Plan

If migration fails or produces incorrect results:

### Option 1: Delete Migrated Records
```sql
-- Identify migrated fin_ids (from test.db)
-- Then delete from finance.db
DELETE FROM fin WHERE fin_id IN ('id1', 'id2', ...);

-- Tags and fin_items will cascade delete automatically
```

### Option 2: Restore Database Backup
```bash
# Assuming you backed up before migration
cp db/finance.db.backup db/finance.db
```

### Option 3: Start Fresh
```bash
# Re-initialize database from schema
yarn db:push
yarn db:seed
# Then re-run migration
```

---

## Post-Migration Tasks

1. ✅ Validate record counts match expected
2. ✅ Spot-check 10-20 transactions for accuracy
3. ✅ Verify all tags created correctly
4. ✅ Verify person-specific items created for Robin and Luna
5. ✅ Test application functionality with migrated data
6. ✅ Review tag names (user requested manual review)
7. ✅ Create database backup after successful migration
8. 📋 Document any discrepancies or issues found

---

## Known Limitations

1. **FX Rate Accuracy**: Using single latest rate for all historical transactions (acceptable tradeoff for simplicity)
2. **Schedule References**: Ignoring scheduleId field (scheduled transactions filtered out)
3. **Item Detail**: Fin_items created with minimal detail (no qty, unit, unit_price)
4. **Tag Cleanup**: Some tags may need manual review/consolidation
5. **Category Validation**: No validation of category/subcategory values

---

## References

- **Plan Document**: `/Users/davidren/.claude/plans/validated-frolicking-token.md`
- **Schema Definition**: `app/lib/db/schema.ts`
- **Migration Script**: `scripts/migrate-fin-records.ts`
- **Database Connection**: `app/lib/db/drizzle.ts`
- **Seed Script**: `scripts/seed.ts`

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-11 | v1.0 | Initial migration documentation |

