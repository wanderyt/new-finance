# Scripts

Utility scripts for database seeding, testing, and maintenance.

## Price Trend Test Data Scripts

### Generate Test Data

**`seed-price-trend-data.ts`** - Generates sample transactions for testing the price trend feature

Creates realistic test data with:
- **2 merchants**: T&T, Walmart
- **3 products**: 鸡蛋, 茄子, 牛奶
- **Coverage**: Weekly purchases across all 12 months of 2025
- **Price variation**: Realistic seasonal trends, sales, and weekly fluctuations
- **Marker**: All test transactions are marked with `comment: "TEST_DATA"` for easy cleanup

**Usage:**
```bash
npx tsx scripts/seed-price-trend-data.ts
```

**What it does:**
1. Retrieves current user ID from database
2. Generates ~24-36 transactions per product (2-3 per month × 12 months × 2 merchants)
3. Each transaction contains 1-2 products with realistic pricing
4. Inserts transactions with TEST_DATA marker
5. Prints summary statistics

**Example output:**
```
📈 Summary Statistics:
──────────────────────────────────────────────────

鸡蛋:
  Total purchases: 54
  Average price: $6.18
  T&T: $5.89 (27 purchases)
  Walmart: $6.47 (27 purchases)

茄子:
  Total purchases: 48
  Average price: $2.21
  T&T: $1.95 (24 purchases)
  Walmart: $2.47 (24 purchases)

牛奶:
  Total purchases: 51
  Average price: $5.19
  T&T: $5.41 (26 purchases)
  Walmart: $4.97 (25 purchases)
```

### Cleanup Test Data

**`cleanup-test-data.ts`** - Removes all test transactions from database

**Usage:**
```bash
npx tsx scripts/cleanup-test-data.ts
```

**What it does:**
1. Finds all transactions with `comment: "TEST_DATA"`
2. Deletes associated line items (respects foreign key constraints)
3. Deletes test transactions
4. Prints cleanup summary

**Safety:**
- Only removes transactions explicitly marked as test data
- Does not affect real user data
- Safe to run multiple times (idempotent)

## Testing Workflow

### 1. Generate Test Data
```bash
# Generate sample transactions for price trend testing
npx tsx scripts/seed-price-trend-data.ts
```

### 2. Test the Feature
1. Start dev server: `yarn dev`
2. Navigate to: Dashboard → 图表 → 价格趋势
3. Search for products: `鸡蛋`, `茄子`, or `牛奶`
4. Verify multi-line chart displays correctly
5. Check price trends across merchants
6. Hover tooltips to see weekly averages

### 3. Cleanup After Testing
```bash
# Remove all test data
npx tsx scripts/cleanup-test-data.ts
```

## Implementation Details

### Price Variation Algorithm

The test data generator simulates realistic price fluctuations:

```typescript
function getPriceWithVariation(basePrice, monthIndex, merchant) {
  // 1. Seasonal factor (winter +5%, summer -5%)
  const seasonalFactor = winterMonth ? 1.05 : summerMonth ? 0.95 : 1.0;

  // 2. Weekly variation (-5% to +10%)
  const weeklyVariation = 0.95 + Math.random() * 0.15;

  // 3. Sales factor (T&T: 20% chance of 10-20% discount)
  const salesFactor = isSale ? 0.8 + Math.random() * 0.1 : 1.0;

  return basePrice * seasonalFactor * weeklyVariation * salesFactor;
}
```

### Data Structure

**Transactions (fin table):**
- `finId`: Unique transaction ID (nanoid)
- `userId`: Current user's ID
- `merchant`: "T&T" or "Walmart"
- `date`: Random date within each week
- `comment`: "TEST_DATA" (cleanup marker)

**Line Items (fin_items table):**
- `finId`: References parent transaction
- `name`: Product name (鸡蛋, 茄子, 牛奶)
- `unitPriceCents`: Price per unit in cents
- `originalAmountCents`: Total amount (unitPrice × qty)
- `qty`: Quantity purchased (1-2 units)
- `unit`: Unit of measurement (dozen, lb, 2L)

## Notes

- Test data uses realistic Canadian grocery prices (CAD)
- All transactions are categorized as "Grocery → Food"
- Price trends reflect typical seasonal patterns:
  - Winter (Jan-Feb, Nov-Dec): Slightly higher prices
  - Summer (Jun-Aug): Slightly lower prices
  - T&T tends to have more frequent sales
- Generated data spans entire year (2025) for comprehensive testing
