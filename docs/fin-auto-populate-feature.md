# Historical Data Auto-Populate Feature

## Overview

This feature allows users to quickly populate expense/income form fields based on their previous transactions with the same merchant. When a user selects a merchant from the dropdown, a half-sheet modal appears showing grouped historical data (categories, places & cities, details) that the user can select from.

## User Experience Flow

1. User types "Air Canada" in the merchant field
2. User clicks "Air Canada" from the SearchableSelect dropdown
3. Half-sheet modal appears with sections grouped by field type:
   - **Categories**: Dropdown with unique category + subcategory pairs (max 10)
   - **Places & Cities**: Dropdown with unique place + city pairs (max 10)
   - **Details**: Dropdown with unique detail notes (max 10)
4. User selects desired values from dropdowns (single selection per section, optional)
5. User clicks "确定" (Confirm) to populate form fields, or "取消" (Cancel) to dismiss
6. Selected values auto-fill the corresponding form fields

## Design Reference

The feature is based on the design mockup at [design/fin-populate.png](../design/fin-populate.png). The implementation uses:
- Form in background with merchant field showing "Air Canada"
- Half-sheet overlay with title "Choose Details"
- Three dropdown sections for categories, locations, and details (single selection per section)
- "确定" (Confirm) and "取消" (Cancel) buttons at bottom

## Technical Architecture

### 1. API Endpoint: Historical Data Retrieval

**Endpoint**: `GET /api/fin/history?merchant={merchantName}`

**Location**: [app/api/fin/history/route.ts](../app/api/fin/history/route.ts)

**Purpose**: Fetch grouped historical data for a specific merchant, limited to 10 unique values per field type.

**Authentication**: Uses `withAuth` middleware to ensure user isolation.

**Database Query Strategy**:
The endpoint executes three parallel queries using `Promise.all`:

1. **Categories Query**:
   ```sql
   SELECT DISTINCT category, subcategory
   FROM fin
   WHERE userId = ? AND merchant = ?
   AND category IS NOT NULL
   ORDER BY date DESC
   LIMIT 10
   ```

2. **Places & Cities Query**:
   ```sql
   SELECT DISTINCT place, city
   FROM fin
   WHERE userId = ? AND merchant = ?
   AND (place IS NOT NULL OR city IS NOT NULL)
   ORDER BY date DESC
   LIMIT 10
   ```

3. **Details Query**:
   ```sql
   SELECT DISTINCT details
   FROM fin
   WHERE userId = ? AND merchant = ?
   AND details IS NOT NULL
   ORDER BY date DESC
   LIMIT 10
   ```

**Performance Optimization**: Leverages existing database index `idx_fin_user_merchant` on (userId, merchant) for efficient queries.

**Response Format**:
```typescript
{
  success: true,
  data: {
    merchant: "Air Canada",
    categories: [
      { category: "旅游", subcategory: "交通" },
      { category: "生活用品", subcategory: "其他" }
    ],
    locations: [
      { place: "选座位", city: "上海" },
      { place: "平台 / 商场", city: "Toronto" }
    ],
    details: [
      "YYZ to PVG flight",
      "Seat upgrade"
    ]
  }
}
```

**Error Handling**:
- Missing merchant parameter: `400 Bad Request`
- Empty merchant string: `400 Bad Request`
- No historical data: `200 OK` with empty arrays
- Database errors: `500 Server Error`

### 2. UI Component: HistoricalDataSheet

**Location**: [app/components/dashboard/HistoricalDataSheet.tsx](../app/components/dashboard/HistoricalDataSheet.tsx)

**Purpose**: Display grouped historical data with single-select dropdowns in a bottom sheet modal.

**Component Structure**:
```
BottomSheet (reused container)
└─ Content
   ├─ Header: "Choose Details" + Close Button (X)
   ├─ Loading State (spinner while fetching)
   ├─ Empty State ("没有历史记录")
   └─ Data Sections
      ├─ Categories Section ("分类")
      │  └─ Dropdown for category + subcategory (single selection)
      ├─ Places & Cities Section ("地点")
      │  └─ Dropdown for place + city (single selection)
      ├─ Details Section ("详细说明")
      │  └─ Dropdown for detail text (single selection)
      └─ Action Buttons (确定 / 取消)
```

**Props Interface**:
```typescript
interface HistoricalDataSheetProps {
  isOpen: boolean;
  merchant: string;
  onConfirm: (selections: HistoricalDataItem[]) => void;
  onCancel: () => void;
}

interface HistoricalDataItem {
  type: 'category' | 'location' | 'detail';
  category?: string;
  subcategory?: string;
  place?: string;
  city?: string;
  detail?: string;
}
```

