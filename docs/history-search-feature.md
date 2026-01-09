# History/Search Feature - Technical Documentation

## Feature Overview

The History/Search feature provides users with a comprehensive view of all historical financial transactions, with advanced filtering capabilities and an intuitive grouped interface.

### Key Features

1. **Hierarchical Grouping**: Transactions organized by month (collapsible) and day
2. **Summary Totals**: Display expense totals at both month and day levels
3. **Advanced Filtering**: Search by keyword, date range, category, and amount
4. **Infinite Scroll**: Efficient loading of historical data in batches
5. **Tab Navigation**: Seamless switching between current month view and history

## User Flow

### Primary Flow

```
Dashboard → History Tab → View Grouped Transactions → [Optional] Apply Filters → Browse Results
```

### Detailed User Journey

1. **Access History**
   - User clicks "History" tab in Dashboard
   - System loads last 3 months of transactions (100 records max)
   - Display grouped by month (collapsed by default)

2. **Browse Transactions**
   - User clicks month header to expand
   - System reveals day-grouped transactions within that month
   - Each day shows: date, weekday, day total, and transaction list
   - User can click any transaction to edit (opens FinEditor)

3. **Apply Filters** (Optional)
   - User clicks filter button (top-right)
   - System opens FilterBottomSheet with filter options
   - User configures filters and clicks "Apply"
   - System refreshes results with filtered data

4. **Load More Data**
   - User scrolls to bottom of list (80% threshold)
   - System automatically loads next batch of 100 records
   - Seamlessly appends to existing data

## Architecture

### State Management

#### Redux State Structure

The history feature extends the existing `finSlice` with a new `history` namespace:

```typescript
interface FinState {
  // Existing state
  fins: FinData[];
  currentFin: FinData | null;
  isLoading: boolean;
  error: string | null;
  filters: { ... };

  // New history state
  history: {
    // Data
    data: FinData[];              // Paginated history records
    isLoading: boolean;           // Loading indicator
    error: string | null;         // Error message
    hasMore: boolean;             // Pagination flag
    offset: number;               // Current pagination offset

    // Filters
    searchFilters: {
      keyword?: string;           // Search in merchant/category/comment
      type: "all" | "expense" | "income";
      dateRange: {
        preset: "thisMonth" | "thisYear" | "custom";
        customStart?: string;
        customEnd?: string;
      };
      categories?: string[];      // ["Food:Restaurant", "Travel:Hotel"]
      amountRange?: {
        min?: number;             // Min amount in cents
        max?: number;             // Max amount in cents
      };
    };

    // UI State
    expandedMonths: Set<string>;  // ["2026-01", "2025-12"]
    expandedDays: Set<string>;    // ["2026-01-19", "2026-01-18"]
  };
}
```

#### Why Extend finSlice vs. New Slice?

**Decision: Extend finSlice**

Rationale:
- History data is the same type as current month data (`FinData[]`)
- Avoids data duplication between slices
- Leverages existing infrastructure (thunks, types)
- Maintains consistency with current architecture

### Component Structure

```
Dashboard.tsx
├── TabSwitcher
│   ├── Button: "Current Month"
│   └── Button: "History"
│
├── CurrentMonthView (existing)
│   ├── Stats Cards
│   ├── Filter Bar (all/expense/income)
│   └── ExpenseTile List
│
└── HistoryView (NEW)
    ├── Header
    │   └── FilterButton (with badge)
    │
    ├── ScrollContainer (infinite scroll)
    │   ├── MonthGroup[] (collapsible)
    │   │   ├── MonthHeader
    │   │   │   ├── Month Label ("01 2026")
    │   │   │   ├── Total Amount (red)
    │   │   │   └── Chevron Icon
    │   │   │
    │   │   └── DayGroup[] (when expanded)
    │   │       ├── DayHeader
    │   │       │   ├── Day + Weekday ("19 周日")
    │   │       │   └── Day Total (gray)
    │   │       │
    │   │       └── ExpenseTile[]
    │   │
    │   └── LoadMoreSpinner
    │
    └── FilterBottomSheet (modal)
        ├── Keyword Input
        ├── Date Range Selector
        ├── Category Multi-Select
        ├── Amount Range Inputs
        └── Action Buttons
```

