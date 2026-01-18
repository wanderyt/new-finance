# Item Unit Price Feature

**Feature Date**: 2026-01-17
**Status**: In Progress

## Overview

This document tracks the implementation of the unit price field for line items in the finance tracking application.

## Requirements

### Feature 1: Add Unit Price Field to LineItemEditor

**User Story**: As a user, I want to see and edit the unit price for each line item, so that I can track the price per unit (e.g., $/kg, $/pc) in addition to the total amount.

**Current State**:
- The `fin_items` table has 4 quantity-related fields: `qty`, `unit`, `unit_price_cents`, `original_amount_cents`
- The UI only shows 1 input field for `original_amount_cents` (total amount)
- The `unit_price_cents` field exists in the database and API but is not displayed in the UI

**Target State**:
- Add a unit price input field to the LineItemEditor component
- Auto-calculate unit price when quantity or total amount changes
- Allow users to manually override the calculated unit price
- Extract unit price from receipt images using AI

### Feature 2: Database Update

**Requirement**: One-time database update to change merchant name "大统华" to "T&T" in test.db

## Technical Changes

### 1. LineItemEditor Component ([app/components/dashboard/LineItemEditor.tsx](../app/components/dashboard/LineItemEditor.tsx))

#### Layout Reorganization
- **Before** (3 rows):
  - Row 1: Item Name | Total Amount
  - Row 2: Quantity | Unit | Person
  - Row 3: Notes

- **After** (4 rows):
  - Row 1: Item Name | Total Amount
  - Row 2: Quantity | Unit Price | Unit
  - Row 3: Person
  - Row 4: Notes

#### New Features
1. **State Management**: Add `unitPriceInput` state similar to `amountInput`
2. **Auto-calculation**: Calculate unit price when quantity or total amount changes
3. **Manual Override**: Allow users to manually edit unit price
4. **Validation**: Handle edge cases (qty = 0, empty qty, etc.)

### 2. Receipt Analysis API ([app/api/receipts/analyze/route.ts](../app/api/receipts/analyze/route.ts))

#### AI Prompt Update
- **Before**: Extract `amount`, `quantity`, `unit` for each line item
- **After**: Also extract `unitPrice` from receipt (e.g., "$3.99/kg")

#### Response Mapping
- Map `unitPrice` to `unitPriceCents` before returning to frontend
- Fallback to null if unit price not visible on receipt

### 3. Database Update

**Database**: `db/test.db`
**Table**: `FIN`
**Column**: `comment` (merchant name)
**Change**: "大统华" → "T&T"
**Records Affected**: 163

### SQL Statements (Manual Execution Required)

Execute the following SQL statements in your desired environment:

```sql
-- Optional: Backup the database first
-- cp db/test.db db/test.db.backup.$(date +%Y%m%d_%H%M%S)

-- Update merchant name from 大统华 to T&T
UPDATE FIN
SET comment = 'T&T'
WHERE comment = '大统华';

-- Verify the update
SELECT COUNT(*) as updated_count
FROM FIN
WHERE comment = 'T&T';
-- Expected: 163 (or current count)

-- Verify no remaining records with old name
SELECT COUNT(*) as remaining_count
FROM FIN
WHERE comment = '大统华';
-- Expected: 0
```

**Command Line Execution:**
```bash
# Backup (optional)
cp db/test.db db/test.db.backup.$(date +%Y%m%d_%H%M%S)

# Update
sqlite3 db/test.db "UPDATE FIN SET comment = 'T&T' WHERE comment = '大统华';"

# Verify
sqlite3 db/test.db "SELECT COUNT(*) FROM FIN WHERE comment = 'T&T';"
sqlite3 db/test.db "SELECT COUNT(*) FROM FIN WHERE comment = '大统华';"
```

## Implementation Timeline

| Step | Task | Status | Notes |
|------|------|--------|-------|
| 1 | Create documentation | ✅ Complete | This file |
| 2 | Database update (大统华 → T&T) | ⚠️ Manual | SQL provided below for manual execution |
| 3 | Receipt analysis AI prompt | ✅ Complete | Extract unitPrice field |
| 4 | Receipt response mapping | ✅ Complete | Map unitPrice to unitPriceCents |
| 5 | Unit price state management | ✅ Complete | Add unitPriceInput state |
| 6 | Auto-calculation logic | ✅ Complete | Calculate when qty/amount changes |
| 7 | UI layout update | ✅ Complete | 4-row layout |
| 8 | End-to-end testing | 🔄 In Progress | Ready for manual testing |

## Testing Plan

### Unit Price Field Tests

#### 1. Auto-calculation Test
- Create new line item
- Enter quantity: `2`, total amount: `$10.00`
- **Expected**: Unit price auto-fills to `$5.00`

#### 2. Manual Override Test
- Change unit price to `$4.50`
- **Expected**: Value persists after blur and saves to database

#### 3. Receipt Analysis Test
- Upload receipt with line items showing unit prices (e.g., "Apples 2kg @ $3.99/kg → $7.98")
- **Expected**: Unit price field populated with extracted value

#### 4. Edge Cases
- Quantity = 0 → unit price remains unchanged
- Clear quantity → unit price remains as manually entered
- Change total amount → unit price recalculates if qty exists

#### 5. Layout & UI
- Verify Person dropdown moved to Row 3
- Check 4-row layout on mobile and desktop
- Test dark mode appearance

### Database Update Verification

```bash
# Check T&T records
sqlite3 db/test.db "SELECT COUNT(*) FROM FIN WHERE comment = 'T&T';"
# Expected: 163

# Check no remaining 大统华 records
sqlite3 db/test.db "SELECT COUNT(*) FROM FIN WHERE comment = '大统华';"
# Expected: 0
```

## Files Modified

1. [app/components/dashboard/LineItemEditor.tsx](../app/components/dashboard/LineItemEditor.tsx) - Add unit price input and logic
2. [app/api/receipts/analyze/route.ts](../app/api/receipts/analyze/route.ts) - Update AI prompt and response mapping
3. [app/components/dashboard/ReceiptAnalysisDialog.tsx](../app/components/dashboard/ReceiptAnalysisDialog.tsx) - Add unitPriceCents to AnalyzedLineItem interface and mapping
4. [app/components/dashboard/FinEditorForm.tsx](../app/components/dashboard/FinEditorForm.tsx) - Add unitPriceCents to ReceiptAnalysisResult interface
5. `db/test.db` - Database update (大统华 → T&T)

## Files Reviewed (No Changes Needed)

- [app/lib/db/schema.ts](../app/lib/db/schema.ts) - Schema already has `unitPriceCents`
- [app/api/fin/create/route.ts](../app/api/fin/create/route.ts) - Already handles `unitPriceCents`
- [app/api/fin/update/route.ts](../app/api/fin/update/route.ts) - Already handles `unitPriceCents`

## Notes

- The calculation logic is non-blocking: users can manually enter unit price even if quantity is 0 or empty
- The $ icon is reused from the total amount input for consistency
- Receipt analysis AI should extract unit price directly from receipts (most receipts show this)
- Fallback calculation (total / quantity) is used if AI doesn't extract unit price

## Future Considerations

- Consider adding validation to warn users if `qty * unitPrice ≠ total` (with tolerance for rounding)
- Could add a "lock" icon to toggle between auto-calculate and manual mode
- May want to add unit price to price trend analysis features
