# Charts/Analytics Feature - Technical Documentation

### Spending priority view

The Charts sheet includes a Spending priority view with the existing month and year controls.
All five view tabs share one horizontally scrollable row. Labels stay on one line, and buttons retain their natural width.
The row hides its scrollbar while preserving horizontal scrolling.
It reports CAD expense totals through priority, category, and subcategory pie charts.
The priority chart includes 必需, 品质, 可选, and 突发.
The breadcrumb supports navigation to each parent view.
Segment clicks and keyboard-accessible legend buttons select the next level.
The detail list shows matched item amounts and each transaction's full total.
Typography matches the existing chart views: labels, amounts, legends, tooltips, and transaction details use 12px text.
Summary amounts and emphasized headings use semibold weight.

The view uses `GET /api/fin/necessity?period=month&value=YYYY-MM`.
Year reports use `period=year&value=YYYY`.
Optional `level`, `category`, and `subcategory` parameters filter details.
Use `details=1`, `offset`, and `limit` for paginated transaction details.
Use `review=estimated` with details to inspect over-total records.
The endpoint scopes queries to the authenticated user and reads records in complete batches.
Its response contains `totals`, `buckets`, `totalCadCents`, `estimatedCadCents`, `estimatedRecordCount`, and `remainderCadCents`.

Periods use UTC calendar boundaries and include records through the current time.
The query accepts historical SQLite date formats and explicit timezone offsets.
Income and future transactions are excluded.
Positive remainders use the record default. Over-total items use labelled proportional estimates.
Largest-remainder rounding keeps allocated CAD cents equal to each record's saved CAD total.
Changing periods resets drill-down state. Aborted older requests cannot replace the active result.
Record updates refresh the report independently from capped person-item data.
See [Spending Priority](./spending-priority-feature.md) for allocation rules.

### Category view

The category view uses the same `GET /api/fin/necessity` report as the spending priority view.
It adds item allocations, not record totals. Each item uses its own category pair or follows the record.
Tax lines split across taxable items. See [Item Categories](./item-categories-feature.md).
The chart reads the report's `categories` totals and shows the top 15 rows. The count is the number of distinct records.
A subcategory selection loads paginated details with `details=1`. Each detail shows the matched item allocations.
The category view excludes future records, like the spending priority view. A future month or year falls back to the current one.
`useSpendingReport` loads reports, aborts stale requests, and reloads after record changes.
`AllocationDetails` and `ReportStatus` are shared by both views.


## Feature Overview

The Charts/Analytics feature provides users with visual insights into their financial data through interactive charts and graphs. It enables users to analyze spending patterns by category, compare monthly trends, and drill down into specific expense details.

### Key Features

1. **Category Bar Chart**: Visual breakdown of expenses by category with drill-down to subcategories
2. **Month Comparison Line Chart**: Compare accumulated expenses across two months to track spending progress
3. **Interactive Drill-down**: Click categories to view detailed transaction lists
4. **Flexible Date Filtering**: Switch between month and year views for different analysis periods
5. **Tab Navigation**: Seamless integration with existing Current Month and History tabs

## User Flow

### Primary Flow

```
Dashboard → Charts Tab → Select Period → View Visualizations → [Optional] Drill into Category → View Transaction List
```

### Detailed User Journey

1. **Access Charts**
   - User clicks "图表分析" (Charts) tab in Dashboard
   - System loads transactions for last 12 months
   - Display month view by default (current month selected)

2. **Filter by Time Period**
   - User toggles between "Month" and "Year" view modes
   - **Month View**: Select specific month (e.g., "2026-01") from dropdown
   - **Year View**: Select specific year (e.g., "2026") from dropdown
   - System refreshes all charts with filtered data

3. **Analyze Category Breakdown (Bar Chart)**
   - **Initial View**: See top-level categories with total expenses
   - User clicks on a category bar → System drills down to show subcategories for that category
   - User clicks on a subcategory bar → System displays detailed transaction list below chart
   - User can click breadcrumb to return to top-level view

4. **Compare Monthly Trends (Line Chart)**
   - System defaults to current month vs previous month comparison
   - User selects two different months from dropdowns
   - Dropdowns only list months up to and including the current month — future months are filtered out via `selectAvailableMonthsForComparison`, so a stray future-dated fin record can't surface as a selectable option
   - Chart displays cumulative expense progression throughout each month
   - Hover over lines to see daily accumulated totals

