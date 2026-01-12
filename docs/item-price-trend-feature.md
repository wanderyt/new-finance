# Item Price Trend Analysis Feature

## Overview

Multi-line chart feature that allows users to compare the same product's prices across different merchants over time. This feature provides two types of analysis:
1. **Price trend per merchant**: How each merchant's price changes over time
2. **Cross-merchant comparison**: Which merchant offers better prices

## User Requirements

- **Access Point**: New "价格趋势" tab in ChartsView beside "个人分析"
- **Product Selection**: Search/autocomplete with frequently purchased items
- **Aggregation**: Average price per merchant per time period
- **Time Period**: Weekly averages (ISO week format)
- **Visualization**: Multi-line chart with one line per merchant

## Architecture

### Data Flow

```
User selects product → API fetches price history → Redux stores data → Chart displays multi-line visualization
```

### Processing Pipeline

1. User navigates to "价格趋势" tab in ChartsView
2. User searches/autocompletes product name (from frequently purchased items)
3. Frontend dispatches Redux thunk to fetch price trend data
4. **Backend API**: Queries database
   - JOIN finItems + fin tables
   - GROUP BY merchant + ISO week
   - Calculate average price per merchant per week
5. API returns weekly average prices per merchant
6. Redux stores data in state
7. ItemPriceTrendChart renders multi-line chart (one line per merchant)
8. User analyzes:
   - Price trends per merchant (how prices change over time)
   - Cross-merchant comparisons (which merchant has better prices)

## Technical Design

### Backend API

#### 1. Price Trend Endpoint

**Path**: `/api/fin/items/price-trend`

**Method**: GET

**Query Parameters**:
- `itemName` (required): Product name to analyze

**Response**:
```typescript
{
  itemName: string;
  data: WeeklyPricePoint[];
  merchants: string[];
}

interface WeeklyPricePoint {
  merchant: string;
  week: string; // Format: "2026-W01"
  avgPrice: number; // In dollars
  count: number; // Number of purchases in this week
}
```

**Key Features**:
- ISO week format (YYYY-Www) for consistent weekly grouping
- Average price calculation per merchant per week
- Handles both unitPrice (if available) and calculated price (originalAmount/qty)
- Returns data sorted by week chronologically
- Includes purchase count for transparency

#### 2. Autocomplete Endpoint

**Path**: `/api/fin/items/autocomplete`

**Method**: GET

**Query Parameters**:
- `q` (required): Search query

**Response**:
```typescript
{
  items: AutocompleteItem[];
}

interface AutocompleteItem {
  name: string;
  count: number; // Purchase frequency
  lastPurchased: string; // ISO date
}
```

**Key Features**:
- Fuzzy search using SQL LIKE with wildcards
- Sort by purchase frequency (most frequently purchased first)
- Include last purchase date for context
- Limit to top 10 results for performance

### Frontend Architecture

#### Redux State Management

**State Structure**:
```typescript
interface FinState {
  // ... existing fields
  priceTrend: {
    data: PriceTrendData | null;
    loading: boolean;
    error: string | null;
  };
  itemAutocomplete: {
    items: AutocompleteItem[];
    loading: boolean;
    error: string | null;
  };
}
```

**Async Thunks**:
- `fetchPriceTrend(itemName: string)`: Fetch price history for a product
- `fetchItemAutocomplete(query: string)`: Fetch autocomplete suggestions

**Selectors**:
- `selectPriceTrend(state)`: Access price trend state
- `selectItemAutocomplete(state)`: Access autocomplete state

#### Components

**1. ItemSearchInput** (`ItemSearchInput.tsx`)
- Search input with autocomplete dropdown
- Debounced search (300ms) to reduce API calls
- Display purchase frequency for each suggestion
- Click outside to close dropdown
- Loading spinner during search

**2. ItemPriceTrendChart** (`ItemPriceTrendChart.tsx`)
- Recharts LineChart with multiple lines (one per merchant)
- Distinct colors for each merchant (cycling through color palette)
- Formatted tooltip showing week and price
- Legend showing all merchants
- Connect nulls to handle missing data points
- Responsive container for different screen sizes

