# Pocket Money Tracking Feature

## Overview

The pocket money tracking feature provides an automated system to manage Robin's pocket money with weekly allowances, manual bonuses, and deductions. The system maintains a complete transaction history and supports automatic backfilling of missed weeks when the service is offline.

## Features

- **Automatic Weekly Allowance**: $5 added every Sunday at 9:00 AM
- **Transaction History**: Complete ledger of all pocket money changes
- **Manual Adjustments**: Support for bonuses (exam rewards) and deductions (punishments)
- **Missed Week Backfill**: Automatically adds missed allowances if service is down
- **Balance Calculation**: Real-time balance computed from transaction history
- **Audit Trail**: Track who made changes and when

## Database Schema

### Table: `pocket_money`

Transaction ledger for all pocket money changes.

| Column | Type | Description |
|--------|------|-------------|
| `pocket_money_id` | INTEGER | Primary key, auto-increment |
| `person_id` | INTEGER | Foreign key to `persons.person_id` |
| `transaction_date` | TEXT | ISO 8601 datetime (UTC) |
| `amount_cents` | INTEGER | Amount in cents (positive for additions, negative for deductions) |
| `transaction_type` | TEXT | One of: 'initial', 'weekly_allowance', 'bonus', 'deduction' |
| `reason` | TEXT | Description of transaction |
| `created_at` | TEXT | Timestamp when record was created |
| `created_by` | TEXT | Who created the record ('system' or user identifier) |

**Indexes:**
- `idx_pocket_money_person` on `person_id`
- `idx_pocket_money_date` on `transaction_date`
- `idx_pocket_money_type` on `transaction_type`

**Constraints:**
- Foreign key: `person_id` references `persons.person_id` (CASCADE on delete)
- Check constraint: `transaction_type` must be in ('initial', 'weekly_allowance', 'bonus', 'deduction')

### Table: `pocket_money_job_state`

Tracks scheduled job execution state for idempotency and missed-week detection.

| Column | Type | Description |
|--------|------|-------------|
| `job_id` | INTEGER | Primary key, auto-increment |
| `job_name` | TEXT | Job identifier (UNIQUE), e.g., 'weekly_allowance' |
| `last_run_date` | TEXT | ISO date (YYYY-MM-DD) of last execution attempt |
| `last_success_date` | TEXT | ISO date of last successful execution |
| `run_count` | INTEGER | Total number of successful executions |
| `updated_at` | TEXT | Timestamp of last update |

**Constraints:**
- Unique constraint on `job_name`

## Initial Configuration

### Robin's Setup
- **Person ID**: 1 (already exists in `persons` table)
- **Initial Balance**: $150.00 (15,000 cents) as of January 1st, 2026
- **Weekly Amount**: $5.00 (500 cents)
- **Schedule**: Every Sunday at 9:00 AM, starting January 4th, 2026

### Expected Balance Timeline

| Date | Transaction | Amount | Balance |
|------|-------------|--------|---------|
| Jan 1, 2026 | Initial balance | +$150.00 | $150.00 |
| Jan 4, 2026 | Weekly allowance | +$5.00 | $155.00 |
| Jan 11, 2026 | Weekly allowance | +$5.00 | $160.00 |
| Jan 18, 2026 | Weekly allowance | +$5.00 | $165.00 |
| Jan 25, 2026 | Weekly allowance | +$5.00 | $170.00 |
| Feb 1, 2026 | Weekly allowance | +$5.00 | $175.00 |

## Service Methods

### PocketMoneyService

Located in `/src/services/pocket-money.service.ts`

#### Methods

**`addWeeklyAllowance(personId: number, date: string): Promise<void>`**
- Adds a $5 weekly allowance
- Used by automated scheduler

**`addBonus(personId: number, amountCents: number, reason: string): Promise<void>`**
- Adds a bonus amount (e.g., exam reward)
- Amount must be positive
- Example: `addBonus(1, 1000, 'Excellent math exam result')`

**`addDeduction(personId: number, amountCents: number, reason: string): Promise<void>`**
- Deducts an amount (e.g., punishment)
- Amount should be positive (will be stored as negative)
- Example: `addDeduction(1, 500, 'Late for dinner')`

**`getCurrentBalance(personId: number): Promise<number>`**
- Calculates current balance from all transactions
- Returns balance in cents

