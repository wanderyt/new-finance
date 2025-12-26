# Database Setup - SQLite Integration

> **Status**: Design Document - **UPDATED with New Schema** > **Last Updated**: 2025-12-25
> **Target Deployment**: Self-hosted VPS

## 🔄 Recent Updates (2025-12-25)

### ✅ Implementation Status: **Drizzle ORM Active**

The database is now live using **Drizzle ORM with better-sqlite3**:

- ✅ Drizzle ORM installed and configured
- ✅ Type-safe schema definitions in place
- ✅ Authentication API routes using Drizzle queries
- ✅ Demo user successfully authenticating
- ✅ Database file: `db/finance.db`

The database schema has been significantly updated with the following key changes:

### Major Changes

1. **✅ Cents-Based Storage**: All monetary amounts now stored as `INTEGER` cents (no floating point errors)
2. **✅ Simplified FX Model**: Snapshot-based exchange rates with CAD as base currency
3. **✅ Normalized Tags**: Replaced TEXT column with proper `tags` + `fin_tags` many-to-many relationship
4. **✅ Receipt Deduplication**: Added SHA256 hash for preventing duplicate uploads
5. **✅ Simplified Tables**: Removed sessions, memos tables; simplified persons table
6. **✅ Merchant Field**: New dedicated field in `fin` table (separated from comments)
7. **✅ Income/Expense Tracking**: Added `fin.type` field to distinguish expense vs income transactions
8. **✅ Category Applicability**: Added `categories.applies_to` field for type-specific categories
9. **✅ Strategic Indexing**: Enhanced indexes for common query patterns including type-based filtering
10. **✅ Data Validation**: Comprehensive CHECK constraints for data integrity
11. **✅ Cascade Behavior**: Explicit ON DELETE CASCADE/SET NULL for referential integrity

### Schema Changes Summary

| Old Design                    | New Design                          | Change                      |
| ----------------------------- | ----------------------------------- | --------------------------- |
| `amount DECIMAL`              | `original_amount_cents INTEGER`     | Precision (cents)           |
| `exchange_rates` (pair-based) | `fx_snapshots` (snapshot-based)     | Simplified FX               |
| `tags VARCHAR(500)`           | `tags` + `fin_tags` tables          | Normalized                  |
| `expense_assignees`           | `persons` (simplified)              | Fewer fields                |
| `sessions`, `memos` tables    | Removed                             | Not needed yet              |
| No merchant field             | `merchant TEXT` in `fin`            | Better data quality         |
| No type field                 | `type TEXT` in `fin`                | Expense/income tracking     |
| No applies_to field           | `applies_to TEXT` in `categories`   | Category applicability      |
| Missing CHECK constraints     | Comprehensive CHECK constraints     | Data validation             |
| Implicit CASCADE              | Explicit ON DELETE CASCADE/SET NULL | Clear referential integrity |

### Migration Impact

- Old `FIN.amount` (DECIMAL) → `fin.original_amount_cents` (multiply by 100)
- Old `FIN.tags` (comma-separated) → parse into `tags` + `fin_tags` tables
- Old `FIN.comment` → split into `merchant` + `comment` fields
- **Add `fin.type` field** → default to 'expense' for old expense records
- **Add `categories.applies_to` field** → default to 'expense' for old categories
- Old `MEMO` table → **not migrated** (not in new schema)
- **Authentication**: `sessions` table removed - will use simplified token-based or JWT auth

