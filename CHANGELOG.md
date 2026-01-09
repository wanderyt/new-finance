# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2026-01-09

### Added
- **History/Search Feature**: Comprehensive transaction history view with advanced filtering
  - Tab switcher to toggle between "当前账单" (Current Bills) and "历史记录" (History)
  - Grouped display by month (collapsible) and day with totals at each level
  - Infinite scroll for loading historical data (100 records per batch)
  - Filter bottom sheet with multiple filter options:
    - Keyword search (merchant, category, subcategory, comment)
    - Transaction type filter (all/expense/income)
    - Date range presets: all time, this month, this year, last year, custom range
    - Collapsible category/subcategory multi-select with checkboxes
    - Amount range filter with min/max inputs
  - Filter count badge showing number of active filters
  - Client-side filtering for keyword, categories, and amount range
  - Server-side filtering for type and date range via pagination API
  - Empty states with helpful messages and "adjust filters" action
  - Dark mode support throughout

### Changed
- **Chinese Localization**: Translated all UI text to Chinese
  - Tab labels: "当前账单" (Current Bills), "历史记录" (History)
  - Filter labels: "关键词" (Keyword), "类型" (Type), "日期范围" (Date Range), "分类" (Category), "金额范围" (Amount Range)
  - Action buttons: "应用筛选" (Apply Filters), "重置" (Reset), "筛选" (Filter)
  - Empty states and error messages in Chinese
  - Scheduled transaction badge: "周期" instead of "Scheduled"
- **Dashboard Data Strategy**: Separated data fetching from stats calculation
  - Fetches all fin records without date restrictions for comprehensive list
  - Filters displayed records to only show items up to end of current month
  - Calculates balance/expenses/income stats only for current month
  - Prevents future-dated records from appearing in current view
- **Compact UI Design**: Tightened spacing and reduced font sizes throughout
  - Smaller padding in history view (px-3 py-3) and filter panel (p-4 space-y-3)
  - Reduced font sizes: labels (text-xs), buttons (text-xs), compact tabs
  - Tighter gaps and margins for maximized screen real estate
  - More compact ExpenseTile with reduced padding (py-1.5 px-3)
  - Tab switcher made smaller and more compact

### Fixed
- **Dashboard Stats Display**: Simplified to plain text without background cards
  - Left-aligned stats labels with smaller text (text-xs for labels, text-sm for values)
  - Removed background filters and card styling for cleaner look
  - White text with opacity on hero background image
- **Date Range Filter**: Changed default from "this year" to "all time"
  - More intuitive default showing all historical data
  - Added "last year" preset option
  - Dropdown select instead of button group for space efficiency
- **Filter Panel UX**: Removed header title "筛选交易" to save space
  - Made all fonts smaller and consistent with fin editor
  - Categories now collapsible by default with expand/collapse functionality
  - Reduced button padding and checkbox sizes for compact layout

### Documentation
- Added comprehensive technical documentation in `docs/history-search-feature.md`
- Included design images: `design/fin-expanded-state.png`, `design/fin-folded-state.png`

## [0.11.0] - 2026-01-08

### Added
- **Calculator Component**: Interactive calculator for amount inputs
  - Calculator icon appears on right edge of transaction amount input
  - Panel slides down below input with smooth animation
  - Sequential calculator logic (like iOS calculator)
  - Support for basic operations: addition (+), subtraction (-), multiplication (×), division (÷)
  - Clear (C) and backspace (⌫) buttons for corrections
  - Decimal point support with validation
  - Edge case handling: division by zero shows error, max value cap at 999,999,999.99
  - Click outside or ESC key to close calculator panel
  - Results automatically formatted to 2 decimal places
  - Dark mode support

### Fixed
- **SearchableSelect Empty Options**: Removed invalid empty options from merchant, place, and city dropdowns
  - Previously showed an empty option at the top of each SearchableSelect dropdown
  - Now only displays valid, selectable options

## [0.10.0] - 2025-12-30

