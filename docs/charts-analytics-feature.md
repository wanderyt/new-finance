# Charts/Analytics Feature - Technical Documentation

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
    drilldownCategory?: string;
    selectedCategoryForList?: string;
    selectedSubcategoryForList?: string;
    comparisonMonth1?: string;
    comparisonMonth2?: string;
  };
}
```

**Redux Actions**:
- `setChartsViewMode(mode)` - Switch between month/year filtering
- `setChartsSelectedMonth(month)` - Set selected month for filtering
- `setChartsSelectedYear(year)` - Set selected year for filtering
- `setChartsDrilldownCategory(category)` - Drill into category to show subcategories
- `setChartsCategoryForList(category, subcategory)` - Show expense list for category
- `setChartsComparisonMonths(month1, month2)` - Set months for line chart comparison
- `clearChartsCategorySelection()` - Clear drill-down and expense list

**Redux Selectors**:
- `selectChartsViewMode` - Get current view mode (month/year)
- `selectChartsFilteredFins` - Get transactions filtered by selected month/year + expenses only
- `selectCategoryChartData` - Get aggregated category/subcategory data for bar chart
- `selectMonthComparisonData` - Get daily accumulated totals for two months
- `selectCategoryExpenseList` - Get transactions for selected category
- `selectAvailableMonths` - Extract unique months from transactions
- `selectAvailableYears` - Extract unique years from transactions
- `selectChartsDrilldownCategory` - Get current drill-down category (if any)
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
    │   ├── CategoryBreadcrumb (when drilled down)
    │   ├── CategoryBarChart (Recharts BarChart)
    │   └── CategoryExpenseList (conditional)
    │       └── ExpenseTile[] (reused component)
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
- Pass onFinClick to CategoryExpenseList

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

### 5. CategoryExpenseList.tsx

**Purpose**: Display transaction list for selected category

**Props**:
```typescript
interface CategoryExpenseListProps {
  category: string;
  subcategory?: string;
  transactions: FinData[];
  onFinClick: (fin: FinData) => void;
  onClear: () => void;
}
```

**Features**:
- Header showing category/subcategory name + count + total
- List of ExpenseTile components (reused from Dashboard)
- Clear button (X icon) to hide list
- Sorted by date descending (most recent first)

**Example Header**:
```
Category: Food > Groceries - 12 transactions ($456.78)  [X]
```

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

   └→ CategoryBarChart
      └→ Selector: selectCategoryChartData (filters + aggregates)
      └→ User clicks bar → dispatch(setChartsDrilldownCategory("Food"))
      └→ Selector re-computes → Shows subcategories for "Food"

   └→ CategoryExpenseList (conditional)
      └→ Selector: selectCategoryExpenseList
      └→ User clicks transaction → onFinClick(fin) → Opens FinEditor

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
selectChartsFilteredFins (filter by month/year + expenses only)
  ↓
┌─────────────────────────┬─────────────────────────────┐
│ selectCategoryChartData │ selectMonthComparisonData   │
│ (group by category)     │ (accumulate by day)         │
└─────────────────────────┴─────────────────────────────┘
  ↓                         ↓
CategoryBarChart          MonthComparisonLineChart
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

```typescript
// Top-level categories (no drilldown)
const categories = fins.reduce((acc, fin) => {
  const category = fin.category || "Uncategorized";
  if (!acc[category]) {
    acc[category] = { totalCents: 0, count: 0 };
  }
  acc[category].totalCents += fin.amountCadCents;
  acc[category].count += 1;
  return acc;
}, {} as Record<string, { totalCents: number; count: number }>);

// Convert to array and sort
const chartData = Object.entries(categories)
  .map(([category, data]) => ({
    category,
    totalCents: data.totalCents,
    count: data.count,
  }))
  .sort((a, b) => b.totalCents - a.totalCents)
  .slice(0, 15); // Top 15
```

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