### Data Flow

#### 1. Initial Load

```
User clicks History tab
  → dispatch(fetchHistoryAsync({ limit: 100, offset: 0 }))
  → API: GET /api/fin/list?limit=100&offset=0&dateTo=[now]
  → Redux: Store data in state.fin.history.data
  → Selector: selectHistoryGroupedByMonth groups data
  → Render: MonthGroup components with grouped data
```

#### 2. Filter Application

```
User opens filter, configures, clicks Apply
  → dispatch(applyHistoryFiltersAsync(filters))
  → Calculate dateFrom/dateTo from preset or custom range
  → API: GET /api/fin/list?limit=100&offset=0&type=[type]&dateFrom=[date]&dateTo=[date]
  → Redux: Replace state.fin.history.data, reset offset to 0
  → Selector: Apply client-side filters (keyword, categories, amount)
  → Render: Updated MonthGroup list
```

#### 3. Infinite Scroll

```
User scrolls to 80% of container height
  → Check: hasMore && !isLoading
  → dispatch(loadMoreHistoryAsync())
  → API: GET /api/fin/list?limit=100&offset=[currentOffset + 100]&[...filters]
  → Redux: Append data to state.fin.history.data, increment offset
  → Selector: Re-group all data (existing + new)
  → Render: Extended MonthGroup list
```

#### 4. Expand/Collapse

```
User clicks MonthHeader
  → dispatch(toggleMonthExpanded(monthKey))
  → Redux: Add/remove monthKey from expandedMonths Set
  → Render: Conditional render of DayGroup children
```

## API Integration

### Endpoint: `/api/fin/list`

**Method**: GET

**Query Parameters**:
- `limit` (number, 1-100): Records per request
- `offset` (number, ≥0): Pagination offset
- `type` (string): "expense" | "income" | "all"
- `dateFrom` (string, ISO 8601): Start date
- `dateTo` (string, ISO 8601): End date

**Response**:
```typescript
{
  success: true,
  data: FinData[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

**Usage Strategy**:

| Filter | Application |
|--------|-------------|
| type | Server-side (API param) |
| dateRange | Server-side (converted to dateFrom/dateTo) |
| keyword | Client-side (filter in selector) |
| categories | Client-side (filter in selector) |
| amountRange | Client-side (filter in selector) |

**Why Mixed Strategy?**

- **Server-side**: Date and type filters reduce network payload
- **Client-side**: Complex filters (keyword, multiple categories) avoid API complexity
- **Performance**: With 100-record batches, client-side filtering is fast

## Redux Implementation

### Async Thunks

#### 1. fetchHistoryAsync

```typescript
export const fetchHistoryAsync = createAsyncThunk<
  { data: FinData[]; hasMore: boolean },
  { limit: number; offset: number; filters?: SearchFilters }
>(
  "fin/fetchHistory",
  async ({ limit, offset, filters }) => {
    // Build query params
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    // Add type filter
    if (filters?.type && filters.type !== "all") {
      params.append("type", filters.type);
    }

    // Add date range
    const { dateFrom, dateTo } = calculateDateRange(filters?.dateRange);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    // API call
    const response = await axios.get<ListFinResponse>(
      `/api/fin/list?${params.toString()}`
    );

    return {
      data: response.data.data,
      hasMore: response.data.pagination.hasMore,
    };
  }
);
```

#### 2. loadMoreHistoryAsync

```typescript
export const loadMoreHistoryAsync = createAsyncThunk<
  { data: FinData[]; hasMore: boolean },
  void,
  { state: RootState }