### Added
- **Complete Fin Editor UI**: Full-featured bottom sheet editor for expenses and income
  - Mobile-first design with slide-up animation (300ms)
  - Type-filtered category selection based on `applies_to` field
  - Multi-currency support (CAD/USD/CNY) with automatic conversion
  - Line items management with person assignment for split expenses
  - Receipt upload with drag & drop support
  - Tag management with many-to-many relationship
  - Loading states with minimum 300ms for better UX
  - Dark mode support throughout
- **AI-Powered Receipt Analysis**: Automatic receipt parsing and line item extraction
  - Primary: Google Gemini 1.5 Flash (free tier, 15 req/min)
  - Backup: OpenAI GPT-4 Vision implementation (not invoked by default)
  - Extracts merchant, date, currency, and line items with amounts
  - ReceiptAnalysisDialog for reviewing and editing AI-detected items
  - Auto-populates form fields from receipt data
  - Supports multilingual receipts (English/Chinese)
- **Scheduled Transactions**: Complete recurring transaction system
  - Auto-creates schedule rules from frequency selection (daily/weekly/biweekly/monthly/annually)
  - Generates future occurrences automatically:
    - Daily/Weekly/Biweekly: 3 years of occurrences (1095/156/78)
    - Monthly: 10 years (120 occurrences)
    - Annually: 10 years (10 occurrences)
  - ScheduleActionDialog for choosing single vs all future occurrences on update/delete
  - Smart date handling for month-end dates (e.g., Jan 31 → Feb 28/29)
  - UTC-based date calculations to avoid timezone issues
  - Dashboard filtering to show only records up to end of current month
- **Database Cleanup Script**: Maintenance utility for orphaned schedule rules
  - `yarn db:cleanup-schedules` command to remove unused schedule rules
  - LEFT JOIN query to find rules with no associated fin records
  - Detailed output showing what was cleaned up
- **UI Components**: Comprehensive component library for fin editor
  - **BottomSheet**: Animated bottom sheet with backdrop and focus trap
  - **Dialog**: Modal dialog with overlay for receipt analysis
  - **Toggle**: Toggle switch for scheduled transactions
  - **Select**: Dropdown select component
  - **TextArea**: Multi-line text input
  - **Tag**: Tag chip with remove button
  - **SearchableSelect**: Mobile-friendly searchable dropdown with real-time filtering
  - **Dropdown**: Lightweight autocomplete dropdown
- **Form Components**: Specialized inputs for financial data
  - **CategorySelector**: Two-level category picker with type filtering
  - **CurrencySelector**: CAD/USD/CNY dropdown
  - **ScheduledToggle**: Expandable frequency options (daily/weekly/biweekly/monthly/annually)
  - **TagInput**: Multi-tag input with chip display and autocomplete
  - **ReceiptUpload**: Drag & drop file upload with preview and analysis
  - **LineItemEditor**: Line item form with amount, quantity, unit, person assignment
  - **LineItemsDialog**: Dialog panel for managing transaction line items
- **API Endpoints**: Complete CRUD operations for fin transactions
  - GET `/api/fin` - List transactions with type/date filters
  - GET `/api/fin/[id]` - Single transaction with line items
  - DELETE `/api/fin/[id]` - Delete with scope parameter for scheduled transactions
  - GET `/api/fin/autocomplete` - Autocomplete suggestions for merchant/place/city
  - POST `/api/receipts/analyze` - AI receipt analysis with Gemini/OpenAI
  - GET `/api/categories` - List categories with type filtering
  - GET `/api/tags` - List user tags for autocomplete
  - GET `/api/persons` - List persons for line item assignment
- **Redux State Management**: Complete fin slice with async thunks
  - `fetchFinsAsync` - List with filters (type, startDate, endDate)
  - `fetchFinByIdAsync` - Single transaction
  - `createFinAsync` - Create with line items and tags
  - `updateFinAsync` - Update with scope parameter
  - `deleteFinAsync` - Delete with scope parameter
  - `analyzeReceiptAsync` - Receipt analysis
  - Selectors: `selectFilteredFins`, `selectFins`, `selectCurrentFin`, `selectIsLoading`, `selectError`, `selectFilters`