**`getTransactionHistory(personId: number, limit?: number): Promise<PocketMoney[]>`**
- Retrieves transaction history
- Ordered by date descending (newest first)
- Optional limit parameter

**`processWeeklyAllowance(personId: number): Promise<void>`**
- Main job method with backfill logic
- Detects missed weeks and backfills allowances
- Updates job state after successful execution

## Environment Configuration

Add to `.env`:

```bash
# Pocket Money Configuration
POCKET_MONEY_SCHEDULE="0 9 * * 0"  # Every Sunday 9:00 AM
POCKET_MONEY_WEEKLY_AMOUNT=500     # $5.00 in cents
POCKET_MONEY_ENABLED=true
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `POCKET_MONEY_SCHEDULE` | "0 9 * * 0" | Cron schedule for weekly allowance |
| `POCKET_MONEY_WEEKLY_AMOUNT` | 500 | Weekly amount in cents ($5.00) |
| `POCKET_MONEY_ENABLED` | true | Enable/disable pocket money job |

## Usage Examples

### Via Drizzle Studio

1. Start Drizzle Studio:
```bash
yarn db:studio
```

2. Navigate to `http://localhost:4983`

3. Select the `pocket_money` table

4. Add a manual bonus:
   - Click "Add Row"
   - Set `person_id` = 1
   - Set `transaction_date` = current datetime (ISO 8601)
   - Set `amount_cents` = 1000 (for $10)
   - Set `transaction_type` = 'bonus'
   - Set `reason` = 'Excellent report card'
   - Click "Save"

5. Add a deduction:
   - Follow same steps
   - Set `amount_cents` = -500 (for -$5)
   - Set `transaction_type` = 'deduction'
   - Set `reason` = 'Forgot to clean room'

### Via Direct SQL

```bash
# Check current balance
sqlite3 db/finance.db "SELECT SUM(amount_cents) / 100.0 as balance_dollars FROM pocket_money WHERE person_id=1;"

# View recent transactions
sqlite3 db/finance.db "SELECT transaction_date, amount_cents/100.0 as amount, transaction_type, reason FROM pocket_money WHERE person_id=1 ORDER BY transaction_date DESC LIMIT 10;"

# Add a manual bonus
sqlite3 db/finance.db "INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by) VALUES (1, datetime('now'), 1500, 'bonus', 'Won science fair', datetime('now'), 'parent');"

# Add a deduction
sqlite3 db/finance.db "INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by) VALUES (1, datetime('now'), -300, 'deduction', 'Broke a glass', datetime('now'), 'parent');"
```

## Testing Guide

### Test 1: Database Schema Verification

```bash
# Check tables exist
sqlite3 db/finance.db ".schema pocket_money"
sqlite3 db/finance.db ".schema pocket_money_job_state"
```

**Expected**: Table definitions should match the schema above.

```bash
# Verify Robin's person_id
sqlite3 db/finance.db "SELECT person_id, name FROM persons WHERE name='Robin';"
```

**Expected**: `1|Robin`

### Test 2: Initial Data Verification

```bash
# Check initial balance transaction
sqlite3 db/finance.db "SELECT * FROM pocket_money WHERE transaction_type='initial' AND person_id=1;"
```

**Expected**: One record with 15000 cents dated Jan 1, 2026

```bash
# Check job state initialization
sqlite3 db/finance.db "SELECT * FROM pocket_money_job_state WHERE job_name='weekly_allowance';"
```

**Expected**: One record with last_success_date = '2025-12-28'

### Test 3: Service Startup and Backfill

```bash
# Build and start service
yarn build
yarn start
```

**Expected Log Output**:
```
[TIMESTAMP] [info]: Scheduling pocket money job: 0 9 * * 0
[TIMESTAMP] [info]: Running initial pocket money check...
[TIMESTAMP] [info]: Executing scheduled pocket money job...
[TIMESTAMP] [info]: Pocket money job scheduled successfully
```

After startup, verify backfilled allowances:

```bash
# Count weekly allowances
sqlite3 db/finance.db "SELECT COUNT(*) FROM pocket_money WHERE transaction_type='weekly_allowance' AND person_id=1;"
```

**Expected**: 5 records (Jan 4, 11, 18, 25, Feb 1)