**3. ItemPriceTrendView** (`ItemPriceTrendView.tsx`)
- Main container component
- Search input at top
- Chart area with loading/error/empty states
- Item metadata display (merchant count, week count)
- Insights section with analysis tips

**4. ChartsView** (modified)
- Add "价格趋势" tab as second tab beside "个人分析"
- Route to ItemPriceTrendView when tab is active

### Database Schema

**No migration required** - uses existing schema:

**Tables**:
```sql
-- finItems: Contains item name, prices, quantities
CREATE TABLE fin_items (
  item_id INTEGER PRIMARY KEY,
  fin_id TEXT NOT NULL,
  name TEXT NOT NULL,  -- Product name (standardized)
  unit_price_cents INTEGER,  -- Unit price if available
  original_amount_cents INTEGER NOT NULL,  -- Total item amount
  qty REAL,  -- Quantity purchased
  FOREIGN KEY (fin_id) REFERENCES fin(fin_id)
);

-- fin: Contains transaction metadata
CREATE TABLE fin (
  fin_id TEXT PRIMARY KEY,
  merchant TEXT,  -- Merchant name
  date TEXT NOT NULL,  -- Purchase date (ISO format)
  user_id TEXT NOT NULL  -- User identifier
);
```

**Query Pattern**:
```sql
SELECT
  fi.name,
  f.merchant,
  f.date,
  fi.unit_price_cents,
  fi.original_amount_cents,
  fi.qty
FROM fin_items fi
INNER JOIN fin f ON fi.fin_id = f.fin_id
WHERE fi.name = ? AND f.user_id = ?
ORDER BY f.date ASC
```

## Implementation Details

### Price Calculation Logic

**Unit Price Calculation**:
```typescript
let pricePerUnit: number;
if (purchase.unitPriceCents) {
  // Use existing unit price if available
  pricePerUnit = purchase.unitPriceCents;
} else {
  // Calculate from total amount divided by quantity
  const qty = purchase.qty || 1;
  pricePerUnit = Math.round(purchase.originalAmountCents / qty);
}
```

**Weekly Aggregation**:
```typescript
// Group by merchant + ISO week
const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
const mapKey = `${purchase.merchant}|${weekKey}`;

// Calculate average price for this merchant-week combination
weeklyData.set(mapKey, {
  merchant: purchase.merchant,
  week: weekKey,
  totalPrice: pricePerUnit,
  count: 1,  // Number of purchases this week
});

// Average: totalPrice / count
avgPrice = totalPrice / count / 100  // Convert cents to dollars
```

### Chart Data Transformation

**Input Format** (from API):
```typescript
[
  { merchant: "Costco", week: "2026-W01", avgPrice: 5.99, count: 2 },
  { merchant: "Walmart", week: "2026-W01", avgPrice: 6.49, count: 1 },
  { merchant: "Costco", week: "2026-W02", avgPrice: 5.89, count: 3 },
]
```

**Output Format** (for Recharts):
```typescript
[
  { week: "2026-W01", "Costco": 5.99, "Walmart": 6.49 },
  { week: "2026-W02", "Costco": 5.89, "Walmart": null },
]
```

**Transformation Logic**:
```typescript
const weekMap = new Map<string, Record<string, number>>();

for (const point of data) {
  if (!weekMap.has(point.week)) {
    weekMap.set(point.week, {});
  }
  weekMap.get(point.week)![point.merchant] = point.avgPrice;
}

const chartData = Array.from(weekMap.entries())
  .map(([week, merchantPrices]) => ({
    week,
    ...merchantPrices,
  }))
  .sort((a, b) => a.week.localeCompare(b.week));
```

### Color Palette

**Merchant Colors** (cycling):
```typescript
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

// Usage: COLORS[index % COLORS.length]
```

## Edge Cases & Error Handling

### Scenarios