- **Database Seeding**: Enhanced seed script with expense categories
  - 50+ expense categories with subcategories
  - Type filtering (`applies_to`: 'expense', 'income', 'both')
  - Family person for split expense testing
- **Documentation**: Comprehensive feature specifications
  - docs/fin-editor-feature.md (515 lines) - Complete feature spec with UI design
  - docs/receipt-analysis-ai-implementation.md (561 lines) - AI implementation plan
  - Component tree, file structure, data flow diagrams
  - API reference with curl examples
  - Success criteria and testing checklist

### Changed
- **Dashboard**: Major restructure for fin editor integration
  - Dual buttons (支出/收入) with seamless appearance
  - Filter bar (All | Expenses | Income) for transaction filtering
  - Fetch only records up to end of current month
  - Refresh list after editor operations
  - Color-coded tiles (red for expenses, green for income)
- **ExpenseTile**: Enhanced with type support
  - Type indicator badge (Expense/Income)
  - Color coding based on transaction type
  - Click handler for editing transactions
- **API Updates**: Enhanced fin create/update APIs
  - Auto-create schedule rules from frequency selection
  - Generate recurring occurrences on creation
  - Handle scope parameter for scheduled updates/deletes
  - Use target date (00:00:00) as cutoff instead of current time
  - Update line items for all future occurrences when scope='all'
- **Create PR Command**: Simplified workflow
  - Generate markdown output instead of auto-creating PR via gh CLI
  - Output PR title, body, and GitHub compare URL
  - User manually creates PR from generated markdown
- **Button Component**: Improved disabled state styling
  - Prevent hover effects when disabled
  - Better visual feedback for disabled buttons
- **Input Validation**: Enhanced form validation
  - Amount formatting on blur (converts to dollars.cents)
  - City and merchant validation in fin editor
  - Line item amount prevents cursor jump during input

### Fixed
- **Monthly Schedule Dates**: UTC-based calculation for correct month-end handling
  - Switched from local timezone methods to UTC methods throughout
  - Properly handles Jan 31 → Feb 28/29, preserves time components
  - Prevents date drift due to timezone conversion issues
- **SearchableSelect**: Improved user input and option selection handling
  - Properly handles typing vs clicking options
  - Better state management for search and selection
- **Line Item Amount Input**: Prevents cursor jump during editing
  - Only updates cents value on blur, not on keystroke
  - Smooth editing experience without interruption
- **Auth Middleware**: Updated fin API routes to use `withAuth` pattern
  - Consistent authentication across all endpoints
  - Proper ownership validation on updates/deletes

### Technical
- **Scheduling**: Auto-generation with frequency-based occurrence counts
- **Date Handling**: UTC methods (getUTCDate, Date.UTC, setUTCFullYear) for timezone safety
- **AI Vision**: Google Gemini 1.5 Flash primary, OpenAI GPT-4 Vision backup
- **Database**: Orphaned schedule rule cleanup via LEFT JOIN query
- **Form UX**: Minimum 300ms loading states for perceived responsiveness
- **Components**: 5000+ lines of new React components and UI logic
- **Type Safety**: Complete TypeScript interfaces for all API contracts

## [0.9.0] - 2025-12-29

### Added
- **Fin List API**: GET endpoint for retrieving financial transaction lists
  - GET `/api/fin/list` - List fin records with pagination and filtering
  - Pagination support with limit (1-100, default 20) and offset parameters
  - Optional type filter (expense/income/all) for transaction types
  - Date range filtering (dateFrom/dateTo) with default dateTo=now
  - Returns paginated response with total count and hasMore flag
  - Uses existing database indexes for optimized query performance
  - Filters by authenticated user's userId automatically
  - Orders results by date descending (most recent first)
- **Redux Fin State Management**: Complete Redux slice for fin list data
  - `fetchFinListAsync` async thunk for API calls with error handling
  - State management for items, pagination metadata, and filters
  - Loading/error/success state handling
  - Selectors for accessing fin items, pagination, status, and errors
  - Registered fin reducer in Redux store