```bash
# Check current balance
sqlite3 db/finance.db "SELECT SUM(amount_cents) as balance_cents FROM pocket_money WHERE person_id=1;"
```

**Expected**: 17500 cents ($175.00) = $150 initial + 5×$5 weekly

### Test 4: Manual Bonus Addition

```bash
# Add a $10 bonus
sqlite3 db/finance.db "INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by) VALUES (1, datetime('now'), 1000, 'bonus', 'Test bonus', datetime('now'), 'test');"

# Verify balance increased
sqlite3 db/finance.db "SELECT SUM(amount_cents) FROM pocket_money WHERE person_id=1;"
```

**Expected**: 18500 cents ($185.00) = previous $175 + $10 bonus

### Test 5: Manual Deduction

```bash
# Add a $3 deduction
sqlite3 db/finance.db "INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by) VALUES (1, datetime('now'), -300, 'deduction', 'Test deduction', datetime('now'), 'test');"

# Verify balance decreased
sqlite3 db/finance.db "SELECT SUM(amount_cents) FROM pocket_money WHERE person_id=1;"
```

**Expected**: 18200 cents ($182.00) = previous $185 - $3 deduction

### Test 6: Transaction History

```bash
# View last 10 transactions
sqlite3 db/finance.db -header -column "SELECT
  pocket_money_id as ID,
  date(transaction_date) as Date,
  amount_cents/100.0 as Amount,
  transaction_type as Type,
  reason as Reason
FROM pocket_money
WHERE person_id=1
ORDER BY transaction_date DESC
LIMIT 10;"
```

**Expected**: Table showing recent transactions in reverse chronological order

### Test 7: Missed Week Backfill Simulation

```bash
# Stop the service (Ctrl+C or kill)

# Simulate 3 weeks of downtime (set last_success_date to 3 weeks ago)
sqlite3 db/finance.db "UPDATE pocket_money_job_state SET last_success_date='2026-01-12' WHERE job_name='weekly_allowance';"

# Restart service
yarn start

# Wait 5 seconds for initial check to run

# Verify 3 allowances were backfilled
sqlite3 db/finance.db "SELECT COUNT(*) FROM pocket_money WHERE transaction_type='weekly_allowance' AND transaction_date >= '2026-01-12' AND person_id=1;"
```

**Expected**: 3 additional records (for Jan 19, Jan 26, Feb 2)

**Expected Log Output**:
```
[TIMESTAMP] [info]: Running initial pocket money check...
[TIMESTAMP] [info]: Backfilled allowance for week 1/3: 2026-01-19
[TIMESTAMP] [info]: Backfilled allowance for week 2/3: 2026-01-26
[TIMESTAMP] [info]: Backfilled allowance for week 3/3: 2026-02-02
```

### Test 8: Scheduled Job Execution

To test without waiting for Sunday 9:00 AM:

```bash
# Temporarily change schedule to run every minute
# Edit .env
POCKET_MONEY_SCHEDULE="* * * * *"

# Restart service
yarn start

# Watch logs
tail -f combined.log
```

**Expected**: Every minute, you should see:
```
[TIMESTAMP] [info]: Executing scheduled pocket money job...
```

Note: The job will check if a week has passed since last run, so no duplicate allowances will be added.

**Don't forget to restore the original schedule:**
```bash
POCKET_MONEY_SCHEDULE="0 9 * * 0"
```

### Test 9: Balance Calculation Accuracy

```bash
# Add various transactions
sqlite3 db/finance.db <<EOF
INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by)
VALUES
  (1, datetime('now', '-7 days'), 1000, 'bonus', 'Test 1', datetime('now'), 'test'),
  (1, datetime('now', '-6 days'), -500, 'deduction', 'Test 2', datetime('now'), 'test'),
  (1, datetime('now', '-5 days'), 2000, 'bonus', 'Test 3', datetime('now'), 'test'),
  (1, datetime('now', '-4 days'), -300, 'deduction', 'Test 4', datetime('now'), 'test');
EOF

# Calculate expected balance
# Current balance + 1000 - 500 + 2000 - 300 = Current + 2200

# Verify balance
sqlite3 db/finance.db "SELECT SUM(amount_cents) as balance_cents FROM pocket_money WHERE person_id=1;"
```