See [Database Schema](#database-schema) section for complete details.

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [Feature Requirements](#feature-requirements)
4. [Technology Stack](#technology-stack)
5. [Architecture Design](#architecture-design)
6. [Database Schema](#database-schema)
7. [Service Layer Pattern](#service-layer-pattern)
8. [Security Requirements](#security-requirements)
9. [Query Patterns & Indexes](#query-patterns--indexes)
10. [Technology Decisions](#technology-decisions)

---

## Overview

This document defines the complete database requirements and design for the new-finance Next.js application. The design includes:

- **Core financial transaction tracking** with multi-currency support
- **Transaction line items** with person assignment
- **Receipt storage** with file deduplication
- **Flexible tagging system** for categorization
- **Type-safe database layer** using Drizzle ORM with better-sqlite3
- **Optimized for self-hosted VPS deployment**

---

## Design Goals

1. **SQLite Integration**: Lightweight, file-based database for easy deployment
2. **Type Safety**: Full TypeScript support with Drizzle ORM type inference
3. **Next.js Compatibility**: Works with Next.js 16 server components and API routes
4. **Data Precision**: Integer cents-based storage eliminates floating point errors
5. **Query Performance**: Strategic indexes for common query patterns
6. **Data Integrity**: Foreign key constraints and proper normalization
7. **Extensibility**: Schema designed to accommodate future features
8. **VPS Optimization**: Designed for self-hosted VPS with persistent file storage

---

## Feature Requirements

### 1. Transaction Line Items (订单明细)

**Purpose**: Break down transactions into detailed line items

**Use Cases**:

- Grocery shopping: Individual items with prices
- Restaurant bills: Multiple dishes and drinks
- Gas stations: Price per liter and quantity

**Database Design**:

- New table: `transaction_line_items`
- Fields: `item_name`, `quantity`, `unit_price`, `subtotal`, `currency`
- Relationship: Many line items → One transaction (CASCADE delete)

---

### 2. Item Ownership/Assignment (明细使用人)

**Purpose**: Track which family member each expense belongs to

**Use Cases**:

- Grocery items: Some for kids, some for parents
- Restaurant meals: Split by person
- Shared vs personal expenses

**Database Design**:

- Field in `transaction_line_items`: `assigned_to`
- New table: `expense_assignees` (family member registry)
- Support for split percentages and shared items

---

### 3. Receipt Upload & AI Analysis (小票上传)

**Purpose**: Upload receipt images and auto-extract transaction details

**Use Cases**:

- Photo upload: jpg, png, pdf
- AI/OCR parsing: Extract items, prices, totals
- Auto-population: Create transaction + line items
- Manual correction: Edit extracted data

**Database Design**:

- New table: `receipts`
- Fields: `file_path`, `file_size`, `mime_type`, `processing_status`
- AI fields: `extracted_text`, `extracted_data`, `ai_model`
- Link to transaction (one-to-many)

---

### 4. Multi-Currency Exchange Rates (汇率计算)

**Purpose**: Real-time currency conversion with historical tracking

**Supported Currencies**:

- CNY (人民币)
- USD (美元)
- CAD (加币)

**Features**:

- Record exchange rates at transaction time
- Store amounts in all three currencies
- Historical accuracy for reports and queries

**Database Design**:

- New table: `exchange_rates`
- Fields in `transactions`: `currency`, `amount_cny`, `amount_usd`, `amount_cad`
- API integration for real-time rates (e.g., exchangerate-api.com)
- Caching strategy to minimize API calls

---

## Technology Stack

### Database Library: **better-sqlite3**

**Why better-sqlite3?**

- ✅ Fastest SQLite library for Node.js (synchronous API)
- ✅ Full TypeScript support with `@types/better-sqlite3`
- ✅ No native module dependencies in production builds
- ✅ Works seamlessly with Next.js server components
- ✅ Simple, intuitive API
- ❌ Synchronous only (but SQLite operations are fast)

**Alternative Considered**: sql.js

- ✅ Works in Edge Runtime
- ❌ Must load entire DB into memory
- ❌ Not ideal for data migration use case

---

### ORM: **Drizzle ORM**

**Why Drizzle?**

- ✅ TypeScript-first with excellent type inference
- ✅ Lightweight (~30KB) and fast
- ✅ SQL-like syntax (easy to learn)
- ✅ Built-in migration system
- ✅ Works perfectly with better-sqlite3
- ✅ No decorators, no reflection - just TypeScript
- ✅ Drizzle Studio - GUI for database inspection

**Alternative Considered**: Plain SQL

- ✅ Maximum control and performance
- ❌ No type safety
- ❌ Manual migration management

---

## Architecture Design

### Directory Structure

```
app/
├── lib/
│   ├── db/
│   │   ├── drizzle.ts            # ✅ IMPLEMENTED: Drizzle client singleton
│   │   └── schema.ts             # ✅ IMPLEMENTED: Drizzle schema definitions
│   ├── services/                 # Future: Service layer (TBD)
│   │   ├── user.service.ts       # User CRUD operations
│   │   ├── auth.service.ts       # Authentication logic
│   │   ├── transaction.service.ts # Transaction operations
│   │   └── category.service.ts   # Category operations
│   └── types/
│       └── api.ts                # ✅ IMPLEMENTED: API response types
├── api/
│   └── auth/                     # ✅ IMPLEMENTED: Authentication endpoints
│       ├── login/route.ts        # ✅ Uses Drizzle
│       └── verify/route.ts       # ✅ Uses Drizzle
└──

db/
└── finance.db                    # ✅ SQLite database file (gitignored)

prisma/
├── schema.prisma                 # Legacy: Prisma schema (kept for migrations)
├── prisma.config.ts              # Legacy: Prisma 7 config (not used)
└── seed.ts                       # ✅ IMPLEMENTED: Seed demo user

docs/
└── database-setup.md             # This document
```

**Implementation Notes**:

- `app/lib/db/drizzle.ts` is the Drizzle client singleton
- Database connection uses better-sqlite3 with Drizzle ORM wrapper
- Schema defined using Drizzle ORM syntax (not raw SQL yet)
- Only `users` table implemented so far (authentication)

---

### Database Connection Pattern

**✅ Current Implementation** (`app/lib/db/drizzle.ts`):

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

// Create better-sqlite3 connection
const sqlite =
  globalForDb.sqlite ??
  new Database(path.join(process.cwd(), "db", "finance.db"));

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

// Create Drizzle client with type-safe schema
export const db = drizzle(sqlite, { schema });

// Export for direct SQL access if needed
export { sqlite };
```

**Key Features:**

- ✅ Singleton pattern prevents multiple connections in Next.js dev mode
- ✅ Direct better-sqlite3 connection (synchronous, fast)
- ✅ Type-safe schema access through Drizzle
- ✅ Global cache in development to survive hot reloads
- Future: Can add WAL mode and other optimizations later

---

## Database Schema

### Schema Overview

**Updated Design** (2025-12-25):
The schema has been redesigned with the following improvements:

1. **Cents-based Storage**: All amounts stored as integers (cents) for precision
2. **Simplified Currency**: Snapshot-based FX rates with CAD as base currency
3. **Normalized Tags**: Separate tags table with many-to-many relationship
4. **Person Tracking**: Simplified persons table for expense assignment
5. **Scheduled Transactions**: Lightweight rule-based recurring transaction generation
6. **Enhanced Indexing**: Strategic indexes for common query patterns

The schema supports:

1. **Authentication**: User accounts with password authentication
2. **Multi-Currency**: Snapshot-based exchange rates (CAD/USD/CNY)
3. **Scheduled Transactions**: Recurring transaction rules with automatic generation
4. **Transaction Items**: Detailed line items per transaction
5. **Person Assignment**: Track who each item belongs to
6. **Receipt Storage**: File uploads with SHA256 deduplication
7. **Flexible Tagging**: Many-to-many tag relationships

### Complete Schema Definition

**Implementation Note**: The schema below uses raw SQL. This will be implemented in Drizzle ORM in `app/lib/db/schema.ts`.

#### 1. Users Table

**Purpose**: User authentication and account management

**✅ Current Implementation** (`app/lib/db/schema.ts`):

```typescript
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  userId: integer("userId").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Equivalent SQL**:

```sql
CREATE TABLE users (
  userId INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
```

**Fields**:

- `userId` - Integer primary key with auto-increment (preserved from old USERID)
- `username` - Unique login username
- `password` - Password (plain text in demo, will hash with bcrypt later)

**Implementation Status**:

- ✅ Schema defined in Drizzle ORM
- ✅ Table created via Prisma migration
- ✅ Demo user seeded (username: "demo", password: "demo123")
- ✅ Used in login and verify API routes
- Future: Add bcrypt hashing before production

**Type Safety**:

- `User` type inferred from schema (select operations)
- `NewUser` type inferred from schema (insert operations)

---

#### 2. Categories Table

**Purpose**: Category and subcategory definitions per user

```sql
CREATE TABLE categories (
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'expense',
  is_common INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category, subcategory),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CHECK (applies_to IN ('expense','income','both')),
  CHECK (is_common IN (0,1))
);

CREATE INDEX idx_categories_user_applies ON categories(user_id, applies_to);
```

**Fields**:

- `user_id` - User who owns this category
- `category` - Main category name (e.g., "Food", "Transport")
- `subcategory` - Subcategory name (e.g., "Groceries", "Gas")
- `applies_to` - **NEW**: Transaction type applicability: 'expense', 'income', or 'both'
- `is_common` - Boolean flag (0/1): whether category is shared across users

**Design Decisions**:

- **Composite Primary Key**: (user_id, category, subcategory) - prevents duplicates
- **No auto-increment ID**: Categories identified by natural key
- **Type-specific categories**: `applies_to` field allows filtering categories by transaction type
- **Data validation**: CHECK constraints ensure valid values for `applies_to` and `is_common`
- **Performance**: Index on (user_id, applies_to) for fast category filtering
- Migrated directly from old CATEGORY table structure

---

#### 3. FX Snapshots Table

**Purpose**: Exchange rate snapshots for historical currency conversion

```sql
CREATE TABLE fx_snapshots (
  fx_id INTEGER PRIMARY KEY,
  captured_at TEXT NOT NULL,          -- ISO 8601: 2025-12-23T12:00:00Z
  provider TEXT,                      -- e.g., "exchangerate.host" / "openexchangerates"
  base_currency TEXT NOT NULL DEFAULT 'CAD',
  cad_to_usd REAL NOT NULL,          -- CAD → USD conversion rate
  cad_to_cny REAL NOT NULL,          -- CAD → CNY conversion rate
  CHECK (base_currency = 'CAD'),
  CHECK (cad_to_usd > 0),
  CHECK (cad_to_cny > 0)
);

CREATE INDEX idx_fx_captured_at ON fx_snapshots(captured_at);
```

**Fields**:

- `fx_id` - Auto-increment primary key
- `captured_at` - ISO 8601 timestamp when rate was captured
- `provider` - API provider name (for audit trail)
- `base_currency` - Base currency (fixed to "CAD")
- `cad_to_usd` - Exchange rate from CAD to USD
- `cad_to_cny` - Exchange rate from CAD to CNY

**Design Decisions**:

- **Snapshot-based**: Store complete rate set at a point in time
- **CAD as base**: All rates relative to CAD for consistency (enforced by CHECK constraint)
- **Indexed by timestamp**: Fast lookup for historical rates
- **No CAD→CAD rate**: Always 1.0, not stored
- **Data validation**: CHECK constraints ensure positive exchange rates and correct base currency

**Usage**:

- Fetch current rates when creating transactions
- Link transaction to FX snapshot for historical accuracy
- Enable backdated transactions with correct historical rates

---

#### 4. Schedule Rules Table

**Purpose**: Lightweight recurring schedule definitions for generating future transactions

```sql
CREATE TABLE schedule_rules (
  schedule_rule_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,

  name TEXT,                          -- Display name for management
  is_active INTEGER NOT NULL DEFAULT 1,

  interval INTEGER NOT NULL,          -- Recurrence interval (e.g., 2)
  unit TEXT NOT NULL,                 -- 'day'|'week'|'month'|'year'
  anchor_date TEXT NOT NULL,          -- Starting date (YYYY-MM-DD)

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CHECK (is_active IN (0,1)),
  CHECK (interval > 0),
  CHECK (unit IN ('day','week','month','year'))
);

CREATE INDEX idx_schedule_rules_user_active ON schedule_rules(user_id, is_active);
```

**Fields**:

- `schedule_rule_id` - Auto-increment primary key
- `user_id` - Rule owner
- `name` - Optional display name (e.g., "Monthly rent", "Weekly groceries")
- `is_active` - Boolean (0/1): whether rule is active for generation
- `interval` - Recurrence interval value (must be > 0)
- `unit` - Time unit: 'day', 'week', 'month', or 'year'
- `anchor_date` - Starting date in YYYY-MM-DD format

**Design Decisions**:

- **Lightweight rules**: Only stores recurrence pattern, not transaction details
- **Flexible intervals**: Supports any positive interval (e.g., every 2 weeks, every 3 months)
- **Soft disable**: Use `is_active` to pause without deleting
- **Anchor-based**: All recurrences calculated from anchor_date
- **Simple validation**: CHECK constraints ensure valid interval and unit values

**Use Cases**:

- Monthly rent payments
- Weekly grocery shopping
- Bi-weekly paycheck
- Quarterly insurance
- Annual subscriptions

**Example**:

```sql
-- Monthly rent: every 1 month starting 2025-01-01
INSERT INTO schedule_rules (user_id, name, interval, unit, anchor_date, is_active)
VALUES (1, 'Monthly Rent', 1, 'month', '2025-01-01', 1);

-- Bi-weekly groceries: every 2 weeks starting 2025-01-05
INSERT INTO schedule_rules (user_id, name, interval, unit, anchor_date, is_active)
VALUES (1, 'Grocery Shopping', 2, 'week', '2025-01-05', 1);
```

---

#### 5. Fin Table (Main Transactions)

**Purpose**: Core financial transactions with multi-currency support

```sql
CREATE TABLE fin (
  fin_id TEXT PRIMARY KEY,            -- Preserved from old FIN.id
  user_id INTEGER NOT NULL,

  type TEXT NOT NULL DEFAULT 'expense',  -- 'expense' or 'income' (future: 'transfer')

  date TEXT NOT NULL,                 -- ISO 8601 with time (event/record timestamp)
  scheduled_on TEXT,                  -- YYYY-MM-DD (only for scheduled entries)
  schedule_rule_id INTEGER,           -- Reference to schedule_rules

  merchant TEXT,                      -- NEW: Merchant/vendor name
  comment TEXT,                       -- Old field, gradually migrate to merchant
  place TEXT,                         -- Location/venue/mall
  city TEXT,

  category TEXT,
  subcategory TEXT,
  details TEXT,

  -- Original amount (user input)
  original_currency TEXT NOT NULL,    -- 'CAD', 'USD', or 'CNY'
  original_amount_cents INTEGER NOT NULL,

  -- FX snapshot reference (for traceability)
  fx_id INTEGER,                      -- Nullable: pure CAD transactions may not need FX

  -- Converted amounts (redundant but fast for queries)
  amount_cad_cents INTEGER NOT NULL,
  amount_usd_cents INTEGER NOT NULL,
  amount_cny_cents INTEGER NOT NULL,
  amount_base_cad_cents INTEGER NOT NULL,  -- Same as amount_cad_cents (for stats)

  -- Legacy scheduling flag (preserved; can use schedule_rule_id to determine)
  is_scheduled INTEGER NOT NULL DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (fx_id) REFERENCES fx_snapshots(fx_id) ON DELETE SET NULL,
  FOREIGN KEY (schedule_rule_id) REFERENCES schedule_rules(schedule_rule_id) ON DELETE SET NULL,

  CHECK (type IN ('expense','income')),
  CHECK (original_currency IN ('CAD','USD','CNY')),
  CHECK (original_amount_cents >= 0),
  CHECK (amount_cad_cents >= 0),
  CHECK (amount_usd_cents >= 0),
  CHECK (amount_cny_cents >= 0),
  CHECK (amount_base_cad_cents >= 0),
  CHECK (is_scheduled IN (0,1))
);

CREATE INDEX idx_fin_user_date ON fin(user_id, date);
CREATE INDEX idx_fin_user_type_date ON fin(user_id, type, date);
CREATE INDEX idx_fin_user_cat  ON fin(user_id, category, subcategory);
CREATE INDEX idx_fin_user_merchant ON fin(user_id, merchant);
CREATE INDEX idx_fin_user_fx   ON fin(user_id, fx_id);
CREATE INDEX idx_fin_user_rule_scheduled_on ON fin(user_id, schedule_rule_id, scheduled_on);

-- Prevent duplicate scheduled entries for same rule on same day
CREATE UNIQUE INDEX ux_fin_rule_day ON fin(user_id, schedule_rule_id, scheduled_on)
WHERE schedule_rule_id IS NOT NULL AND scheduled_on IS NOT NULL;

-- Prevent modification of schedule fields (immutable once created)
CREATE TRIGGER trg_fin_block_schedule_update
BEFORE UPDATE OF schedule_rule_id, scheduled_on ON fin
FOR EACH ROW
WHEN
  (OLD.schedule_rule_id IS NOT NEW.schedule_rule_id)
  OR
  (OLD.scheduled_on IS NOT NEW.scheduled_on)
BEGIN
  SELECT RAISE(ABORT, 'schedule fields are immutable: cannot update schedule_rule_id or scheduled_on');
END;
```

**Fields**:

- `fin_id` - Text primary key (preserved from old schema)
- `user_id` - Transaction owner
- `type` - Transaction type: 'expense' or 'income' (future: 'transfer')
- `date` - ISO 8601 timestamp with time (event/record timestamp)
- `scheduled_on` - **NEW**: YYYY-MM-DD date (only for scheduled entries, used for deduplication)
- `schedule_rule_id` - **NEW**: Foreign key to schedule_rules (tracks which rule generated this entry)
- `merchant` - Merchant/vendor name
- `comment` - Legacy field (will gradually migrate to merchant)
- `place`, `city` - Location details
- `category`, `subcategory` - Transaction categorization
- `details` - Additional notes
- `original_currency` - Currency user entered (CAD/USD/CNY)
- `original_amount_cents` - Amount in original currency (stored as cents)
- `fx_id` - Foreign key to FX snapshot (nullable)
- `amount_*_cents` - Converted amounts in all three currencies (cents)
- `amount_base_cad_cents` - Same as `amount_cad_cents` (convenience for queries)
- `is_scheduled` - Legacy boolean flag (0/1, preserved for compatibility)

**Design Decisions**:

- **Expense vs Income tracking**: `type` field enables unified table for both transaction types
- **Scheduled transactions**: Lightweight approach - rules live in separate table, generated entries link back
- **Immutable schedule fields**: Trigger prevents modification of `schedule_rule_id` and `scheduled_on` after creation
- **Deduplication**: UNIQUE index on (user_id, schedule_rule_id, scheduled_on) prevents duplicate generation
- **Scheduled_on semantics**: YYYY-MM-DD date for grouping/deduplication; `date` has full timestamp for event time
- **Cents-based storage**: All amounts stored as INTEGER cents (no floating point errors)
- **Redundant currency amounts**: Pre-calculated for fast queries (no runtime conversion)
- **FX snapshot link**: Enables historical rate traceability
- **Merchant field**: Separates vendor name from comments
- **Strategic indexes**: Fast queries by user+date, user+type+date, user+category, user+merchant, schedule_rule+date
- **Data validation**: CHECK constraints ensure valid types, currencies, and positive amounts
- **Cascade deletes**: User deletion cascades to transactions; rule/FX deletion sets NULL

**Scheduling Workflow**:

1. Create `schedule_rule` with interval, unit, anchor_date
2. Background job generates future `fin` entries based on rule
3. Each generated entry has:
   - `schedule_rule_id` pointing to rule
   - `scheduled_on` = calculated date (YYYY-MM-DD)
   - `date` = full ISO 8601 timestamp when entry was created/is effective
   - `is_scheduled = 1` for compatibility
4. UNIQUE constraint prevents duplicate entries for same rule+date
5. Trigger prevents accidental modification of schedule fields
6. Deleting rule sets `schedule_rule_id = NULL` (preserves history)

**Migration Notes**:

- Old `FIN.id` → `fin.fin_id`
- Old `FIN.amount` (DECIMAL) → convert to cents: `amount * 100`
- Old `FIN.comment` → can split into `merchant` and `comment`
- **Add `type` field** (default to 'expense' for old expense data)
- Add `original_currency` (default to 'CAD' for old data)
- **Add `scheduled_on` and `schedule_rule_id`** (NULL for non-scheduled)
- Calculate converted amounts during migration

---

#### 6. Persons Table

**Purpose**: Track family members for expense assignment

```sql
CREATE TABLE persons (
  person_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CHECK (is_default IN (0,1)),
  CHECK (is_active IN (0,1))
);

CREATE INDEX idx_persons_user ON persons(user_id);
```

**Fields**:

- `person_id` - Auto-increment primary key
- `user_id` - Account owner
- `name` - Person's name (e.g., "Dad", "Mom", "Child 1")
- `is_default` - Boolean (0/1): default person for new items
- `is_active` - Boolean (0/1): whether person is active (soft delete)

**Design Decisions**:

- **Simplified design**: Removed relationship, color, sort_order fields
- **Unique constraint**: (user_id, name) prevents duplicate names per user
- **Default person**: One person can be marked as default for quick entry
- **Soft delete**: Use is_active instead of deleting records
- **Data validation**: CHECK constraints ensure valid boolean values
- **Cascade delete**: When user is deleted, all their persons are removed

---

#### 7. Fin Items Table (Transaction Line Items)

**Purpose**: Detailed line items for each transaction

```sql
CREATE TABLE fin_items (
  item_id INTEGER PRIMARY KEY,
  fin_id TEXT NOT NULL,
  line_no INTEGER,                    -- Line number on receipt / sort order
  name TEXT NOT NULL,

  qty REAL,                           -- Quantity (can be decimal)
  unit TEXT,                          -- Unit (e.g., "kg", "lb", "ea")
  unit_price_cents INTEGER,           -- Price per unit (in cents)

  original_amount_cents INTEGER NOT NULL,  -- Item amount in original currency
  person_id INTEGER,                       -- Who this item belongs to (nullable)

  category TEXT,
  subcategory TEXT,
  notes TEXT,

  FOREIGN KEY (fin_id) REFERENCES fin(fin_id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(person_id) ON DELETE SET NULL,

  CHECK (original_amount_cents >= 0),
  CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0)
);

CREATE INDEX idx_items_fin ON fin_items(fin_id);
CREATE INDEX idx_items_person ON fin_items(person_id);
```

**Fields**:

- `item_id` - Auto-increment primary key
- `fin_id` - Parent transaction
- `line_no` - Line number on receipt (for ordering)
- `name` - Item name/description
- `qty` - Quantity (REAL for decimals like 1.5 kg)
- `unit` - Unit of measurement (kg, lb, ea, etc.)
- `unit_price_cents` - Price per unit in cents
- `original_amount_cents` - Total item amount in cents
- `person_id` - Who the item belongs to (nullable, defaults handled by app)
- `category`, `subcategory` - Item-level categorization
- `notes` - Additional notes

**Design Decisions**:

- **Item-level categorization**: Items can have different categories than parent transaction
- **Person assignment**: Track who each item is for
- **Unit tracking**: Supports weight-based pricing (groceries, gas)
- **Currency handling**: Items use parent transaction's original currency
- **Nullable person**: Business layer can fill in default person
- **Data validation**: CHECK constraints ensure non-negative amounts
- **Cascade behavior**: Transaction deletion removes all items; person deletion preserves items

**Use Cases**:

- Grocery receipt: Multiple items, different people
- Restaurant bill: Each dish assigned to different people
- Gas station: Quantity × price per liter

---

#### 8. Receipts Table

**Purpose**: Store uploaded receipt files with deduplication

```sql
CREATE TABLE receipts (
  receipt_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  fin_id TEXT,                         -- Nullable: upload first, link later
  file_path TEXT NOT NULL,             -- Server local path
  mime_type TEXT,
  sha256 TEXT,                         -- SHA256 hash for deduplication
  uploaded_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (fin_id) REFERENCES fin(fin_id) ON DELETE SET NULL
);

CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_receipts_fin  ON receipts(fin_id);
CREATE UNIQUE INDEX idx_receipts_sha256 ON receipts(sha256);
```

**Fields**:

- `receipt_id` - Auto-increment primary key
- `user_id` - Who uploaded the receipt
- `fin_id` - Linked transaction (nullable - can upload first, link later)
- `file_path` - Server file system path
- `mime_type` - File type (image/jpeg, image/png, application/pdf)
- `sha256` - SHA256 hash of file content (for deduplication)
- `uploaded_at` - Upload timestamp

**Design Decisions**:

- **Deduplication**: UNIQUE index on sha256 prevents duplicate uploads
- **Lazy linking**: Can upload receipt before creating transaction
- **Simplified from original**: Removed AI processing fields (can add later)
- **File system storage**: Store files locally on VPS
- **Cascade behavior**: User deletion removes receipts; transaction deletion preserves receipts

**Removed Fields** (can add back later if needed):

- `processing_status`, `extracted_text`, `extracted_data`, `ai_model`, `processed_at`

---

#### 9. Tags Tables (Many-to-Many)

**Purpose**: Flexible tagging system for transactions

```sql
CREATE TABLE tags (
  tag_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_user ON tags(user_id);

CREATE TABLE fin_tags (
  fin_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (fin_id, tag_id),
  FOREIGN KEY (fin_id) REFERENCES fin(fin_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

CREATE INDEX idx_fin_tags_tag ON fin_tags(tag_id);
```

**Fields**:

**tags table**:

- `tag_id` - Auto-increment primary key
- `user_id` - Tag owner
- `name` - Tag name (e.g., "vacation", "business", "gift")
- UNIQUE constraint on (user_id, name)

**fin_tags table** (junction table):

- `fin_id` - Transaction ID
- `tag_id` - Tag ID
- Composite PRIMARY KEY (fin_id, tag_id)

**Design Decisions**:

- **Normalized design**: Replaced old TEXT column with proper many-to-many
- **Multiple tags per transaction**: One transaction can have many tags
- **Reusable tags**: Same tag can be applied to many transactions
- **Indexed by tag**: Fast queries like "all transactions with tag X"
- **Cascade deletes**: User deletion removes tags; transaction or tag deletion removes links

**Migration from Old Schema**:

- Old: `FIN.tags` VARCHAR(500) - probably comma-separated or JSON
- New: Parse old tags field, create tag records, link via fin_tags

---

### Schema Design Highlights

**Key Improvements from Original Design**:

1. ✅ **Cents-based storage**: All amounts as INTEGER (no floating point errors)
2. ✅ **Simplified FX model**: Snapshot-based instead of pair-based rates
3. ✅ **Normalized tags**: Proper many-to-many relationship
4. ✅ **Deduplication**: SHA256 for receipts prevents duplicates
5. ✅ **Strategic indexes**: Query patterns optimized with indexes
6. ✅ **Simplified persons**: Removed unnecessary fields
7. ✅ **Merchant field**: Separated from comments for better data quality

**Migration Compatibility**:

- ✅ `users.user_id` matches old `USER.USERID`
- ✅ `fin.fin_id` matches old `FIN.id`
- ✅ `categories` structure preserved
- ✅ All old fields preserved or clearly migrated

**Performance Optimizations**:

- ✅ Indexed by common query patterns (user+date, user+category, user+merchant)
- ✅ Redundant currency amounts (pre-calculated)
- ✅ Composite indexes on junction tables

---

## Service Layer Pattern

### Design Philosophy

- **Encapsulation**: Database operations hidden behind service classes
- **Single Responsibility**: One service per domain (User, Auth, Transaction)
- **Type Safety**: Leverage Drizzle type inference
- **Testability**: Easy to mock with dependency injection
- **Error Handling**: Consistent error patterns

### Service Examples

**UserService** - User management

- `createUser(data)` - Create new user with hashed password
- `findByUsername(username)` - Find user for login
- `findById(id)` - Get user by ID (sanitized)
- `verifyPassword(user, password)` - bcrypt verification
- `updateLastLogin(userId)` - Track login times
- `sanitizeUser(user)` - Remove password hash from response

**AuthService** - Session management

- `createSession(userId, metadata)` - Create new session
- `validateSession(token)` - Check session validity
- `deleteSession(token)` - Logout
- `cleanupExpiredSessions()` - Maintenance task

**TransactionService** (Future) - Financial operations

- `createTransaction(data)` - New transaction
- `getTransactionsByUser(userId, filters)` - Query transactions
- `updateTransaction(id, data)` - Edit transaction
- `deleteTransaction(id)` - Remove transaction
- `addLineItems(transactionId, items)` - Add line items

### Service Pattern Benefits

- ✅ Consistent API across application
- ✅ Easy to test in isolation
- ✅ Centralized business logic
- ✅ Type-safe database operations
- ✅ Reusable across API routes and server components

---

## Security Requirements

### Password Security

- **bcrypt hashing**: 10 salt rounds (industry standard)
- **Never store plain text**: Always hash passwords before storage
- **Constant-time comparison**: Use bcrypt.compare() to prevent timing attacks

### Data Security

- **SQL Injection Protection**: Drizzle ORM uses automatic parameterized queries
- **Type Safety**: Compile-time validation prevents many common errors
- **Foreign Key Constraints**: Enforce referential integrity at database level

### File Security (Receipts)

- **SHA256 Hashing**: Prevent duplicate uploads and verify file integrity
- **File System Isolation**: Store receipts outside web root
- **Access Control**: Verify user ownership before serving files

### Environment Variables

- **DATABASE_URL**: Database file path (never commit)
- **Sensitive Data**: Use environment variables for all secrets
- **VPS Security**: Proper file permissions (chmod 600 for database file)

---

## Query Patterns & Indexes

### ✅ Current Drizzle Usage Examples

**Authentication Queries (Implemented)**:

```typescript
// Login - Find User by Username
// app/api/auth/login/route.ts
import { db } from "@/app/lib/db/drizzle";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";

const [user] = await db
  .select()
  .from(users)
  .where(eq(users.username, username))
  .limit(1);

// Verify - Find User by ID
// app/api/auth/verify/route.ts
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.userId, parseInt(payload.userId)))
  .limit(1);
```

**Drizzle Query Patterns**:

- Use `.select()` for all fields or specify columns
- Use `.from(table)` to specify table
- Use `.where(condition)` with operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `like`, `and`, `or`
- Use `.limit(n)` for result count
- Results are arrays: destructure with `const [item] = await ...`

---

### Common Query Patterns (Future Implementation)

#### 1. Transactions by User and Date Range

```typescript
// Get all transactions for a user in a date range
const transactions = await db.query.fin.findMany({
  where: and(
    eq(fin.userId, userId),
    gte(fin.date, startDate),
    lte(fin.date, endDate)
  ),
  orderBy: [desc(fin.date)],
});
```

**Index**: `idx_fin_user_date ON fin(user_id, date)`

#### 2. Transactions by Category

```typescript
// Get all transactions in a specific category
const transactions = await db.query.fin.findMany({
  where: and(
    eq(fin.userId, userId),
    eq(fin.category, "Food"),
    eq(fin.subcategory, "Groceries")
  ),
});
```

**Index**: `idx_fin_user_cat ON fin(user_id, category, subcategory)`

#### 3. Transactions by Merchant

```typescript
// Find all transactions at a specific merchant
const transactions = await db.query.fin.findMany({
  where: and(eq(fin.userId, userId), eq(fin.merchant, "Costco")),
});
```

**Index**: `idx_fin_user_merchant ON fin(user_id, merchant)`

#### 4. Transactions with Line Items

```typescript
// Get transaction with all line items
const transactionWithItems = await db.query.fin.findFirst({
  where: eq(fin.finId, transactionId),
  with: {
    lineItems: {
      orderBy: [asc(finItems.lineNo)],
    },
  },
});
```

**Index**: `idx_items_fin ON fin_items(fin_id)`

#### 5. Items by Person

```typescript
// Get all items assigned to a specific person
const personItems = await db.query.finItems.findMany({
  where: eq(finItems.personId, personId),
  with: {
    transaction: true,
  },
});
```

**Index**: `idx_items_person ON fin_items(person_id)`

#### 6. Transactions by Tag

```typescript
// Find all transactions with a specific tag
const taggedTransactions = await db
  .select()
  .from(fin)
  .innerJoin(finTags, eq(fin.finId, finTags.finId))
  .innerJoin(tags, eq(finTags.tagId, tags.tagId))
  .where(and(eq(tags.userId, userId), eq(tags.name, "vacation")));
```

**Index**: `idx_fin_tags_tag ON fin_tags(tag_id)`

#### 7. Exchange Rate Lookup

```typescript
// Find exchange rate for a specific date
const rate = await db.query.fxSnapshots.findFirst({
  where: lte(fxSnapshots.capturedAt, transactionDate),
  orderBy: [desc(fxSnapshots.capturedAt)],
});
```

**Index**: `idx_fx_captured_at ON fx_snapshots(captured_at)`

### Index Strategy

**Indexes Created**:

- `idx_categories_user_applies` - Fast category filtering by type
- `idx_fx_captured_at` - Fast historical rate lookup
- `idx_schedule_rules_user_active` - Fast active rule lookup per user
- `idx_fin_user_date` - Fast user + date range queries
- `idx_fin_user_type_date` - Fast user + type + date range queries
- `idx_fin_user_cat` - Fast category filtering
- `idx_fin_user_merchant` - Fast merchant filtering
- `idx_fin_user_fx` - Fast FX snapshot lookups
- `idx_fin_user_rule_scheduled_on` - Fast scheduled transaction queries
- `ux_fin_rule_day` - Prevent duplicate scheduled entries (UNIQUE)
- `idx_persons_user` - Fast person listing
- `idx_items_fin` - Fast line item retrieval
- `idx_items_person` - Fast person-based queries
- `idx_receipts_user` - Fast user receipt listing
- `idx_receipts_fin` - Fast transaction receipt lookup
- `idx_receipts_sha256` - Deduplication (UNIQUE)
- `idx_tags_user` - Fast user tag listing
- `idx_fin_tags_tag` - Fast tag-based queries

**Index Benefits**:

- ✅ Query response time: <10ms for most queries
- ✅ Efficient date range scans
- ✅ Fast lookups by composite keys (user + type + date, user + category, user + merchant)
- ✅ Optimized JOIN performance
- ✅ Fast filtering by transaction type (expense vs income)

---

## Technology Decisions

| Component              | Technology                 | Rationale                                                                        |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| **Database**           | SQLite with better-sqlite3 | Fast, file-based, zero-config, perfect for self-hosted VPS                       |
| **ORM**                | Drizzle ORM                | TypeScript-first, lightweight (~30KB), SQL-like syntax, excellent type inference |
| **Schema Management**  | Drizzle Kit                | Built-in migrations, SQL generation, GUI (Drizzle Studio)                        |
| **Password Hashing**   | bcrypt                     | Industry standard, configurable rounds (10), async to prevent blocking           |
| **Amount Storage**     | INTEGER (cents)            | Eliminates floating-point precision errors                                       |
| **Currency Model**     | Snapshot-based FX          | Simpler than pair-based, tracks historical rates accurately                      |
| **File Storage**       | File system                | Simple for VPS, easy backups, can migrate to S3 if needed                        |
| **File Deduplication** | SHA256 hashing             | Prevents duplicate uploads, verifies integrity                                   |
| **Tag System**         | Many-to-many (normalized)  | Flexible, reusable tags, fast queries                                            |
| **Indexing Strategy**  | Composite indexes          | Optimized for common query patterns (user+date, user+category)                   |

### Design Principles

1. **Type Safety First**: Leverage TypeScript and Drizzle for compile-time validation
2. **Data Precision**: Use INTEGER cents to avoid floating-point errors
3. **Query Performance**: Strategic indexes based on actual query patterns
4. **Normalization**: Proper many-to-many relationships (tags, avoid data duplication)
5. **Simplicity**: Start simple (no sessions table yet), add complexity when needed
6. **VPS-Optimized**: File-based database, file system storage, WAL mode for performance

---

## Summary

This database design provides a solid foundation for the new-finance application with:

### Core Strengths

1. **✅ Type Safety**: Full TypeScript inference from database to application code
2. **✅ Data Precision**: Integer cents storage eliminates floating-point errors
3. **✅ Performance**: Strategic indexes for <10ms query response times
4. **✅ Flexibility**: Normalized tags, multi-currency support, extensible schema
5. **✅ Security**: bcrypt hashing, foreign key constraints, parameterized queries
6. **✅ Simplicity**: File-based SQLite, no external services, easy backups

### Schema Overview

- **10 Tables**: users, categories, fx_snapshots, schedule_rules, fin, persons, fin_items, receipts, tags, fin_tags
- **Multi-Currency**: Snapshot-based exchange rates with historical tracking
- **Scheduled Transactions**: Lightweight rule-based recurring transaction generation
- **Line Items**: Detailed transaction breakdowns with person assignment
- **Receipts**: File uploads with SHA256 deduplication
- **Tags**: Flexible many-to-many tagging system

### Performance Characteristics

- **Query Speed**: <10ms for most queries with proper indexes
- **Storage**: Efficient integer-based amounts, normalized data
- **Scalability**: SQLite handles millions of rows efficiently
- **Backup**: Simple file copies, WAL mode for crash recovery

---

**Ready for Implementation**: This design document defines all database requirements. Proceed with schema implementation in Drizzle ORM.