| Scenario | Handling | User Impact |
|----------|----------|-------------|
| **No data for selected item** | Show "暂无数据" message | User tries different product |
| **Item from only one merchant** | Chart renders (single line) | User sees single merchant trend |
| **Missing unitPrice** | Calculate from originalAmount / qty | Transparent to user |
| **Sparse data (missing weeks)** | Use `connectNulls` in Recharts | Lines skip missing data points |
| **Invalid date format** | Skip with console warning | Processing continues |
| **API errors** | Show error message | User can retry |
| **Empty search query** | Don't fetch (< 2 characters) | Placeholder text shown |
| **Too many merchants (> 8)** | Colors cycle (modulo) | All merchants still visible |

### Error Messages

**Backend**:
```typescript
// Missing parameter
badRequestResponse("itemName query parameter is required")

// Database error
serverErrorResponse("Failed to fetch price trend data")
```

**Frontend**:
```typescript
// Loading state
<div>Loading...</div>

// Error state
<div className="text-red-500">{error}</div>

// Empty state
<div>请搜索并选择商品以查看价格趋势</div>
```

## Performance Considerations

### Backend Optimization

1. **Query Optimization**:
   - Use indexed columns (finId, userId, name)
   - LIMIT autocomplete results to 10 items
   - Consider date range filter (e.g., last 6 months)

2. **Data Aggregation**:
   - Pre-calculate averages in JavaScript (not SQL GROUP BY for flexibility)
   - Avoid N+1 queries with proper JOIN

### Frontend Optimization

1. **Search Debouncing**:
   - 300ms delay before API call
   - Reduces unnecessary network requests

2. **Redux State Management**:
   - Cache autocomplete results
   - Loading states prevent duplicate requests

3. **Chart Performance**:
   - Limit data points (e.g., 52 weeks max)
   - Use ResponsiveContainer for efficient rendering
   - Disable animations for > 100 data points (future)

### Expected Performance

- **API Response Time**: < 500ms for typical queries
- **Chart Rendering**: < 100ms for 10 merchants × 52 weeks
- **Autocomplete**: < 300ms including debounce + API

## Testing Strategy

### Manual Testing

**1. Autocomplete**:
```bash
# Test autocomplete endpoint
curl "http://localhost:3000/api/fin/items/autocomplete?q=鸡"

# Expected: Top 10 items containing "鸡", sorted by frequency
```

**2. Price Trend**:
```bash
# Test price trend endpoint
curl "http://localhost:3000/api/fin/items/price-trend?itemName=鸡蛋"

# Expected: Weekly price data grouped by merchant
```

**3. Database Verification**:
```sql
-- Check sample data
SELECT fi.name, f.merchant, f.date, fi.unit_price_cents, fi.original_amount_cents, fi.qty
FROM fin_items fi
INNER JOIN fin f ON fi.fin_id = f.fin_id
WHERE fi.name = '鸡蛋'
ORDER BY f.date DESC
LIMIT 10;
```

**4. UI Testing**:
- Navigate to 图表 → 价格趋势
- Type "鸡" in search box
- Verify dropdown shows matching items
- Click item to select
- Verify chart renders with multiple lines
- Hover over data points to see tooltip
- Check legend shows all merchants

### Test Cases

| Test Case | Expected Result |
|-----------|----------------|
| **Search with 2+ characters** | Autocomplete dropdown appears |
| **Select item from dropdown** | Chart loads with price data |
| **Item with multiple merchants** | Multiple colored lines displayed |
| **Item with one merchant** | Single line displayed |
| **Item with sparse data** | Lines skip missing weeks |
| **Hover over data point** | Tooltip shows week and price |
| **Empty search** | No API call, placeholder shown |
| **API error** | Error message displayed |
| **Loading state** | Spinner shown during fetch |

### Success Criteria

- [ ] Autocomplete shows relevant items sorted by frequency
- [ ] Price trend chart displays multiple lines (one per merchant)
- [ ] Chart data is grouped by ISO week correctly
- [ ] Average prices calculated correctly
- [ ] Tooltip shows correct week and price on hover
- [ ] Legend shows all merchants with distinct colors
- [ ] Loading states work correctly
- [ ] Error states handled gracefully
- [ ] Empty states show helpful messages
- [ ] Tab navigation works smoothly
- [ ] API returns data in < 500ms
- [ ] Chart is responsive on different screen sizes