- **Dashboard Real Data Integration**: Replaced mock data with live API
  - Automatic data fetch on component mount via useEffect
  - `formatAmount` helper for currency display with +/- signs
  - `formatExchangeInfo` helper for USD/CNY tooltip data
  - Loading state UI ("Loading transactions...")
  - Error state UI with error message display
  - Empty state UI ("No transactions found")
  - Success state with real transaction rendering
  - Maps API response to ExpenseTile component props
- **API Type Definitions**: TypeScript interfaces for fin list
  - `ListFinQueryParams` - URL query parameters interface
  - `PaginationMeta` - Pagination metadata structure
  - `ListFinResponse` - API response with data and pagination

### Changed
- Dashboard component now uses Redux for state management instead of hardcoded mock data
- Removed 20 hardcoded mock expense items (215 lines of mock data)
- Loading state now includes both auth and fin list statuses

### Technical
- Query parameter validation with proper error responses (400/500)
- Drizzle ORM queries with `and()`, `eq()`, `gte()`, `lte()`, `desc()` operators
- Database indexes leveraged: `idx_fin_user_date`, `idx_fin_user_type_date`
- Axios HTTP client for API calls with credentials
- Redux Toolkit async thunks with rejectValue type
- Cents-based currency calculations (e.g., $10.50 = 1050 cents)

## [0.8.0] - 2025-12-29

### Added
- **Fin Transaction APIs**: Complete create and update endpoints for financial transactions
  - POST `/api/fin/create` - Create expense/income transactions with multi-currency support
  - PATCH `/api/fin/update` - Update transaction fields with ownership validation
  - Cookie-based authentication using `withAuth` middleware pattern
  - Support for both scheduled and one-time transactions
  - ISO 8601 date validation with UTC timezone requirement
- **FX Snapshot System**: Historical exchange rate tracking
  - `createFxSnapshot()` - Creates snapshot record in database
  - `getFxSnapshotById()` - Retrieves historical rates by fxId
  - Create API stores fxId on transaction for rate tracking
  - Update API reuses original fxId for historical consistency
  - Prevents exchange rate drift when updating transaction amounts
- **Real-time FX API Integration**: Frankfurter API for live exchange rates
  - `fetchExchangeRates()` - Fetches CAD→USD and CAD→CNY rates
  - `convertCurrencyWithRates()` - Converts amounts using live rates
  - 1-hour caching via Next.js revalidation
  - Fallback to mock rates on API failure
  - Free, open-source API with no key required
- **Authentication Middleware**: Reusable `withAuth` HOF pattern
  - Wraps route handlers with automatic auth validation
  - Returns authenticated user object (userId, username)
  - Consistent error responses (401 Unauthorized)
  - Helper functions for 400/500 error responses
- **Currency Utilities**: Multi-currency conversion with FX snapshot support
  - `convertCurrency()` - Converts to all three currencies (CAD/USD/CNY)
  - Accepts optional fxId parameter for historical rates
  - Returns fxId for new snapshots
  - Cents-based calculations to avoid floating-point errors
- **ID Generation Utility**: Timestamp-based unique IDs
  - `generateFinId()` - Generates `fin_${timestamp}_${random}` format
  - Chronological ordering with random suffix for uniqueness
- **Database Sync Scripts**: Multi-branch development support
  - `yarn db:sync-to-main` - Copy database to main branch
  - `yarn db:sync-from-main` - Copy database from main branch
  - Enables worktree-based feature branch development
- **API Type Definitions**: Complete TypeScript interfaces
  - `CreateFinRequest` / `CreateFinResponse`
  - `UpdateFinRequest` / `UpdateFinResponse`
  - `FinData` - Full transaction response data
  - `ErrorResponse` - Standardized error format
- **Comprehensive Documentation**: API implementation guide (903 lines)
  - docs/api-implementation-fin-create-update.md
  - Architecture overview and design decisions
  - API specifications with curl examples
  - Validation rules and error handling
  - Testing guide and future enhancements