**Expected**: Balance should increase by 2200 cents ($22.00)

### Test 10: Transaction Type Validation

```bash
# Try to insert invalid transaction type (should fail)
sqlite3 db/finance.db "INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by) VALUES (1, datetime('now'), 100, 'invalid_type', 'Test', datetime('now'), 'test');"
```

**Expected**: Error message about CHECK constraint failure

### Test 11: Foreign Key Constraint

```bash
# Try to insert transaction for non-existent person (should fail)
sqlite3 db/finance.db "INSERT INTO pocket_money (person_id, transaction_date, amount_cents, transaction_type, reason, created_at, created_by) VALUES (99999, datetime('now'), 100, 'bonus', 'Test', datetime('now'), 'test');"
```

**Expected**: Error message about FOREIGN KEY constraint failure

## Common Queries

### Check Current Balance
```sql
SELECT
  p.name as Person,
  SUM(pm.amount_cents) / 100.0 as Balance_Dollars
FROM pocket_money pm
JOIN persons p ON pm.person_id = p.person_id
WHERE pm.person_id = 1
GROUP BY p.name;
```

### Transaction Summary by Type
```sql
SELECT
  transaction_type,
  COUNT(*) as Count,
  SUM(amount_cents) / 100.0 as Total_Dollars
FROM pocket_money
WHERE person_id = 1
GROUP BY transaction_type
ORDER BY transaction_type;
```

### Monthly Summary
```sql
SELECT
  strftime('%Y-%m', transaction_date) as Month,
  COUNT(*) as Transactions,
  SUM(amount_cents) / 100.0 as Net_Change_Dollars
FROM pocket_money
WHERE person_id = 1
GROUP BY strftime('%Y-%m', transaction_date)
ORDER BY Month DESC;
```

### Recent Activity (Last 30 Days)
```sql
SELECT
  date(transaction_date) as Date,
  amount_cents / 100.0 as Amount_Dollars,
  transaction_type as Type,
  reason as Reason,
  created_by as Created_By
FROM pocket_money
WHERE person_id = 1
  AND transaction_date >= datetime('now', '-30 days')
ORDER BY transaction_date DESC;
```

### Audit Trail (All Changes)
```sql
SELECT
  pocket_money_id as ID,
  datetime(transaction_date) as Transaction_Time,
  amount_cents / 100.0 as Amount_Dollars,
  transaction_type as Type,
  reason as Reason,
  datetime(created_at) as Created_At,
  created_by as Created_By
FROM pocket_money
WHERE person_id = 1
ORDER BY created_at DESC;
```

## Troubleshooting

### Issue: Weekly allowance not being added

**Symptoms**: No new transactions appear on Sundays

**Diagnosis**:
```bash
# Check if job is scheduled
grep "Pocket money job" combined.log

# Check POCKET_MONEY_ENABLED
grep POCKET_MONEY_ENABLED .env

# Check job state
sqlite3 db/finance.db "SELECT * FROM pocket_money_job_state WHERE job_name='weekly_allowance';"
```

**Solutions**:
1. Ensure `POCKET_MONEY_ENABLED=true` in `.env`
2. Verify cron schedule is valid: `0 9 * * 0`
3. Check server time zone matches expected execution time
4. Review logs for errors during job execution

### Issue: Balance doesn't match expected amount

**Symptoms**: Balance calculation seems incorrect

**Diagnosis**:
```bash
# List all transactions
sqlite3 db/finance.db "SELECT transaction_date, amount_cents, transaction_type, reason FROM pocket_money WHERE person_id=1 ORDER BY transaction_date;"

# Manual calculation
sqlite3 db/finance.db "SELECT SUM(amount_cents) FROM pocket_money WHERE person_id=1;"
```

**Solutions**:
1. Verify no duplicate transactions exist
2. Check for negative amounts that should be positive (or vice versa)
3. Ensure all transactions have correct `person_id`

### Issue: Backfill adds too many/too few allowances

**Symptoms**: After service restart, unexpected number of allowances added

**Diagnosis**:
```bash
# Check job state
sqlite3 db/finance.db "SELECT last_success_date, run_count FROM pocket_money_job_state WHERE job_name='weekly_allowance';"

# Check recent allowances
sqlite3 db/finance.db "SELECT transaction_date, reason FROM pocket_money WHERE transaction_type='weekly_allowance' AND person_id=1 ORDER BY transaction_date DESC LIMIT 10;"
```