5. **View Transaction Details**
   - After clicking category/subcategory, expense list appears
   - Shows all transactions matching the selected category
   - User clicks transaction → FinEditor opens for editing
   - User clicks "X" to clear filter and hide list

## Architecture

### State Management

**Redux State Structure** (Extended `finSlice.ts`):

```typescript
export interface FinState {
  fins: FinData[];
  currentFin: FinData | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    type: "all" | "expense" | "income";
    startDate?: string;
    endDate?: string;
  };

  history: {
    // Existing history namespace from fin-search feature
    data: FinData[];
    isLoading: boolean;
    // ... other history fields
  };

  charts: {
    // NEW charts namespace
    viewMode: "month" | "year";
    selectedMonth?: string;
    selectedYear?: string;
    comparisonMonth1?: string;
    comparisonMonth2?: string;
  };
}
```

**Redux Actions**:
- `setChartsViewMode(mode)` - Switch between month/year filtering
- `setChartsSelectedMonth(month)` - Set selected month for filtering
- `setChartsSelectedYear(year)` - Set selected year for filtering
- `setChartsComparisonMonths(month1, month2)` - Set months for line chart comparison

**Redux Selectors**:
- `selectChartsViewMode` - Get current view mode (month/year)
- `selectMonthComparisonData` - Get daily accumulated totals for two months
- `selectAvailableMonths` - Extract unique months from transactions (used by `MonthYearFilter` for the category, person, and price-trend views)
- `selectAvailableMonthsForComparison` - Same as `selectAvailableMonths`, but excludes any month later than the current month. Used by the **Month Comparison** view so users cannot pick a future month even if a (mis-dated) fin record exists there. Compared as `"YYYY-MM"` strings against the current UTC year/month, so the boundary moves automatically as the calendar advances.
- `selectAvailableYears` - Extract unique years from transactions
- `selectChartsComparisonMonths` - Get selected months for comparison

### Component Hierarchy

```
Dashboard
├── TabSwitcher (EXTENDED: adds "charts" tab)
├── [Current Month View]
├── [HistoryView]
└── ChartsView (NEW)
    ├── MonthYearFilter
    │   ├── Button (Month/Year toggle)
    │   └── Select (Month or Year dropdown)
    ├── Section: Category Breakdown
    │   ├── Heading
    │   └── CategoryAnalysisView (drill-down state is local)
    │       ├── CategoryBreadcrumb (when drilled down)
    │       ├── CategoryPieChart or CategoryBarChart
    │       └── AllocationDetails (when a subcategory is selected)
    └── Section: Month Comparison
        ├── Heading
        ├── Month Selectors (2 Select dropdowns)
        └── MonthComparisonLineChart (Recharts LineChart)
```

## Component Details

### 1. ChartsView.tsx

**Purpose**: Main container component for the charts analytics page

**Props**:
```typescript
interface ChartsViewProps {
  onFinClick?: (fin: FinData) => void; // Callback to open FinEditor
}
```

**Responsibilities**:
- Layout container with max-width and spacing
- Organize sections (filter, bar chart, line chart)
- Handle loading and empty states
- Connect child components to Redux state
- Pass onFinClick to CategoryAnalysisView

**Styling**:
- `max-w-2xl mx-auto` - Centered container
- `space-y-6` - Consistent section spacing
- Dark mode support throughout

### 2. MonthYearFilter.tsx

**Purpose**: Date range filter component with month/year toggle

**Props**:
```typescript
interface MonthYearFilterProps {
  viewMode: "month" | "year";
  selectedMonth?: string;
  selectedYear?: string;
  availableMonths: string[];
  availableYears: string[];
  onViewModeChange: (mode: "month" | "year") => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}
```

**Features**:
- Button group toggle for Month/Year view
- Dropdown showing available months (format: "2026-01", "2025-12")
- Dropdown showing available years (format: "2026", "2025")
- Sorted descending (most recent first)
- Uses UI kit Button and Select components

**Data Processing**:
- Extract unique months from `fins` array using `date` field
- Format as "YYYY-MM" for months
- Extract unique years
- Default to current month/year if available

