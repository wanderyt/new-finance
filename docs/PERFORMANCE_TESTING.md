# Performance Testing Guide

## Search View Performance Testing

This guide explains how to test the performance difference between fetching all records at once vs. paginated fetching (100 records per request).

### Background

The search/history view has two methods for fetching data:

1. **Paginated Fetching** (Current Production Method)
   - Endpoint: `/api/fin/list`
   - Max 100 records per request
   - Multiple requests made sequentially when client-side filters are applied
   - Implemented in: `applyHistoryFiltersAsync` thunk

2. **Fetch All** (Performance Testing Method)
   - Endpoint: `/api/fin/list/all`
   - No pagination limit - returns all matching records in a single request
   - Implemented in: `fetchAllHistoryAsync` thunk

### API Endpoints

#### Paginated Endpoint
```
GET /api/fin/list?limit=100&offset=0&type=all&dateFrom=&dateTo=
```

**Query Parameters:**
- `limit` (optional, default: 20, max: 100) - Number of records to return
- `offset` (optional, default: 0) - Number of records to skip
- `type` (optional, default: "all") - Filter by type: "expense" | "income" | "all"
- `dateFrom` (optional) - ISO 8601 date string with UTC timezone
- `dateTo` (optional, default: current date/time) - ISO 8601 date string with UTC timezone

#### Fetch All Endpoint
```
GET /api/fin/list/all?type=all&dateFrom=&dateTo=
```

**Query Parameters:**
- `type` (optional, default: "all") - Filter by type: "expense" | "income" | "all"
- `dateFrom` (optional) - ISO 8601 date string with UTC timezone
- `dateTo` (optional, default: current date/time) - ISO 8601 date string with UTC timezone

**⚠️ Warning:** This endpoint can return very large datasets and should only be used for performance testing.

### Redux Integration

Two async thunks are available for testing:

#### 1. Paginated Approach (Production)
```typescript
import { applyHistoryFiltersAsync } from '@/app/lib/redux/features/fin/finSlice';

// Fetches in batches of 100 when client-side filters are applied
dispatch(applyHistoryFiltersAsync({
  type: 'all',
  dateRange: { preset: 'all' }
}));
```

#### 2. Fetch All Approach (Testing)
```typescript
import { fetchAllHistoryAsync } from '@/app/lib/redux/features/fin/finSlice';

// Fetches all records in a single request
dispatch(fetchAllHistoryAsync({
  type: 'all',
  dateRange: { preset: 'all' }
}));
```

### How to Perform Performance Testing

#### Method 1: Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to the **Network** tab
3. Clear network log
4. Trigger the data fetch (apply filters in search view)
5. Measure:
   - Total request time
   - Number of requests made
   - Total data transferred
   - Time to Interactive (TTI)

#### Method 2: Console Timing

Add timing code in your component:

```typescript
// Test paginated approach
console.time('Paginated Fetch');
await dispatch(applyHistoryFiltersAsync(filters));
console.timeEnd('Paginated Fetch');

// Test fetch all approach
console.time('Fetch All');
await dispatch(fetchAllHistoryAsync(filters));
console.timeEnd('Fetch All');
```

#### Method 3: Performance API

```typescript
const perfStart = performance.now();
await dispatch(fetchAllHistoryAsync(filters));
const perfEnd = performance.now();
console.log(`Fetch completed in ${perfEnd - perfStart}ms`);
```

### Metrics to Compare

When comparing the two approaches, measure:

1. **Network Performance**
   - Total request time
   - Number of HTTP requests
   - Total bytes transferred
   - Time to First Byte (TTFB)

2. **Client Performance**
   - Time to process data
   - Memory usage
   - UI rendering time
   - Scroll performance (after data loads)

3. **User Experience**
   - Time to display first results
   - Loading state duration
   - Perceived performance

### Expected Trade-offs

#### Paginated Approach (100 records/request)
**Pros:**
- Lower memory usage per request
- Faster initial response
- Better for large datasets (10,000+ records)
- Progressive loading possible

**Cons:**
- Multiple HTTP requests (latency overhead)
- Sequential waterfall effect
- More complex state management

#### Fetch All Approach
**Pros:**
- Single HTTP request (less latency overhead)
- Simpler implementation
- Faster for small-medium datasets (< 5,000 records)

**Cons:**
- Higher memory usage
- Longer initial wait time
- Database query may be slower
- Can overwhelm client with large datasets

### Test Scenarios

Test with different dataset sizes:

1. **Small Dataset** (< 500 records)
   - Expected: Fetch all should be faster

2. **Medium Dataset** (500-2,000 records)
   - Expected: Similar performance, fetch all might be slightly faster

3. **Large Dataset** (2,000-10,000 records)
   - Expected: Paginated might be better for UX (progressive loading)

4. **Very Large Dataset** (10,000+ records)
   - Expected: Paginated approach is strongly recommended

### Implementation Example

To temporarily switch to the fetch all approach for testing:

```typescript
// In your component (e.g., FilterBottomSheet.tsx)

// Current (paginated):
dispatch(applyHistoryFiltersAsync(filters));

// For testing (fetch all):
dispatch(fetchAllHistoryAsync(filters));
```

### Cleanup

After performance testing is complete:
- Remove any test timing code
- Revert to the production paginated approach
- The `/api/fin/list/all` endpoint can remain for future testing

### Notes

- The fetch all endpoint uses the same authentication and authorization
- Both endpoints return the same data structure (`ListFinResponse`)
- Client-side filtering (keyword, categories, amount range) works the same for both approaches
- Consider your database size and growth projections when choosing an approach