**Solutions**:
1. Verify `last_success_date` is correct (should be date of last Sunday)
2. Check for clock drift on server
3. Review backfill logic in service logs

### Issue: Cannot insert transactions

**Symptoms**: SQL errors when adding bonuses/deductions

**Diagnosis**:
```bash
# Check table schema
sqlite3 db/finance.db ".schema pocket_money"

# Verify foreign key constraints are enabled
sqlite3 db/finance.db "PRAGMA foreign_keys;"
```

**Solutions**:
1. Ensure `person_id` exists in `persons` table
2. Verify `transaction_type` is one of: 'initial', 'weekly_allowance', 'bonus', 'deduction'
3. Check that `amount_cents` is an integer (not decimal)
4. Ensure `transaction_date` is in ISO 8601 format

### Issue: Job runs but doesn't add allowance

**Symptoms**: Logs show job execution but no new transactions

**Diagnosis**:
```bash
# Check detailed logs
grep "pocket money" combined.log -i

# Check if week has elapsed
sqlite3 db/finance.db "SELECT
  last_success_date,
  julianday('now') - julianday(last_success_date) as days_since
FROM pocket_money_job_state
WHERE job_name='weekly_allowance';"
```

**Solutions**:
1. Job only adds allowance if 7+ days have passed since last run
2. This is expected behavior to prevent duplicates
3. To force a new allowance, manually update `last_success_date` to be 8+ days ago

## Maintenance

### Weekly Health Check

```bash
# Verify job is running
sqlite3 db/finance.db "SELECT
  job_name,
  last_success_date,
  run_count,
  julianday('now') - julianday(last_success_date) as days_since_last_run
FROM pocket_money_job_state;"
```

**Expected**: `days_since_last_run` should be less than 7

### Monthly Balance Audit

```bash
# Generate monthly report
sqlite3 db/finance.db <<EOF
.mode column
.headers on
SELECT
  strftime('%Y-%m', transaction_date) as Month,
  SUM(CASE WHEN transaction_type='weekly_allowance' THEN amount_cents ELSE 0 END) / 100.0 as Allowances,
  SUM(CASE WHEN transaction_type='bonus' THEN amount_cents ELSE 0 END) / 100.0 as Bonuses,
  SUM(CASE WHEN transaction_type='deduction' THEN amount_cents ELSE 0 END) / 100.0 as Deductions,
  SUM(amount_cents) / 100.0 as Net_Change
FROM pocket_money
WHERE person_id = 1
GROUP BY strftime('%Y-%m', transaction_date)
ORDER BY Month DESC;
EOF
```

### Backup Considerations

Pocket money data is automatically included in the regular database backups. See [backup-testing-guide.md](backup-testing-guide.md) for details.

## UI Implementation

### Overview

A web UI has been implemented to manage pocket money transactions alongside the existing finance tracking features. The UI is accessible through a new "零花钱" (Pocket Money) tab in the dashboard.

### Navigation

The pocket money UI is accessed through the main dashboard:

```
Dashboard → 零花钱 Tab → Pocket Money View
```

Three tabs are now available:
1. **当前账单** (Current Bill) - Current month transactions
2. **历史记录** (History) - All finance transaction history
3. **零花钱** (Pocket Money) - Robin's pocket money tracking ✨ NEW

### Component Architecture

```
Dashboard
  └── PocketMoneyView (Container component)
      ├── Balance Card (Displays current balance)
      ├── Add Transaction Button
      ├── MonthGroup[] (Reuses existing component)
      │   └── DayGroup[] (Reuses existing component)
      │       └── PocketMoneyTile[] (Transaction display)
      └── PocketMoneyEditorDialog (Add/Edit form)
```

### Components

#### 1. PocketMoneyView
**Location**: `app/components/dashboard/PocketMoneyView.tsx`

Main container component that:
- Displays current balance in a prominent card
- Shows transaction history grouped by month/day
- Provides "Add Transaction" button
- Manages Redux state (loading, error, data)
- Handles create/update/delete operations

#### 2. PocketMoneyTile
**Location**: `app/components/dashboard/PocketMoneyTile.tsx`