### 3. CategoryBarChart.tsx

**Purpose**: Interactive bar chart showing expense breakdown by category

**Props**:
```typescript
interface CategoryBarChartProps {
  data: CategoryData[];
  drilldownCategory?: string;
  onCategoryClick: (category: string, subcategory?: string) => void;
  height?: number;
}

interface CategoryData {
  category: string;
  subcategory?: string;
  totalCents: number;
  count: number;
}
```

**Chart Configuration**:
- **Library**: Recharts BarChart
- **X-axis**: Category/subcategory names
- **Y-axis**: Amount in CAD (formatted as $X,XXX.XX)
- **Bars**: Red gradient fill (`fill="url(#colorExpense)")`)
- **Tooltip**: Custom tooltip showing category + amount + count
- **Click handler**: Attached to Bar component

**Drill-down Logic**:
1. Initial state: `drilldownCategory === undefined` → Show top-level categories
2. Click category bar → `onCategoryClick("Food", undefined)` → Set drilldown to "Food"
3. Chart re-renders showing subcategories for "Food" only
4. Click subcategory bar → `onCategoryClick("Food", "Groceries")` → Show expense list

**Data Aggregation** (via selector):
- If no drilldown: Group by `category`, sum `amountCadCents` across all subcategories
- If drilldown: Filter by `category === drilldownCategory`, group by `subcategory`
- Sort by `totalCents` descending
- Limit to top 15 items

### 4. CategoryBreadcrumb.tsx

**Purpose**: Navigation breadcrumb for drill-down state

**Props**:
```typescript
interface CategoryBreadcrumbProps {
  drilldownCategory?: string;
  onBack: () => void;
}
```

**Display**:
- Shows "All Categories" when no drilldown
- Shows "All Categories > Food" when drilled down
- Click "All Categories" or back button → Clear drilldown

### 5. CategoryAnalysisView.tsx

**Purpose**: Show category and subcategory charts from the server report, and the details of a selected subcategory.

**Props**:
```typescript
{ onFinClick?: (record: FinData) => void }
```

**Features**:
- Keeps the chart type, drill-down selection, and detail offset in local state. A period change resets them.
- Header shows the selected category, subcategory, and its total.
- `AllocationDetails` lists matched records with their item allocations.
- The clear button (✕) closes the details.

### 6. MonthComparisonLineChart.tsx

**Purpose**: Line chart comparing accumulated expenses across two months

**Props**:
```typescript
interface MonthComparisonLineChartProps {
  month1?: string;
  month2?: string;
  data: DayAccumulation[];
  availableMonths: string[];
  onMonth1Change: (month: string) => void;
  onMonth2Change: (month: string) => void;
  height?: number;
}

interface DayAccumulation {
  day: number; // 1-31
  month1Total: number; // accumulated cents
  month2Total: number; // accumulated cents
}
```

**Chart Configuration**:
- **Library**: Recharts LineChart
- **X-axis**: Day of month (1-31)
- **Y-axis**: Accumulated amount in CAD
- **Lines**:
  - Month 1: Blue (`stroke="#2563eb"`, blue-600)
  - Month 2: Orange (`stroke="#f59e0b"`, amber-500)
- **Legend**: Show month labels
- **Tooltip**: Custom tooltip showing both months' data

**Accumulation Logic** (via selector):
```typescript
// Example for January 2026
const expenses = [
  { date: "2026-01-01", amountCadCents: 5000 },  // $50
  { date: "2026-01-02", amountCadCents: 3000 },  // $30
  { date: "2026-01-04", amountCadCents: 10000 }, // $100
];

// Output:
const accumulated = [
  { day: 1, month1Total: 5000 },   // $50
  { day: 2, month1Total: 8000 },   // $80 (50+30)
  { day: 3, month1Total: 8000 },   // $80 (carried forward, no transaction)
  { day: 4, month1Total: 18000 },  // $180 (80+100)
  // ... continue through day 31
];
```

**Edge Cases**:
- Months with different lengths (Feb 28/29 vs Jan 31) → Pad shorter month with final total
- Missing days → Carry forward previous day's total
- No transactions in month → Show flat line at $0

## Data Flow