### Changed
- **Create PR Workflow**: Enhanced with uncommitted changes handling
  - Added step 2 to check and commit uncommitted changes
  - Groups related changes logically before version bump
  - Renumbered subsequent steps (3-11)
  - Clarified step 8 as "version bump and changelog" commit
- **Permissions**: Added curl permission to settings.local.json for API calls

### Technical
- Authentication: Cookie-based with Base64 session tokens
- Currency: CAD base with USD/CNY support (cents-based storage)
- Date format: ISO 8601 with UTC timezone (e.g., "2025-12-29T15:30:00Z")
- FX Provider: Frankfurter API (https://frankfurter.dev)
- Ownership: Update API verifies userId matches authenticated user
- Protected fields: Cannot update `isScheduled`, `scheduleRuleId`, `scheduledOn`
- PATCH semantics: Selective updates (only provided fields)

## [0.7.1] - 2025-12-25

### Added
- **UI Master Agent**: Custom Claude Code agent configuration for frontend development
  - Configured tech stack versions (React 19+, Next.js 16+, TypeScript 5+, Tailwind CSS 4)
  - Node.js >= 20.9.0 and Yarn 4.5.3 (Berry) requirements documented
  - Project component structure guidelines (app/components/ organization)
  - Feature-based organization for dashboard/, login/, providers/ folders
  - UI kit component guidelines for shared/reusable components
  - Core principles for clean, simple, maintainable code
  - TypeScript best practices and React/Next.js patterns

### Technical
- Agent configuration: .claude/agents/ui-master.md
- Agent model: Sonnet with specialized frontend development expertise
- Component organization enforces feature-based structure with ui-kit/ for shared components

## [0.7.0] - 2025-12-25

### Added
- **Complete Database Schema**: Implemented full 10-table database schema with Drizzle ORM
  - `users`: User authentication and profiles
  - `categories`: Expense/income categorization with `applies_to` field
  - `fx_snapshots`: Exchange rate snapshots (CAD base currency)
  - `schedule_rules`: Recurring transaction patterns (NEW - interval, unit, anchor_date)
  - `fin`: Main transactions with type field ('expense'|'income'), schedule fields, merchant tracking
  - `persons`: Family member expense assignment
  - `fin_items`: Transaction line items with quantity and unit pricing
  - `receipts`: Receipt file metadata with SHA256 deduplication
  - `tags`: Flexible tagging system
  - `fin_tags`: Many-to-many transaction tags
- **Database Migration**: Initial migration (0000_cloudy_vision.sql) with CHECK constraints
  - Composite primary keys and foreign key CASCADE behavior
  - Partial unique index for schedule deduplication
  - 20 indexes for query optimization
  - Comprehensive CHECK constraints for data validation
- **Authentication System**: JWT-based authentication with Drizzle queries
  - Login, logout, and session verification API routes
  - Token-based session management with httpOnly cookies
  - Mock users for testing during development
- **Redux State Management**: Complete Redux setup with RTK
  - Auth slice with async thunks for login/logout/verify
  - TypeScript types for authentication state
  - Redux hooks and provider
- **Database Documentation**: Comprehensive guides added
  - DATABASE.md: Quick reference for Drizzle commands
  - docs/database-setup.md: Complete schema design (1211 lines)
  - docs/authentication-flow.md: Authentication patterns (949 lines)
- **Database Scripts**: Drizzle-based seeding and migration scripts
  - scripts/seed.ts: Demo user seeding
  - drizzle.config.ts: Drizzle Kit configuration

### Changed
- **Database Migration**: Migrated from Prisma to Drizzle ORM (100%)
  - Removed all Prisma dependencies (@prisma/client, prisma)
  - Renamed prisma.ts → drizzle.ts for clarity
  - Updated API routes to use Drizzle queries
- **Schema Enhancements**: Updated fin table structure
  - Added `type` field: 'expense' | 'income'
  - Added schedule fields: `scheduled_on`, `schedule_rule_id`
  - Added `merchant` field for better data quality
  - Multi-currency support: CAD/USD/CNY with cents-based storage
- **Documentation**: Updated database-setup.md with schedule_rules table
  - Renumbered tables 4→5, 5→6, etc. to accommodate schedule_rules
  - Added scheduling workflow and patterns
  - Added new indexes: idx_fin_user_type_date, idx_fin_user_rule_scheduled_on

### Technical
- Type-safe schema definitions with exported TypeScript types
- Drizzle inferred types for select/insert operations
- better-sqlite3 driver for optimal performance
- Drizzle Studio support for visual database management
- Environment setup with Node.js >=20.9.0 requirement

## [0.6.0] - 2025-12-23

### Added
- ExpenseTile component for reusable expense item display with:
  - Left-right flex layout with category hierarchy (Category › Subcategory)
  - Merchant name, location, and scheduled badge for recurring expenses
  - Currency amount display with red coloring for expenses
  - Custom tooltip showing USD/CNY exchange rates on info icon hover
  - Full dark mode support and hover states
- Dashboard hero section with background image overlay:
  - 370px hero section with background image (fin-l.jpg)
  - Semi-transparent stats cards (Total Balance, Total Expense) positioned at bottom-left
  - Logout icon button in top-left corner
  - Dark overlay (30% opacity) for image contrast
- Prominent "记一笔" (Add Expense) button with:
  - Orange gradient styling (from-orange-500 to-orange-600)
  - Wide layout with letter-spacing for emphasis
  - Positioned between hero and expense list with negative margin overlap
- Comprehensive expense list with 20 mock items for scroll testing
- Design reference files (fin-l.jpg background, original-dashboard.png)
- Comprehensive dashboard UI design documentation (docs/dashboard-ui-design.md) with 448 lines covering:
  - Component structure and props interfaces
  - Design patterns and color palette
  - Layout changes and visual structure
  - Accessibility features and responsive design
  - Future enhancements roadmap

### Changed
- Dashboard component completely restructured for expense tracking focus:
  - Removed welcome card and search bar (search to be implemented later)
  - Removed Quick Actions buttons section
  - Replaced Recent Activity with structured Expenses list using ExpenseTile
  - Stats section maintained but repositioned within hero overlay
  - Full-width layout with white background for seamless visual flow
- Expense data structure enhanced with:
  - Category hierarchy (category/subcategory)
  - Merchant and location tracking
  - Scheduled/recurring expense flag
  - Currency specification
  - Exchange rate information (USD/CNY)

### Technical
- Client-side tooltip implementation using React useState (no external libraries)
- Inline styles for background image positioning and overlay effects
- Z-index layering for proper stacking context (logout, stats, overlay)
- Overflow handling adjusted to prevent tooltip clipping
- All components maintain existing zinc color palette and dark mode support

## [0.5.0] - 2025-12-23

### Added
- SQLite database integration with Drizzle ORM for type-safe queries
- Database schema design with users table (userId, username, password)
- Drizzle ORM client with singleton pattern for Next.js dev mode
- better-sqlite3 driver for fast synchronous SQLite operations
- Prisma schema and migrations for database table creation
- Seed script for demo user (username: "demo", password: "demo123")
- Comprehensive database design documentation (docs/database-setup.md)
- Database query examples with Drizzle ORM patterns
- Type inference for User and NewUser types from schema
- .gitignore rules for database files and migrations

### Changed
- Authentication now queries real SQLite database instead of mock users
- Login API route uses Drizzle query: `db.select().from(users).where(eq(users.username, username))`
- Verify API route queries database by userId for session validation
- Node.js requirement upgraded to 20.19.6 for Drizzle compatibility
- Authentication flow documentation updated for database integration
- Database file location: `db/finance.db` (gitignored)

### Technical
- Drizzle ORM 0.45.1 with better-sqlite3 12.5.0
- Type-safe database queries with compile-time validation
- Singleton connection pattern prevents multiple DB connections
- Database client exported from `app/lib/db/prisma.ts`
- Schema definitions in `app/lib/db/schema.ts`
- Future-ready for bcrypt password hashing and additional tables

## [0.4.0] - 2025-12-22

### Added
- Complete authentication API implementation with three endpoints:
  - POST /api/auth/login - Validates credentials and sets HttpOnly session cookie
  - GET /api/auth/verify - Validates session from cookie server-side
  - POST /api/auth/logout - Clears authentication cookie
- Mock user database with three test users (demo, john_doe, jane_smith)
- Session token utilities using Base64 encoding (easy migration to JWT)
- Cookie management with proper security flags (HttpOnly, Secure, SameSite)
- Redux async thunks for login, session verification, and logout
- Global loading component with configurable sizes and full-screen mode
- AuthProvider component for automatic session verification on app load
- Full-screen loading UI during session verification ("Verifying session...")
- isVerifying state in Redux to track initial session verification
- Error handling and loading states in LoginForm and Dashboard
- Demo credentials info box in login form
- Axios dependency for improved HTTP request handling

### Changed
- LoginForm now uses loginAsync thunk instead of synchronous login action
- Dashboard logout uses logoutAsync thunk with proper API integration
- AuthProvider always calls verify API (HttpOnly cookies can't be read by JS)
- Updated metadata in layout with proper title and description
- Enhanced authentication flow documentation with implementation status

### Fixed
- Session persistence on page refresh now works correctly
- HttpOnly cookies properly set on NextResponse objects in API routes
- Cookie verification works without client-side cookie access

### Technical
- Authentication cookies set with 7-day expiration
- Base64-encoded session tokens (mock implementation, production-ready for JWT)
- Plain text password validation (mock implementation, production-ready for bcrypt)
- Server-side cookie validation in verify endpoint
- TypeScript interfaces for all API requests and responses
- Clear migration path to production authentication documented

## [0.3.0] - 2025-12-22

### Added
- Redux Toolkit state management for authentication
- Typed Redux hooks (useAppDispatch, useAppSelector, useAppStore)
- Redux Provider with Next.js 16 App Router integration
- Auth slice with login/logout reducers and selectors
- Comprehensive authentication flow documentation
- Redux implementation plan documentation
- Dependencies: @reduxjs/toolkit (^2.11.2), react-redux (^9.2.0)

### Changed
- LoginForm now dispatches Redux actions instead of callback props
- Dashboard uses Redux selectors for state access
- Removed prop drilling between page.tsx and child components
- Centralized authentication state in Redux store

### Technical
- Feature-based Redux organization (app/lib/redux/features/)
- Full TypeScript support with RootState and AppDispatch types
- Redux DevTools integration enabled in development
- useRef pattern for store instance in Next.js App Router

## [0.2.0] - 2025-12-22

### Added
- Mobile-first login UI with username/password authentication flow
- Dashboard component with user welcome, stats cards, and activity feed
- Animated page transitions between login and dashboard using framer-motion
- Reusable UI kit components (Button and Input) for consistent styling
- Feature-based component organization structure (login/, dashboard/, ui-kit/)
- Component structure guidelines in CLAUDE.md
- Yarn PnP SDK setup for improved editor integration

### Changed
- Reorganized components into feature-based folders
- Refactored LoginForm and Dashboard to use UI kit components
- Configured Yarn to use node-modules linker for Turbopack compatibility

## [0.1.1] - 2025-12-22

### Added
- Claude Code `/changelog` command for automated changelog generation
- Claude Code `/create_pr` command for automated PR workflow (version bump, changelog, commit, PR creation)
- Project documentation in [CLAUDE.md](CLAUDE.md) with development guidelines
- GitHub pull request template for standardized PRs
- Node.js version management via [.nvmrc](.nvmrc) file
- Yarn 4 (Berry) as package manager with version scripts

### Changed
- Migrated from npm to Yarn 4 for package management
- Updated [.gitignore](.gitignore) for Yarn-specific files

### Fixed
- Added required frontmatter to changelog command for proper Claude Code recognition

## [0.1.0] - 2024-12-22

### Added
- Initial Next.js 16 project setup
- React 19 with TypeScript
- Tailwind CSS 4 integration
- ESLint configuration