Individual transaction display component:
- Shows transaction type badge with icon and color:
  - 💵 Weekly Allowance (blue)
  - 🎁 Reward (green)
  - ⚠️ Punishment (red)
  - ⭐ Initial Balance (purple)
- Displays reason, date, and created_by
- Amount with color coding (green for positive, red for negative)
- Clickable for manual transactions (bonus/deduction only)
- Non-clickable for automatic transactions (weekly_allowance, initial)

#### 3. PocketMoneyEditorDialog
**Location**: `app/components/dashboard/PocketMoneyEditorDialog.tsx`

Modal form for adding/editing transactions:
- **Fields**:
  - Transaction Type: Dropdown (Reward/Punishment)
  - Amount: Calculator input (always positive)
  - Reason: Textarea (required)
- **Modes**:
  - Create: Shows "Cancel" and "Save" buttons
  - Edit: Shows "Cancel", "Delete", and "Update" buttons
- **Validation**:
  - Amount must be > 0
  - Reason cannot be empty
- **Delete Confirmation**: Shows confirmation dialog before deletion

### API Endpoints

#### GET /api/pocket-money/list
Fetches all pocket money transactions for Robin (person_id = 1).

**Response**:
```typescript
{
  success: true,
  balance: number,        // Total balance in cents
  transactions: PocketMoneyData[],
  total: number          // Count of transactions
}
```

#### POST /api/pocket-money/create
Creates a new manual transaction (bonus or deduction).

**Request**:
```typescript
{
  transaction_type: 'bonus' | 'deduction',
  amount_cents: number,   // Positive for bonus, negative for deduction
  reason: string,
  transaction_date?: string  // Optional, defaults to now
}
```

**Response**:
```typescript
{
  success: true,
  data: PocketMoneyData
}
```

**Validation**:
- Only 'bonus' or 'deduction' types allowed
- Amount must be positive for bonus, negative for deduction
- Reason required (min 1 char)
- Date must be valid ISO 8601 if provided

#### PUT /api/pocket-money/[id]
Updates an existing manual transaction.

**Request**: Same as create, all fields optional

**Response**: Same as create

**Restrictions**:
- Only bonus/deduction transactions can be updated
- Automatic transactions (weekly_allowance, initial) are protected
- Returns 403 if attempting to edit protected transaction

#### DELETE /api/pocket-money/[id]
Deletes a manual transaction.

**Response**:
```typescript
{
  success: true,
  message: "Transaction deleted successfully"
}
```

**Restrictions**:
- Only bonus/deduction transactions can be deleted
- Automatic transactions are protected
- Returns 403 if attempting to delete protected transaction

### Redux State Management

**Location**: `app/lib/redux/features/pocketMoney/pocketMoneySlice.ts`

**State Shape**:
```typescript
{
  balance: number,
  transactions: PocketMoneyData[],
  isLoading: boolean,
  error: string | null,
  expandedMonths: string[]
}
```

**Async Thunks**:
- `fetchPocketMoneyAsync`: Loads all transactions and balance
- `createPocketMoneyAsync`: Creates new transaction
- `updatePocketMoneyAsync`: Updates existing transaction
- `deletePocketMoneyAsync`: Deletes transaction

**Selectors**:
- `selectPocketMoneyBalance`: Current balance
- `selectPocketMoneyTransactions`: Flat transaction list
- `selectPocketMoneyGroupedByMonth`: Hierarchical month/day structure
- `selectPocketMoneyLoading`: Loading state
- `selectExpandedMonths`: UI state for collapsed/expanded months

### TypeScript Types

**Location**: `app/lib/types/api.ts`

```typescript
// Transaction data
interface PocketMoneyData {
  pocket_money_id: number;
  person_id: number;
  transaction_date: string;  // ISO 8601
  amount_cents: number;      // Can be positive or negative
  transaction_type: 'initial' | 'weekly_allowance' | 'bonus' | 'deduction';
  reason: string;
  created_at: string;
  created_by: string;
}

// Create request
interface CreatePocketMoneyRequest {
  transaction_type: 'bonus' | 'deduction';
  amount_cents: number;
  reason: string;
  transaction_date?: string;
}

// Update request (all fields optional)
interface UpdatePocketMoneyRequest {
  transaction_type?: 'bonus' | 'deduction';
  amount_cents?: number;
  reason?: string;
  transaction_date?: string;
}

// List response
interface PocketMoneyListResponse {
  success: true;
  balance: number;
  transactions: PocketMoneyData[];
  total: number;
}
```