### Chart Rendering Flow

```
1. User opens Charts tab
   └→ ChartsView mounts
      └→ Fetch fins from Redux (already loaded from Dashboard)
      └→ Initialize default state (current month, no drilldown)

2. ChartsView renders
   └→ MonthYearFilter
      └→ Selectors: selectAvailableMonths, selectChartsSelectedMonth
      └→ User changes month → dispatch(setChartsSelectedMonth("2026-01"))

   └→ CategoryAnalysisView
      └→ useSpendingReport: GET /api/fin/necessity?period=…&value=…
      └→ User clicks a category → local state shows its subcategories
      └→ User clicks a subcategory → useSpendingReport loads details=1
      └→ User clicks a transaction → onFinClick(fin) → Opens FinEditor

   └→ MonthComparisonLineChart
      └→ Selector: selectMonthComparisonData
      └→ User changes months → dispatch(setChartsComparisonMonths(m1, m2))
      └→ Selector re-computes accumulated data
```

### Data Transformation Pipeline

```
Raw FinData[] (from API)
  ↓
Redux fins[] (all transactions)
  ↓
selectMonthComparisonData (accumulate by day)
  ↓
MonthComparisonLineChart

The category charts do not use Redux records. They read the server report:
GET /api/fin/necessity → allocateSpending per record → categories totals → CategoryAnalysisView
```

## Implementation Details

### Date Handling

**Format Standards**:
- Month string: `"YYYY-MM"` (e.g., "2026-01")
- Year string: `"YYYY"` (e.g., "2026")
- Transaction date: ISO 8601 with UTC timezone (from FinData.date)

**Filtering Logic**:
```typescript
// Month view
const filtered = fins.filter(fin => {
  const finDate = new Date(fin.date);
  const finMonth = `${finDate.getUTCFullYear()}-${String(finDate.getUTCMonth() + 1).padStart(2, '0')}`;
  return finMonth === selectedMonth && fin.type === "expense";
});

// Year view
const filtered = fins.filter(fin => {
  const finDate = new Date(fin.date);
  const finYear = String(finDate.getUTCFullYear());
  return finYear === selectedYear && fin.type === "expense";
});
```

### Category Aggregation Algorithm

The server aggregates categories in `app/api/fin/necessity/route.ts`:

1. `allocateSpending` splits each record into item allocations. A tax line is one allocation, like any other item.
2. Each allocation adds its CAD amount to its `[category, null]` row and its `[category, subcategory]` row.
3. Each row counts distinct records. Records arrive one at a time, so the row compares the last fin ID.
4. The response sorts rows by amount. The client shows the top 15 rows for the current level.

### Cumulative Accumulation Algorithm

```typescript
const accumulateByDay = (fins: FinData[], month: string): DayAccumulation[] => {
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Group by day
  const dailyTotals: Record<number, number> = {};
  fins.forEach(fin => {
    const finDate = new Date(fin.date);
    const day = finDate.getUTCDate();
    dailyTotals[day] = (dailyTotals[day] || 0) + fin.amountCadCents;
  });

  // Accumulate
  let runningTotal = 0;
  const result: DayAccumulation[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    runningTotal += dailyTotals[day] || 0;
    result.push({ day, total: runningTotal });
  }

  return result;
};
```

## Styling & Theming

### Color Scheme

**Light Mode**:
- Bar chart bars: `fill="#dc2626"` (red-600)
- Line chart line 1: `stroke="#2563eb"` (blue-600)
- Line chart line 2: `stroke="#f59e0b"` (amber-500)
- Chart grid: `stroke="#e4e4e7"` (zinc-200)
- Chart text: `fill="#3f3f46"` (zinc-700)

**Dark Mode**:
- Bar chart bars: `fill="#f87171"` (red-400)
- Line chart line 1: `stroke="#60a5fa"` (blue-400)
- Line chart line 2: `stroke="#fbbf24"` (amber-400)
- Chart grid: `stroke="#3f3f46"` (zinc-700)
- Chart text: `fill="#d4d4d8"` (zinc-300)

### Responsive Design

**Desktop (≥768px)**:
- Chart height: 400px
- Container: max-w-2xl (672px)
- Bar chart: All labels visible

