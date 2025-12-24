# Dashboard UI Design Documentation

**Last Updated:** December 23, 2025
**Branch:** `dashboard-ui`
**Status:** Implementation Complete

## Overview

This document tracks the dashboard UI redesign focused on expense tracking functionality. The redesign transforms the dashboard from a general-purpose financial overview to a dedicated expense tracking interface with enhanced usability and modern design patterns.

## Design Goals

1. **Expense-Focused Interface** - Shift focus from mixed transactions to expense tracking
2. **Search Capability** - Add search functionality for filtering expenses (UI ready, functionality pending)
3. **Improved Navigation** - Streamline access to logout and add-expense actions
4. **Reusable Components** - Create modular components for future features
5. **Maintain Consistency** - Keep existing design language (Zinc color palette, dark mode, typography)

## Changes Summary

### New Components

#### ExpenseTile Component
**File:** `app/components/dashboard/ExpenseTile.tsx`

A reusable tile component for displaying detailed expense information.

**Purpose:**
- Display expense items in dashboard list
- Reusable for search results and other expense lists
- Support scheduled/recurring expenses
- Show currency exchange information

**Props Interface:**
```typescript
interface ExpenseTileProps {
  category: string;           // e.g., "Food & Dining"
  subcategory?: string;       // e.g., "Restaurant"
  merchant: string;           // e.g., "Starbucks"
  place: string;             // e.g., "San Francisco, CA"
  isScheduled: boolean;      // Recurring expense flag
  amount: string;            // e.g., "-$45.00"
  currency: string;          // e.g., "USD"
  exchangeInfo?: {           // Optional exchange rates
    cny?: string;           // e.g., "¥324.00"
    usd?: string;           // e.g., "$45.00"
  };
}
```

**Visual Structure:**
```
┌─────────────────────────────────────────────────┐
│ Category › Subcategory          -$127.50    ℹ️  │
│ Merchant Name                   USD            │
│ Location • [Scheduled]                         │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Left-right flex layout
- Category hierarchy with highlighted subcategory (blue accent)
- Scheduled badge for recurring expenses
- Exchange rate tooltip on info icon
- Hover state for better interaction feedback
- Full dark mode support
- Responsive and accessible

### Modified Components

#### Dashboard Component
**File:** `app/components/dashboard/Dashboard.tsx`

Complete restructure of the main dashboard layout.

**Before:**
- Welcome message header with logout button (right)
- Welcome card with username
- Stats grid (Total Balance, This Month)
- Recent Activity (mixed income/expenses)
- Quick Actions buttons

**After:**
- Search bar with logout icon (top-left)
- Stats grid (unchanged)
- Expenses list (using ExpenseTile component)
- Floating Action Button (FAB) for adding expenses

## Layout Changes

### Header Section

**Before:**
```tsx
<header>
  <h1>Welcome, {username}!</h1>
  <Button>Logout</Button>
</header>
```

**After:**
```tsx
<header>
  <button aria-label="Logout"> {/* Top-left, absolute positioned */}
    <svg>{/* Logout icon */}</svg>
  </button>
  <Input placeholder="Search expenses..." /> {/* Centered */}