>(
  "fin/loadMoreHistory",
  async (_, { getState }) => {
    const state = getState();
    const { offset, searchFilters } = state.fin.history;

    // Reuse fetchHistoryAsync logic with incremented offset
    return fetchHistoryAsync({
      limit: 100,
      offset: offset + 100,
      filters: searchFilters,
    });
  }
);
```

#### 3. applyHistoryFiltersAsync

```typescript
export const applyHistoryFiltersAsync = createAsyncThunk<
  { data: FinData[]; hasMore: boolean },
  SearchFilters
>(
  "fin/applyHistoryFilters",
  async (filters) => {
    // Reset offset and fetch with new filters
    return fetchHistoryAsync({
      limit: 100,
      offset: 0,
      filters,
    });
  }
);
```

### Reducers

```typescript
const finSlice = createSlice({
  name: "fin",
  initialState,
  reducers: {
    setHistoryFilters(state, action: PayloadAction<Partial<SearchFilters>>) {
      state.history.searchFilters = {
        ...state.history.searchFilters,
        ...action.payload,
      };
    },

    toggleMonthExpanded(state, action: PayloadAction<string>) {
      const monthKey = action.payload;
      if (state.history.expandedMonths.has(monthKey)) {
        state.history.expandedMonths.delete(monthKey);
      } else {
        state.history.expandedMonths.add(monthKey);
      }
    },

    clearHistoryData(state) {
      state.history.data = [];
      state.history.offset = 0;
      state.history.hasMore = true;
    },

    resetHistoryFilters(state) {
      state.history.searchFilters = {
        type: "all",
        dateRange: { preset: "thisYear" },
      };
    },
  },

  extraReducers: (builder) => {
    // fetchHistoryAsync
    builder.addCase(fetchHistoryAsync.pending, (state) => {
      state.history.isLoading = true;
      state.history.error = null;
    });
    builder.addCase(fetchHistoryAsync.fulfilled, (state, action) => {
      state.history.data = action.payload.data;
      state.history.hasMore = action.payload.hasMore;
      state.history.isLoading = false;
    });
    builder.addCase(fetchHistoryAsync.rejected, (state, action) => {
      state.history.error = action.error.message || "Failed to load history";
      state.history.isLoading = false;
    });

    // loadMoreHistoryAsync
    builder.addCase(loadMoreHistoryAsync.fulfilled, (state, action) => {
      state.history.data.push(...action.payload.data);
      state.history.hasMore = action.payload.hasMore;
      state.history.offset += 100;
    });

    // applyHistoryFiltersAsync
    builder.addCase(applyHistoryFiltersAsync.pending, (state) => {
      state.history.isLoading = true;
    });
    builder.addCase(applyHistoryFiltersAsync.fulfilled, (state, action) => {
      state.history.data = action.payload.data;
      state.history.hasMore = action.payload.hasMore;
      state.history.offset = 0;
      state.history.isLoading = false;
    });
  },
});
```

### Selectors

#### selectFilteredHistory

```typescript
export const selectFilteredHistory = createSelector(
  [
    (state: RootState) => state.fin.history.data,
    (state: RootState) => state.fin.history.searchFilters,
  ],
  (data, filters) => {
    return data.filter((fin) => {
      // Keyword filter
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const matches = [
          fin.merchant,
          fin.category,
          fin.subcategory,
          fin.comment,
        ].some((field) => field?.toLowerCase().includes(keyword));

        if (!matches) return false;
      }

      // Categories filter
      if (filters.categories && filters.categories.length > 0) {
        const finCat = `${fin.category}:${fin.subcategory}`;
        if (!filters.categories.includes(finCat)) return false;
      }

      // Amount range filter
      if (filters.amountRange) {
        const amount = fin.amountCadCents;
        if (filters.amountRange.min && amount < filters.amountRange.min) {
          return false;
        }
        if (filters.amountRange.max && amount > filters.amountRange.max) {
          return false;
        }
      }

      return true;
    });
  }
);
```

#### selectHistoryGroupedByMonth

```typescript
interface DayGroup {
  dayKey: string;        // "2026-01-19"
  date: Date;
  fins: FinData[];
  totalCents: number;
}