### Database Access Layer

**Location**: `app/lib/db/pocketMoney.ts`

Functions:
- `getAllPocketMoney(personId)`: Fetch all transactions
- `getPocketMoneyById(pocketMoneyId)`: Fetch single transaction
- `calculateBalance(personId)`: Sum of all amount_cents
- `createPocketMoney(data, personId, createdBy)`: Insert new transaction
- `updatePocketMoney(pocketMoneyId, data)`: Update transaction (protected)
- `deletePocketMoney(pocketMoneyId)`: Delete transaction (protected)

All update/delete operations verify transaction type and throw errors for protected transactions.

### User Workflows

#### Adding a Reward
1. Click "零花钱" tab in dashboard
2. Click "Add Transaction" button
3. Select "🎁 Reward (Bonus)" from dropdown
4. Enter amount (e.g., 10.00)
5. Enter reason (e.g., "Excellent math exam result")
6. Click "Save"
7. Transaction appears in list with green amount
8. Balance updates immediately

#### Adding a Punishment
1. Click "Add Transaction" button
2. Select "⚠️ Punishment (Deduction)" from dropdown
3. Enter amount (e.g., 5.00)
4. Enter reason (e.g., "Forgot to clean room")
5. Click "Save"
6. Transaction appears in list with red amount
7. Balance decreases

#### Editing a Transaction
1. Click on any bonus or deduction transaction in the list
2. Modify amount, reason, or type
3. Click "Update"
4. Transaction updates, balance recalculates

#### Deleting a Transaction
1. Click on a manual transaction
2. Click "Delete" button
3. Confirm deletion in dialog
4. Transaction removed, balance recalculates

**Note**: Weekly allowance and initial balance transactions cannot be edited or deleted.

### Design Decisions

1. **Robin Only**: UI hard-coded to person_id = 1 (Robin)
2. **Manual Transactions**: Only bonus/deduction can be created via UI
3. **Protected Transactions**: Automatic transactions (weekly_allowance, initial) cannot be edited/deleted
4. **No Filters**: Simple chronological list without filtering
5. **Amount Input**: Always positive; sign determined by transaction type
6. **Balance Display**: Prominent card at top showing current total
7. **Grouping**: Reuses MonthGroup/DayGroup components for consistency
8. **Delete Confirmation**: Prevents accidental deletions

### Testing the UI

1. **Navigation**: Click "零花钱" tab, verify pocket money view loads
2. **Balance Display**: Check current balance shows correct amount
3. **Transaction List**: Verify all transactions visible, grouped by month/day
4. **Add Reward**: Create $10 bonus, verify balance increases
5. **Add Punishment**: Create $5 deduction, verify balance decreases
6. **Edit Transaction**: Click manual transaction, modify, verify update
7. **Delete Transaction**: Delete transaction, verify removal
8. **Protected Transactions**: Try clicking weekly_allowance, verify not editable
9. **Dark Mode**: Toggle dark mode, verify styling
10. **Error Handling**: Submit empty form, verify validation errors

### Future UI Enhancements

1. **Filtering**: Add filters by transaction type, date range
2. **Balance Chart**: Visual graph of balance over time
3. **Export**: Download transaction history as CSV
4. **Multiple Children**: Person selector for Luna, Lily, etc.
5. **Search**: Search transactions by reason
6. **Pagination**: Load more for very long histories
7. **Notifications**: Toast messages for success/error
8. **Mobile Responsive**: Optimize for mobile devices

## Future Enhancements

Potential features for future development:

1. **Multiple Children**: Extend to support pocket money for Luna, Lily, etc.
2. **Spending Tracker**: Add table to track what pocket money is spent on
3. **Savings Goals**: Allow setting and tracking savings goals
4. **Interest System**: Automatic interest on savings to teach financial concepts
5. **Allowance Rules**: Configurable weekly amount per person
6. **Notifications**: Email/SMS alerts for low balance or goal achievement
7. **Reports**: Weekly/monthly pocket money reports
8. **CSV Export**: Export transaction history to CSV for analysis
9. **Integration with fin table**: Link pocket money spending to actual purchases