**Key Features**:
- Single-select dropdowns (one selection per section, optional - users can skip sections with "不选择" option)
- Touch-friendly sizing for mobile devices
- Framer Motion animations (inherited from BottomSheet)
- Keyboard navigation support (ESC to close)
- Loading state while fetching data
- Empty state when no historical data exists

### 3. SearchableSelect Enhancement

**Location**: [app/components/ui-kit/SearchableSelect.tsx](../app/components/ui-kit/SearchableSelect.tsx)

**Change**: Add optional callback prop for when an option is selected from dropdown.

**New Prop**:
```typescript
interface SearchableSelectProps {
  // ... existing props
  onOptionSelected?: (value: string) => void; // NEW
}
```

**Behavior**:
- Callback fires ONLY when user clicks an option from dropdown
- Does NOT fire when user types a custom value
- Maintains backward compatibility (optional prop)

### 4. FinEditorForm Integration

**Location**: [app/components/dashboard/FinEditorForm.tsx](../app/components/dashboard/FinEditorForm.tsx)

**State Additions**:
```typescript
const [showHistoricalDataSheet, setShowHistoricalDataSheet] = useState(false);
const [selectedMerchantForHistory, setSelectedMerchantForHistory] = useState("");
```

**New Handler Functions**:

1. **handleMerchantSelected**: Triggered when user selects merchant from dropdown
   - Sets merchant value
   - Opens historical data modal

2. **handleHistoricalDataConfirm**: Triggered when user confirms selections
   - Populates form fields based on selected items
   - Closes modal

3. **handleHistoricalDataCancel**: Triggered when user cancels
   - Closes modal without changes

**Integration Point**: Add `onOptionSelected={handleMerchantSelected}` prop to the merchant SearchableSelect component.

## Data Flow

```
User selects merchant
    ↓
SearchableSelect.handleOptionClick()
    ↓
onOptionSelected callback
    ↓
FinEditorForm.handleMerchantSelected()
    ↓
Opens HistoricalDataSheet modal
    ↓
HistoricalDataSheet fetches data from /api/fin/history
    ↓
User selects values via dropdowns
    ↓
User clicks 确定 (Confirm)
    ↓
HistoricalDataSheet.onConfirm() called
    ↓
FinEditorForm.handleHistoricalDataConfirm()
    ↓
Form fields populated with selected values
```

## Edge Cases & Handling

### No Historical Data
- **Scenario**: User selects a merchant with no previous transactions
- **Handling**: Display empty state message "没有历史记录", show only Cancel button

### Null/Empty Values
- **Scenario**: Database contains null or empty strings
- **Handling**: Use `IS NOT NULL` in SQL queries, filter empty strings in JavaScript

### Duplicate Detection
- **Scenario**: Same merchant used with identical values multiple times
- **Handling**: Use SQL `DISTINCT` keyword, create unique keys for rendering

### User Types New Merchant
- **Scenario**: User types a merchant name not in dropdown (custom value)
- **Handling**: Modal does NOT appear (callback not triggered), user continues normally

### Single Selection Per Section
- **Scenario**: User selects from dropdown in each section
- **Handling**: Only one selection allowed per section (category, location, or detail). Users can optionally skip sections by selecting "不选择".

### Loading States
- **Scenario**: API call takes time to fetch data
- **Handling**: Show loading spinner, disable confirm button during loading

### API Errors
- **Scenario**: Network error or server error
- **Handling**: Display error message, show cancel button to close modal

## Performance Considerations

### Database Optimization
- Leverages existing index: `idx_fin_user_merchant` on (userId, merchant)
- `LIMIT 10` prevents large result sets
- `Promise.all` executes three queries in parallel (reduces total time)
- Parameterized queries prevent SQL injection

### API Response Size
- Maximum 30 items total (10 per section)
- Estimated response size: 3-5 KB (lightweight)
- Fast loading even on slow connections

### Frontend Performance
- Maximum 3 dropdown components (one per section)
- Framer Motion animations already optimized
- Efficient React rendering with unique keys

## Security Considerations

### User Data Isolation
- All queries filter by `userId` to ensure users only see their own data
- `withAuth` middleware validates JWT token before processing requests

### Input Validation
- Merchant parameter validated (not empty, reasonable length)
- URL encoding prevents injection attacks
- Parameterized queries prevent SQL injection

## Testing Strategy

### Manual Testing Scenarios

1. **Happy Path**:
   - Create 3-5 transactions for "Air Canada" with varied data
   - Select "Air Canada" from dropdown
   - Verify modal appears with grouped dropdown sections
   - Select values from dropdowns (one per section), click 确定
   - Verify form fields populated correctly