**Tablet (≥640px)**:
- Chart height: 350px
- Container: Full width with padding
- Bar chart: Rotate labels if > 10 categories

**Mobile (<640px)**:
- Chart height: 300px
- Container: Full width, minimal padding
- Bar chart: Horizontal scroll if > 8 categories
- Line chart: Simplified tooltip

## Testing Strategy

### Unit Tests
- Redux reducers: Verify state updates for all actions
- Redux selectors: Test data aggregation and filtering logic
- Category aggregation: Test with various data sets
- Accumulation logic: Test with missing days, month boundaries

### Component Tests
- MonthYearFilter: Toggle and dropdown interactions
- CategoryBarChart: Click handlers and drill-down state
- CategoryExpenseList: Transaction filtering and display
- MonthComparisonLineChart: Line rendering and tooltip

### Integration Tests
- Full user flow: Filter → View chart → Drill down → View list → Edit transaction
- Tab switching: Verify state persists when switching between tabs
- Data refresh: Edit transaction → Charts update correctly
- Empty states: No data scenarios for all charts

### Manual Testing Checklist

**Navigation**:
- [ ] Charts tab appears in TabSwitcher
- [ ] Clicking Charts tab displays ChartsView
- [ ] Switching between tabs maintains state

**Date Filter**:
- [ ] Toggle between Month/Year view works
- [ ] Month dropdown shows available months
- [ ] Year dropdown shows available years
- [ ] Selecting month updates all charts
- [ ] Selecting year updates all charts

**Bar Chart**:
- [ ] Top-level categories display correctly
- [ ] Click category → Drills down to subcategories
- [ ] Click subcategory → Shows expense list
- [ ] Breadcrumb navigation works
- [ ] Empty state displays when no expenses
- [ ] Dark mode colors are correct

**Line Chart**:
- [ ] Two lines render for selected months
- [ ] Cumulative accumulation is correct
- [ ] Tooltip shows both months' data
- [ ] Month selectors update chart
- [ ] Handles months with different lengths

**Expense List**:
- [ ] Displays correct transactions
- [ ] Click transaction opens FinEditor
- [ ] Clear button hides list
- [ ] Total and count are accurate

**Edge Cases**:
- [ ] Month with 0 transactions
- [ ] Category with 1 transaction
- [ ] Compare same month twice
- [ ] Year with partial data
- [ ] Future dates

## Performance Considerations

### Optimization Strategies

1. **Memoization**:
   - Use `React.memo` for chart components
   - Use `createSelector` from Redux Toolkit for derived data
   - Memoize expensive calculations (aggregation, accumulation)

2. **Data Limiting**:
   - Limit bar chart to top 15 categories
   - Fetch only required date ranges
   - Avoid loading all historical data at once

3. **Lazy Loading**:
   - Code-split ChartsView component
   - Load recharts library only when Charts tab is active

4. **Rendering**:
   - Use ResponsiveContainer from Recharts (optimized for resize)
   - Debounce filter changes to avoid excessive re-renders
   - Limit tooltip recalculations

### Bundle Size Impact

- Recharts: ~400KB gzipped
- Mitigation: Tree-shake unused components, lazy load

## Future Enhancements

### Phase 2 Features (Future Iteration)
1. **Export to CSV/PDF**: Download chart data as file
2. **Custom Date Ranges**: Select arbitrary start/end dates
3. **Income Charts**: Toggle to view income breakdown
4. **Tag Filtering**: Filter charts by transaction tags
5. **Merchant Analysis**: Top merchants chart
6. **Savings Goal Tracking**: Compare expenses to budget goals
7. **Year-over-Year Comparison**: Compare same month across multiple years
8. **Pie Chart Alternative**: Optional pie chart view for categories
9. **Print View**: Optimized layout for printing charts

### Technical Debt
- Add comprehensive unit tests for selectors
- Add component tests using React Testing Library
- Document all chart component props with JSDoc
- Add error boundaries around chart components
- Implement chart loading skeletons

## References

- Recharts Documentation: https://recharts.org
- Redux Toolkit Selectors: https://redux-toolkit.js.org/api/createSelector
- Existing History Feature: `/docs/history-search-feature.md`
- Dashboard UI Design: `/docs/dashboard-ui-design.md`