</header>
```

**Changes:**
- Removed welcome message
- Logout moved to icon button (top-left)
- Added search input (full-width, centered)
- Search is UI placeholder (functionality pending)

### Main Content

**Before:**
```
┌─────────────────────────┐
│ Welcome Card            │
├─────────────────────────┤
│ Stats Grid              │
├─────────────────────────┤
│ Recent Activity         │
│ • Income/Expense mix    │
├─────────────────────────┤
│ Quick Actions Buttons   │
└─────────────────────────┘
```

**After:**
```
┌─────────────────────────┐
│ Stats Grid              │
├─────────────────────────┤
│ Expenses                │
│ • ExpenseTile items     │
│ • Category hierarchy    │
│ • Exchange info         │
│                    [+]  │ ← FAB
└─────────────────────────┘
```

**Changes:**
- Removed Welcome Card (reduce clutter)
- Kept Stats Grid (Total Balance, This Month)
- Replaced Recent Activity with Expenses section
- Removed Quick Actions buttons
- Added Floating Action Button (FAB)

### Floating Action Button (FAB)

**Position:** Fixed bottom-right corner
**Purpose:** Quick access to add new expense
**Styling:**
- Circular button (56px × 56px)
- Blue background (blue-600/500)
- Plus icon (+)
- Shadow with hover elevation
- Focus ring for accessibility
- z-index: 20 (above content)

**Current Behavior:**
- Logs to console: "Add expense clicked - will open bottom sheet"
- Future: Will trigger bottom sheet modal with expense entry form

## Data Structure Changes

### Before (Recent Activity)
```typescript
{
  label: string;    // "Grocery Store" or "Salary Deposit"
  amount: string;   // "+$3,500" or "-$127.50"
  date: string;     // "Dec 19"
}
```

### After (Expenses)
```typescript
{
  category: string;        // "Food & Dining"
  subcategory?: string;    // "Groceries"
  merchant: string;        // "Whole Foods"
  place: string;          // "San Francisco, CA"
  isScheduled: boolean;   // true/false
  amount: string;         // "-$127.50"
  currency: string;       // "USD"
  exchangeInfo?: {        // Optional
    cny?: string;        // "¥920.00"
    usd?: string;        // "$127.50"
  }
}
```

**Key Improvements:**
- Structured category hierarchy
- Location tracking (place)
- Scheduled/recurring flag
- Currency specification
- Exchange rate information

## Sample Data

Current implementation includes 6 expense items:

1. **Whole Foods** - Food & Dining › Groceries (-$127.50, exchange info)
2. **PG&E** - Utilities › Electricity (-$85.20, scheduled)
3. **Chevron** - Transportation › Gas (-$45.00)
4. **Tartine Bakery** - Food & Dining › Restaurant (-$68.90, exchange info)
5. **Blue Bottle Coffee** - Food & Dining › Coffee Shop (-$12.50)
6. **Walgreens** - Healthcare › Pharmacy (-$34.25)

**Categories Used:**
- Food & Dining
- Utilities
- Transportation
- Healthcare

**Locations:**
- San Francisco, CA
- Oakland, CA
- Berkeley, CA

## Design Patterns

### Color Palette (Zinc-based)
```
Light Mode:
- Background: zinc-50
- Cards: white
- Borders: zinc-200
- Text Primary: zinc-900
- Text Secondary: zinc-600
- Expenses: red-600
- Actions: blue-600