2. **Empty State**:
   - Type a new merchant "XYZ Corp"
   - Select from dropdown
   - Verify modal shows "没有历史记录"

3. **Partial Data**:
   - Create transaction with merchant + category but no place/details
   - Select that merchant
   - Verify only categories section appears

4. **Multi-User Isolation**:
   - Log in as different users
   - Verify each user only sees their own historical data

5. **Performance Test**:
   - Create 50+ transactions for same merchant
   - Verify API response time < 500ms
   - Verify only 10 unique values per section

### Integration Testing
- Test in development mode: `yarn dev`
- Test production build: `yarn build && yarn start`
- Verify no console errors
- Test on mobile viewport (responsive design)
- Test keyboard navigation (ESC to close, Tab navigation)

## Type Definitions

**Location**: [app/lib/types/api.ts](../app/lib/types/api.ts)

```typescript
// Historical data API response
export interface HistoricalDataResponse {
  success: boolean;
  data: {
    merchant: string;
    categories: Array<{
      category: string;
      subcategory: string;
    }>;
    locations: Array<{
      place: string;
      city: string;
    }>;
    details: string[];
  };
}

// Historical data item for form population
export interface HistoricalDataItem {
  type: 'category' | 'location' | 'detail';
  category?: string;
  subcategory?: string;
  place?: string;
  city?: string;
  detail?: string;
}
```

## Implementation Checklist

### Phase 1: Backend (API Endpoint)
- [ ] Add type definitions to [app/lib/types/api.ts](../app/lib/types/api.ts)
- [ ] Create [app/api/fin/history/route.ts](../app/api/fin/history/route.ts)
- [ ] Implement authentication with `withAuth` middleware
- [ ] Implement validation for merchant parameter
- [ ] Implement three parallel database queries
- [ ] Test with curl/Postman

### Phase 2: UI Component
- [ ] Create [app/components/dashboard/HistoricalDataSheet.tsx](../app/components/dashboard/HistoricalDataSheet.tsx)
- [ ] Implement loading state
- [ ] Implement empty state
- [ ] Implement data display with dropdowns
- [ ] Add dropdown selection logic (single-select per section)
- [ ] Style to match design reference
- [ ] Add action buttons (确定 / 取消)

### Phase 3: Integration
- [ ] Update [app/components/ui-kit/SearchableSelect.tsx](../app/components/ui-kit/SearchableSelect.tsx)
- [ ] Add `onOptionSelected` optional prop
- [ ] Update [app/components/dashboard/FinEditorForm.tsx](../app/components/dashboard/FinEditorForm.tsx)
- [ ] Add state variables for modal
- [ ] Add handler functions
- [ ] Wire up merchant selection trigger
- [ ] Add HistoricalDataSheet component to form JSX

### Phase 4: Testing & Polish
- [ ] Test happy path (select merchant, choose values, verify population)
- [ ] Test empty state (new merchant with no history)
- [ ] Test partial data (merchant with incomplete data)
- [ ] Test multi-user isolation
- [ ] Test performance (50+ transactions)
- [ ] Test error handling (network errors, server errors)
- [ ] Verify keyboard navigation and accessibility
- [ ] Test on mobile viewport

## Critical Files

**New Files**:
- [app/api/fin/history/route.ts](../app/api/fin/history/route.ts) - API endpoint
- [app/components/dashboard/HistoricalDataSheet.tsx](../app/components/dashboard/HistoricalDataSheet.tsx) - Modal component

**Modified Files**:
- [app/components/ui-kit/SearchableSelect.tsx](../app/components/ui-kit/SearchableSelect.tsx) - Add callback prop
- [app/components/dashboard/FinEditorForm.tsx](../app/components/dashboard/FinEditorForm.tsx) - Integration logic
- [app/lib/types/api.ts](../app/lib/types/api.ts) - Type definitions

**Referenced Files** (no changes):
- [app/components/ui-kit/BottomSheet.tsx](../app/components/ui-kit/BottomSheet.tsx) - Reused modal container
- [app/lib/db/schema.ts](../app/lib/db/schema.ts) - Database schema (existing index)
- [design/fin-populate.png](../design/fin-populate.png) - Design reference

## Future Enhancements

1. **Smart Sorting**: Sort suggestions by frequency or recency
2. **Fuzzy Matching**: Suggest similar merchant names (e.g., "Air Canada" and "AirCanada")
3. **Recent Items Highlight**: Mark recently used values with a badge
4. **Quick Select All**: Button to quickly select most common combination
5. **History Analytics**: Show how many times each value was used
6. **Keyboard Shortcuts**: Add keyboard shortcuts for quick selection (1-9 keys)
7. **AI Suggestions**: Use ML to predict most likely values based on context