interface MonthGroup {
  monthKey: string;      // "2026-01"
  days: DayGroup[];
  totalCents: number;
}

export const selectHistoryGroupedByMonth = createSelector(
  [selectFilteredHistory],
  (fins): MonthGroup[] => {
    const monthMap = new Map<string, Map<string, FinData[]>>();

    // Group by month, then by day
    fins.forEach((fin) => {
      const date = fin.isScheduled && fin.scheduledOn ? fin.scheduledOn : fin.date;
      const monthKey = date.substring(0, 7);  // "2026-01"
      const dayKey = date.substring(0, 10);   // "2026-01-19"

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map());
      }

      const dayMap = monthMap.get(monthKey)!;
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }

      dayMap.get(dayKey)!.push(fin);
    });

    // Convert to array and calculate totals
    return Array.from(monthMap.entries())
      .map(([monthKey, dayMap]) => {
        const days = Array.from(dayMap.entries())
          .map(([dayKey, fins]) => ({
            dayKey,
            date: new Date(dayKey),
            fins,
            totalCents: fins.reduce(
              (sum, fin) =>
                sum + (fin.type === "expense" ? fin.amountCadCents : -fin.amountCadCents),
              0
            ),
          }))
          .sort((a, b) => b.dayKey.localeCompare(a.dayKey)); // Newest first

        return {
          monthKey,
          days,
          totalCents: days.reduce((sum, day) => sum + day.totalCents, 0),
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Newest first
  }
);
```

## Filter Implementation

### Date Range Calculation

```typescript
function calculateDateRange(
  dateRange?: SearchFilters["dateRange"]
): { dateFrom?: string; dateTo?: string } {
  if (!dateRange) return {};

  const now = new Date();

  switch (dateRange.preset) {
    case "thisMonth":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        dateFrom: startOfMonth.toISOString(),
        dateTo: now.toISOString(),
      };

    case "thisYear":
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        dateFrom: startOfYear.toISOString(),
        dateTo: now.toISOString(),
      };

    case "custom":
      return {
        dateFrom: dateRange.customStart,
        dateTo: dateRange.customEnd,
      };

    default:
      return {};
  }
}
```

### Filter Count Badge

```typescript
export const selectHistoryFilterCount = createSelector(
  [(state: RootState) => state.fin.history.searchFilters],
  (filters): number => {
    let count = 0;

    if (filters.keyword) count++;
    if (filters.type !== "all") count++;
    if (filters.dateRange.preset !== "thisYear") count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.amountRange?.min || filters.amountRange?.max) count++;

    return count;
  }
);
```

## Performance Considerations

### 1. Pagination

- **Batch Size**: 100 records per request
- **Initial Load**: Last 3 months (typically 50-200 transactions)
- **Avoids**: Loading thousands of records at once

### 2. Memoization

- **Reselect**: All selectors use `createSelector` for memoization
- **Prevents**: Unnecessary recalculations of grouping logic
- **Benefit**: Smooth UI even with large datasets

### 3. Collapsed UI State

- **Strategy**: Only render day groups when month is expanded
- **Impact**: Minimizes DOM nodes (from thousands to hundreds)
- **Trade-off**: Slight delay when expanding (acceptable)

### 4. Virtual Scrolling

- **Status**: Not implemented in v1
- **Rationale**: 100 ExpenseTile components render fast (<100ms)
- **Future**: Consider if users report performance issues

### 5. Debouncing

- **Keyword Search**: Debounce input by 300ms before filtering
- **Prevents**: Excessive selector calls on every keystroke

## Edge Cases

### 1. Empty States

| Scenario | UI |
|----------|-----|
| No transactions at all | Icon + "No transactions found" |
| Filters return 0 results | "No results. Try adjusting filters." + Clear button |
| No transactions in a day/month | Don't render empty groups |

### 2. Loading States

| Scenario | UI |
|----------|-----|
| Initial load | Full-page spinner in HistoryView |
| Load more (infinite scroll) | Small spinner at bottom |
| Filter application | Brief overlay spinner |

### 3. Error States

| Scenario | Action |
|----------|---------|
| Network error | Show error message + Retry button |
| API error (500) | Show generic error + Retry button |
| Unauthorized (401) | Redirect to login |

### 4. Timezone Handling

- **Server**: Returns UTC dates (ISO 8601 with Z)
- **Client**: Parses with `new Date()` (auto-converts to local)
- **Grouping**: Uses local date for month/day keys
- **Display**: Shows local time in ExpenseTile

Example:
```
Server: "2026-01-19T23:00:00Z"
Local (PST): 2026-01-19 15:00:00
Group: "2026-01-19" (correct local date)
```

### 5. Large Datasets

- **Scenario**: User has 10,000+ transactions
- **Mitigation**:
  - Pagination (only load 100 at a time)
  - Collapsed months (minimize rendered tiles)
  - Date filters (reduce query scope)
- **Performance**: Should remain smooth

## Testing Checklist

### Functional Tests

- [ ] Tab switching between Current Month and History
- [ ] Initial history load (100 records)
- [ ] Month expand/collapse
- [ ] Day grouping displays correctly
- [ ] Totals calculated correctly (month and day)
- [ ] ExpenseTile click opens FinEditor
- [ ] Filter bottom sheet opens/closes
- [ ] Keyword filter works
- [ ] Date range presets work (This Month, This Year)
- [ ] Custom date range works
- [ ] Category multi-select works
- [ ] Amount range filter works
- [ ] Filter reset clears all filters
- [ ] Filter badge shows correct count
- [ ] Infinite scroll loads more data
- [ ] Loading spinners display correctly
- [ ] Empty states display correctly
- [ ] Error handling works

### Performance Tests

- [ ] Large dataset (1000+ records) loads smoothly
- [ ] Scrolling is smooth with 100+ tiles
- [ ] Filtering is fast (<500ms)
- [ ] Grouping selector doesn't recalculate unnecessarily
- [ ] No memory leaks with repeated filtering

### Cross-Browser Tests

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Accessibility Tests

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Screen reader announces groups and totals
- [ ] Color contrast meets WCAG AA

## Future Enhancements

### Phase 2 (Potential)

1. **Export Functionality**
   - Export filtered results to CSV
   - Export to PDF with grouping preserved
   - Email export link

2. **Saved Searches**
   - Save filter configurations
   - Quick access to common searches
   - Recent searches history

3. **Visualization**
   - Spending trends chart
   - Category breakdown pie chart
   - Month-over-month comparison

4. **Advanced Filters**
   - Tags filter
   - Person filter (for shared expenses)
   - Currency filter
   - Scheduled vs non-scheduled

5. **Search Enhancements**
   - Full-text search with highlighting
   - Search suggestions
   - Search by amount (exact match)

6. **Performance Optimizations**
   - Virtual scrolling for 1000+ records
   - Background data prefetching
   - Optimistic UI updates

### Phase 3 (Long-term)

1. **Offline Support**
   - Cache recent history
   - Offline search in cached data

2. **Bulk Actions**
   - Multi-select transactions
   - Bulk edit (category, tags)
   - Bulk delete

3. **Smart Filtering**
   - AI-powered search ("dining in December")
   - Automatic category suggestions
   - Anomaly detection (unusual spending)

## References

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Reselect Memoization](https://github.com/reduxjs/reselect)
- [Infinite Scroll Best Practices](https://web.dev/infinite-scroll/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-08 | 1.0.0 | Initial documentation for history/search feature |