Dark Mode:
- Background: zinc-900
- Cards: zinc-800
- Borders: zinc-700
- Text Primary: zinc-50
- Text Secondary: zinc-400
- Expenses: red-400
- Actions: blue-500
```

### Typography
- Headings: `font-semibold`
- Labels: `font-medium`
- Body: `font-normal`
- Sizes: `text-xs` to `text-2xl`

### Spacing
- Card padding: `p-6`
- Item spacing: `space-y-2`, `space-y-3`, `space-y-4`
- Container: `max-w-2xl mx-auto`
- Gaps: `gap-2`, `gap-4`

### Interactive States
- Hover: Background change with transition
- Focus: Ring with offset (`focus:ring-4`)
- Disabled: Opacity reduction (`disabled:opacity-50`)
- Active: Scale or color shift

## Accessibility Features

1. **ARIA Labels**
   - Logout button: `aria-label="Logout"`
   - FAB: `aria-label="Add Expense"`
   - Info icon: `aria-label="Exchange rate information"`

2. **Keyboard Navigation**
   - All interactive elements are focusable
   - Focus rings visible on keyboard navigation
   - Tab order follows visual flow

3. **Touch Targets**
   - Minimum 44px tap targets
   - FAB: 56px × 56px
   - Icon buttons: 40px with padding

4. **Screen Readers**
   - Semantic HTML structure
   - Proper heading hierarchy
   - Descriptive labels on icons

## Responsive Design

### Mobile (< 640px)
- Search bar: Full width with left padding for logout icon
- Stats grid: 2 columns maintained
- Expense tiles: Stack vertically, responsive text
- FAB: Fixed position remains accessible

### Tablet (640px - 1024px)
- All layouts scale appropriately
- Max-width container maintains readability

### Desktop (> 1024px)
- Max-width: 672px (2xl) for optimal reading
- Centered layout with side margins

## Performance Considerations

1. **Component Optimization**
   - Client-side rendering for interactive elements
   - No unnecessary re-renders
   - Efficient state management

2. **CSS Performance**
   - Utility classes (minimal CSS overhead)
   - Hardware-accelerated transitions
   - Optimized dark mode (no flash)

3. **Bundle Size**
   - No new dependencies added
   - Reused existing UI components
   - Inline SVG icons (no icon library)

## Future Enhancements

### Phase 1: Search Functionality
- Implement search filtering
- Search by: merchant, category, place, amount
- Debounced input for performance
- Highlight search matches

### Phase 2: Bottom Sheet Modal
- Animated bottom sheet (70% screen height)
- Slide-up animation (framer-motion)
- Form fields:
  - Amount input with currency selector
  - Merchant name
  - Category dropdown
  - City/place input
  - Receipt image upload
- Form validation
- Submit to API

### Phase 3: Backend Integration
- Replace hardcoded data with API calls
- Redux state management for expenses
- Pagination or infinite scroll
- Real-time updates
- Optimistic UI updates

### Phase 4: Advanced Features
- Date range filtering
- Category-based filtering
- Sort options (date, amount, category)
- Export functionality (CSV, PDF)
- Recurring expense management
- Receipt image gallery
- Expense analytics/charts

## Testing Checklist

- [ ] Logout icon visible and functional
- [ ] Search bar accepts input
- [ ] Stats section displays correctly
- [ ] 6 expense tiles render properly
- [ ] Category › subcategory formatting correct
- [ ] Scheduled badge appears on PG&E item
- [ ] Exchange info tooltip shows on hover
- [ ] All expense amounts are red
- [ ] FAB fixed in bottom-right
- [ ] FAB click logs to console
- [ ] Dark mode toggle works
- [ ] All hover states working
- [ ] Focus rings visible on tab
- [ ] Mobile responsive (< 640px)
- [ ] Tablet responsive (640px - 1024px)
- [ ] Desktop layout correct
- [ ] No console errors
- [ ] Authentication flow unchanged

## Breaking Changes

None. All changes are additive or cosmetic:
- Removed unused components (Welcome Card, Quick Actions)
- Removed unused imports (Button, selectCurrentUser)
- Added new components (ExpenseTile)
- Modified layout without changing auth flow

## Migration Notes

For developers working on this codebase:

1. **ExpenseTile Component** is now the standard for displaying expenses
2. **Search state** is in place but not yet functional
3. **handleAddExpense** is a placeholder - implement modal when ready
4. **Hardcoded data** should be replaced with API calls in next phase
5. **Button component** removed from Dashboard (now using native button for FAB)

## File Changes

### Created Files
```
app/components/dashboard/ExpenseTile.tsx
```

### Modified Files
```
app/components/dashboard/Dashboard.tsx
```

### Deleted Files
None (removed code sections, not files)

## Related Documentation

- [Database Setup](./database-setup.md) - Backend schema for expenses
- [Authentication Flow](../README.md) - Login/logout documentation
- [CHANGELOG.md](../CHANGELOG.md) - Version history

## Screenshots

*TODO: Add screenshots after testing*
- Light mode dashboard
- Dark mode dashboard
- Mobile view
- Expense tile with tooltip
- FAB interaction

## Commit Message

```
feat: redesign dashboard UI for expense tracking

- Create reusable ExpenseTile component with category hierarchy
- Add search bar to header (UI placeholder)
- Move logout to icon button in top-left
- Replace Recent Activity with structured Expenses section
- Add Floating Action Button (FAB) for adding expenses
- Remove Welcome Card and Quick Actions sections
- Maintain stats section and authentication flow
- Full dark mode support and responsive design
```

## Notes

- This redesign focuses on UI changes only
- Backend integration is out of scope for this phase
- Search and add-expense functionality to be implemented in future PRs
- Design follows existing component patterns for consistency
- No new dependencies required