## User Guide

### How to Use

1. **Navigate to Price Trend Analysis**:
   - Go to Dashboard
   - Click "图表" tab
   - Click "价格趋势" tab

2. **Search for a Product**:
   - Type at least 2 characters in the search box
   - Select a product from the autocomplete dropdown
   - Items are sorted by purchase frequency

3. **Analyze the Chart**:
   - **X-axis**: ISO week (YYYY-Www format)
   - **Y-axis**: Average price in dollars
   - **Lines**: One line per merchant (different colors)
   - **Tooltip**: Hover over data points to see details

4. **Interpret Results**:
   - **Price trends**: See how each merchant's price changes over time
   - **Price comparison**: Compare prices across merchants at any given week
   - **Best value**: Look for merchants with consistently lower prices
   - **Volatility**: Identify merchants with stable vs. fluctuating prices

### Example Insights

**Scenario 1: Finding Best Price**
- Product: 鸡蛋 (Eggs)
- Observation: Costco consistently $1-2 cheaper than Walmart
- Action: Prefer Costco for egg purchases

**Scenario 2: Seasonal Trends**
- Product: 苹果 (Apples)
- Observation: Prices drop in autumn (harvest season)
- Action: Stock up during price dips

**Scenario 3: Merchant Comparison**
- Product: 牛奶 (Milk)
- Observation: Walmart has lower base price, but Costco has better sales
- Action: Monitor both merchants for best deals

## Future Enhancements (Out of Scope)

### Short-term (v2.0)

- **Date range picker**: Allow custom time periods (e.g., last 3 months, last year)
- **Price statistics**: Show min/max/median prices per merchant
- **Export functionality**: Download chart as PNG/PDF

### Medium-term (v3.0)

- **Price alerts**: Notify when price drops below threshold
- **Category analysis**: Compare prices across product categories
- **Mobile optimization**: Touch-friendly chart interactions

### Long-term (v4.0)

- **Price prediction**: Use ML to forecast future prices
- **Market comparison**: Compare with average market prices
- **Personalized recommendations**: Suggest best time and place to buy

## Critical Files

### New Files Created

1. **[app/api/fin/items/price-trend/route.ts](../app/api/fin/items/price-trend/route.ts)** - Price trend API endpoint
2. **[app/api/fin/items/autocomplete/route.ts](../app/api/fin/items/autocomplete/route.ts)** - Autocomplete API endpoint
3. **[app/components/dashboard/charts/ItemPriceTrendView.tsx](../app/components/dashboard/charts/ItemPriceTrendView.tsx)** - Main view component
4. **[app/components/dashboard/charts/ItemPriceTrendChart.tsx](../app/components/dashboard/charts/ItemPriceTrendChart.tsx)** - Chart component
5. **[app/components/dashboard/charts/ItemSearchInput.tsx](../app/components/dashboard/charts/ItemSearchInput.tsx)** - Search input component

### Modified Files

1. **[app/lib/redux/features/fin/finSlice.ts](../app/lib/redux/features/fin/finSlice.ts)** - Added price trend state and thunks
2. **[app/components/dashboard/ChartsView.tsx](../app/components/dashboard/ChartsView.tsx)** - Added "价格趋势" tab

## References

- **Recharts Documentation**: https://recharts.org/
- **Redux Toolkit**: https://redux-toolkit.js.org/
- **date-fns**: https://date-fns.org/
- **ISO Week Date**: https://en.wikipedia.org/wiki/ISO_week_date

## Notes

- **No breaking changes**: New feature, existing functionality unaffected
- **Backward compatible**: Uses existing database schema
- **Incremental rollout**: Can be hidden behind feature flag if needed
- **Modular design**: Components are reusable for other price analysis features
- **Extensible**: Easy to add more chart types (bar, area) later
- **Cost-effective**: No additional API costs, uses existing database
