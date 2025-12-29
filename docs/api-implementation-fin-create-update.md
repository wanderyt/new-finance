# Fin Create/Update API Implementation Documentation

> **Status**: ✅ Implemented
> **Date**: 2025-12-25
> **Author**: Claude (Automated Documentation)

## Overview

This document provides detailed implementation specifications for the Financial Transaction (Fin) Create and Update APIs. These endpoints allow authenticated users to create and modify financial transaction records with multi-currency support.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Validation Rules](#validation-rules)
6. [Currency Conversion](#currency-conversion)
7. [Error Handling](#error-handling)
8. [Testing Guide](#testing-guide)
9. [Implementation Files](#implementation-files)

---

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite with better-sqlite3
- **ORM**: Drizzle ORM
- **Authentication**: Cookie-based session tokens
- **TypeScript**: Strict mode enabled

### Design Patterns

1. **Middleware Pattern**: `withAuth` HOF wraps route handlers for authentication
2. **Utility Functions**: Modular currency conversion and ID generation
3. **Type Safety**: Full TypeScript type inference from database schema to API responses
4. **Error Consistency**: Unified error response format across all endpoints

---

## Authentication

### Cookie-Based Authentication

All fin mutation APIs are protected by authentication middleware using HTTP-only cookies.

**Cookie Details:**
- **Cookie Name**: `fin_plat`
- **Duration**: 7 days
- **Security**: HTTP-only, secure (HTTPS-only in production), SameSite strict/lax
- **Token Format**: Base64-encoded JSON (mock implementation)

### Authentication Middleware

**File**: [app/lib/middleware/auth.ts](../app/lib/middleware/auth.ts)

**Key Function**: `withAuth(handler)`

```typescript
export function withAuth(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await authenticateUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    return handler(request, user);
  };
}
```

**Authentication Flow**:
1. Extract cookie from request using `getAuthCookie()`
2. Verify and decode token with `verifySessionToken()`
3. Query database to confirm user exists
4. Return `AuthUser { userId, username }` or `null`

**Usage in Route Handlers**:
```typescript
export const POST = withAuth(async (request, user) => {
  // user.userId and user.username automatically available
  // 401 responses handled automatically
});
```

---

## API Endpoints

### 1. Create Fin Transaction

**Endpoint**: `POST /api/fin/create`

**Description**: Create a new financial transaction record with multi-currency support.

**Authentication**: Required (Cookie-based)

**Request Body**:
```typescript
interface CreateFinRequest {
  // Required fields
  date: string; // ISO 8601 with UTC time: "2025-12-29T15:30:00Z"
  originalCurrency: "CAD" | "USD" | "CNY";
  originalAmountCents: number; // Amount in cents (e.g., $10.50 = 1050)

  // Optional metadata
  type?: "expense" | "income"; // Default: "expense"
  merchant?: string;
  comment?: string;
  place?: string;
  city?: string;
  category?: string;
  subcategory?: string;
  details?: string;

  // Scheduling (optional)
  isScheduled?: boolean; // Default: false
  scheduleRuleId?: number; // Required if isScheduled = true
  scheduledOn?: string; // ISO 8601 with UTC, required if isScheduled = true
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "finId": "fin_1735139400000_a3b5c7",
    "userId": 1,
    "type": "expense",
    "date": "2025-12-29T15:30:00Z",
    "merchant": "Costco",
    "originalCurrency": "CAD",
    "originalAmountCents": 12050,
    "amountCadCents": 12050,
    "amountUsdCents": 8797,
    "amountCnyCents": 62660,
    "amountBaseCadCents": 12050,
    "fxId": null,
    "isScheduled": false,
    ...
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields, invalid format, validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Database or unexpected errors

---

### 2. Update Fin Transaction

**Endpoint**: `PATCH /api/fin/update`

**Description**: Update an existing financial transaction. Only provided fields are updated.

**Authentication**: Required (Cookie-based)

**Request Body**:
```typescript
interface UpdateFinRequest {
  // Required
  finId: string; // Transaction ID to update

  // Optional updates
  type?: "expense" | "income";
  date?: string; // ISO 8601 with UTC
  merchant?: string;
  comment?: string;
  place?: string;
  city?: string;
  category?: string;
  subcategory?: string;
  details?: string;
  originalCurrency?: "CAD" | "USD" | "CNY";
  originalAmountCents?: number;

  // PROTECTED: Cannot update these fields
  // - isScheduled
  // - scheduleRuleId
  // - scheduledOn
  // - userId
  // - finId
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "finId": "fin_1735139400000_a3b5c7",
    "merchant": "Costco Wholesale", // Updated
    "originalAmountCents": 15000, // Updated
    "amountCadCents": 15000, // Recalculated
    "amountUsdCents": 10950, // Recalculated
    "amountCnyCents": 78000, // Recalculated
    ...
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing finId, no fields to update, invalid format
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Transaction doesn't exist or user doesn't own it
- `500 Internal Server Error`: Database or unexpected errors

---

## Data Models

### Database Schema

**Table**: `fin`

**Key Fields**:
```typescript
{
  finId: string; // Primary key, format: fin_[timestamp]_[random]
  userId: number; // Foreign key to users table
  type: "expense" | "income";
  date: string; // ISO 8601 with time in UTC

  // Metadata
  merchant: string | null;
  comment: string | null;
  place: string | null;
  city: string | null;
  category: string | null;
  subcategory: string | null;
  details: string | null;

  // Currency amounts (all in cents)
  originalCurrency: "CAD" | "USD" | "CNY";
  originalAmountCents: number;
  amountCadCents: number; // Converted to CAD
  amountUsdCents: number; // Converted to USD
  amountCnyCents: number; // Converted to CNY
  amountBaseCadCents: number; // Same as amountCadCents

  // FX reference
  fxId: number | null; // Foreign key to fx_snapshots (TODO: implement)

  // Scheduling
  isScheduled: boolean;
  scheduleRuleId: number | null; // Foreign key to schedule_rules
  scheduledOn: string | null; // ISO 8601
}
```

**Type Exports**:
```typescript
export type Fin = typeof fin.$inferSelect; // For queries
export type NewFin = typeof fin.$inferInsert; // For inserts
```

---

## Validation Rules

### Required Field Validation

**Create API**:
- ✅ `date` (string, ISO 8601 with UTC)
- ✅ `originalCurrency` (enum: CAD/USD/CNY)
- ✅ `originalAmountCents` (number)

**Update API**:
- ✅ `finId` (string)

### Date Format Validation

**Rule**: All date fields must be ISO 8601 with time in UTC timezone

**Valid Formats**:
- `2025-12-29T15:30:00Z` ✅ (UTC with Z suffix)
- `2025-12-29T15:30:00+00:00` ✅ (UTC with offset)
- `2025-12-29T10:30:00-05:00` ✅ (EST with offset)

**Invalid Formats**:
- `2025-12-29` ❌ (no time)
- `2025-12-29T15:30:00` ❌ (no timezone)
- `2025-12-29 15:30:00` ❌ (wrong format)

**Validation Logic**:
```typescript
function isValidDateFormat(dateString: string): boolean {
  // Check if timezone is present (Z or +/- offset)
  if (!dateString.match(/[Z]|[+-]\d{2}:\d{2}$/)) {
    return false;
  }

  // Check if parseable by Date constructor
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
```

### Currency Validation

**Rule**: `originalCurrency` must be one of: `CAD`, `USD`, `CNY`

**Check**:
```typescript
if (!["CAD", "USD", "CNY"].includes(body.originalCurrency)) {
  return badRequestResponse(
    'Field "originalCurrency" must be CAD, USD, or CNY'
  );
}
```

### Amount Validation

**Rule**: `originalAmountCents` must be >= 0 (non-negative integer)

**Check**:
```typescript
if (body.originalAmountCents < 0) {
  return badRequestResponse(
    'Field "originalAmountCents" must be >= 0'
  );
}
```

### Type Validation

**Rule**: `type` must be either `expense` or `income`

**Check**:
```typescript
if (body.type && !["expense", "income"].includes(body.type)) {
  return badRequestResponse(
    'Field "type" must be "expense" or "income"'
  );
}
```

### Scheduling Validation

**Rule**: If `isScheduled = true`, then `scheduleRuleId` must be provided

**Check**:
```typescript
if (body.isScheduled && !body.scheduleRuleId) {
  return badRequestResponse(
    'Field "scheduleRuleId" is required when isScheduled is true'
  );
}
```

---

## Currency Conversion

### Mock Exchange Rates

**File**: [app/lib/utils/currency.ts](../app/lib/utils/currency.ts)

**Base Currency**: CAD (Canadian Dollar)

**Hardcoded Rates**:
```typescript
const MOCK_FX_RATES = {
  CAD_TO_USD: 0.73,  // 1 CAD = $0.73 USD
  CAD_TO_CNY: 5.20,  // 1 CAD = ¥5.20 CNY
  USD_TO_CAD: 1.37,  // 1 USD = $1.37 CAD
  USD_TO_CNY: 7.12,  // 1 USD = ¥7.12 CNY
  CNY_TO_CAD: 0.19,  // 1 CNY = $0.19 CAD
  CNY_TO_USD: 0.14,  // 1 CNY = $0.14 USD
};
```

**TODO**: Replace with real FX API integration (e.g., exchangerate-api.com)

### Conversion Function

```typescript
function convertCurrency(
  originalCurrency: "CAD" | "USD" | "CNY",
  originalAmountCents: number
): {
  amountCadCents: number;
  amountUsdCents: number;
  amountCnyCents: number;
  amountBaseCadCents: number;
}
```

**Examples**:

1. **CAD Input**: $120.50 CAD (12050 cents)
   ```typescript
   convertCurrency("CAD", 12050)
   // Returns:
   {
     amountCadCents: 12050,      // $120.50 CAD
     amountUsdCents: 8797,       // $87.97 USD
     amountCnyCents: 62660,      // ¥626.60 CNY
     amountBaseCadCents: 12050   // $120.50 CAD (base)
   }
   ```

2. **USD Input**: $50.00 USD (5000 cents)
   ```typescript
   convertCurrency("USD", 5000)
   // Returns:
   {
     amountCadCents: 6850,       // $68.50 CAD
     amountUsdCents: 5000,       // $50.00 USD
     amountCnyCents: 35600,      // ¥356.00 CNY
     amountBaseCadCents: 6850    // $68.50 CAD (base)
   }
   ```

3. **CNY Input**: ¥100.00 CNY (10000 cents)
   ```typescript
   convertCurrency("CNY", 10000)
   // Returns:
   {
     amountCadCents: 1900,       // $19.00 CAD
     amountUsdCents: 1400,       // $14.00 USD
     amountCnyCents: 10000,      // ¥100.00 CNY
     amountBaseCadCents: 1900    // $19.00 CAD (base)
   }
   ```

### Recalculation on Update

**Trigger**: When `originalCurrency` OR `originalAmountCents` is updated

**Logic**:
```typescript
const currencyChanged =
  body.originalCurrency !== undefined ||
  body.originalAmountCents !== undefined;

if (currencyChanged) {
  const newCurrency = body.originalCurrency || existing.originalCurrency;
  const newAmount =
    body.originalAmountCents !== undefined
      ? body.originalAmountCents
      : existing.originalAmountCents;

  const currencyAmounts = convertCurrency(newCurrency, newAmount);

  updates.originalCurrency = newCurrency;
  updates.originalAmountCents = newAmount;
  updates.amountCadCents = currencyAmounts.amountCadCents;
  updates.amountUsdCents = currencyAmounts.amountUsdCents;
  updates.amountCnyCents = currencyAmounts.amountCnyCents;
  updates.amountBaseCadCents = currencyAmounts.amountBaseCadCents;
}
```

---

## Error Handling

### Error Response Format

All error responses follow the same structure:

```typescript
{
  success: false,
  error: string // Human-readable error message
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Update successful |
| 201 | Created | Create successful |
| 400 | Bad Request | Missing required fields, invalid format, validation failures |
| 401 | Unauthorized | Missing authentication cookie, invalid/expired token |
| 404 | Not Found | Transaction doesn't exist or user doesn't own it (update only) |
| 500 | Internal Server Error | Database errors, unexpected exceptions |

### Error Examples

**400 - Missing Required Field**:
```json
{
  "success": false,
  "error": "Field \"date\" is required"
}
```

**400 - Invalid Date Format**:
```json
{
  "success": false,
  "error": "Field \"date\" must be ISO 8601 with UTC timezone (e.g., \"2025-12-29T15:30:00Z\")"
}
```

**401 - Unauthorized**:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**404 - Not Found** (Update API):
```json
{
  "success": false,
  "error": "Transaction not found or access denied"
}
```

**500 - Server Error**:
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Testing Guide

### Prerequisites

1. **Start Development Server**:
   ```bash
   yarn dev
   ```

2. **Login to Get Authentication Cookie**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"demo","password":"demo123"}' \
     -c cookies.txt
   ```

### Test Cases

#### 1. Create CAD Expense Transaction

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-29T15:30:00Z",
    "merchant": "Costco",
    "originalCurrency": "CAD",
    "originalAmountCents": 12050,
    "category": "Groceries",
    "subcategory": "Food",
    "place": "Richmond",
    "city": "Vancouver",
    "comment": "Weekly grocery shopping"
  }'
```

**Expected**: 201 Created with full fin record

#### 2. Create USD Income Transaction

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "income",
    "date": "2025-12-25T10:00:00Z",
    "merchant": "Client Payment",
    "originalCurrency": "USD",
    "originalAmountCents": 500000,
    "category": "Freelance",
    "comment": "Project XYZ payment"
  }'
```

**Expected**: 201 Created with converted amounts

#### 3. Create Scheduled Transaction

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-29T20:00:00Z",
    "merchant": "Netflix",
    "originalCurrency": "CAD",
    "originalAmountCents": 1999,
    "isScheduled": true,
    "scheduleRuleId": 1,
    "scheduledOn": "2025-12-29T20:00:00Z",
    "category": "Entertainment",
    "subcategory": "Streaming"
  }'
```

**Expected**: 201 Created with `isScheduled: true`

#### 4. Update Transaction

```bash
# First, capture finId from create response
FIN_ID="fin_1735139400000_a3b5c7"

curl -X PATCH http://localhost:3000/api/fin/update \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"finId\": \"$FIN_ID\",
    \"merchant\": \"Costco Wholesale\",
    \"category\": \"Food & Dining\",
    \"originalAmountCents\": 15000
  }"
```

**Expected**: 200 OK with updated fields + recalculated currency amounts

#### 5. Error: Create Without Authentication

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-12-29T15:30:00Z",
    "originalCurrency": "CAD",
    "originalAmountCents": 10000
  }'
```

**Expected**: 401 Unauthorized

#### 6. Error: Invalid Date Format

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-29",
    "originalCurrency": "CAD",
    "originalAmountCents": 10000
  }'
```

**Expected**: 400 Bad Request (no time info)

#### 7. Error: Missing Timezone

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-29T15:30:00",
    "originalCurrency": "CAD",
    "originalAmountCents": 10000
  }'
```

**Expected**: 400 Bad Request (no timezone)

#### 8. Error: Invalid Currency

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-29T15:30:00Z",
    "originalCurrency": "EUR",
    "originalAmountCents": 10000
  }'
```

**Expected**: 400 Bad Request (unsupported currency)

#### 9. Error: Negative Amount

```bash
curl -X POST http://localhost:3000/api/fin/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "date": "2025-12-29T15:30:00Z",
    "originalCurrency": "CAD",
    "originalAmountCents": -1000
  }'
```

**Expected**: 400 Bad Request

#### 10. Error: Update Non-Existent Transaction

```bash
curl -X PATCH http://localhost:3000/api/fin/update \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "finId": "fin_99999999_nonexistent",
    "merchant": "Test"
  }'
```

**Expected**: 404 Not Found

---

## Implementation Files

### Created Files

| File Path | Purpose | Lines |
|-----------|---------|-------|
| `app/lib/middleware/auth.ts` | Authentication middleware with `withAuth` HOF | ~105 |
| `app/lib/utils/currency.ts` | Currency conversion utility with mock rates | ~60 |
| `app/lib/utils/id.ts` | Unique fin ID generation | ~10 |
| `app/api/fin/create/route.ts` | Create transaction endpoint | ~180 |
| `app/api/fin/update/route.ts` | Update transaction endpoint | ~200 |

### Modified Files

| File Path | Changes | Lines Added |
|-----------|---------|-------------|
| `app/lib/types/api.ts` | Added fin request/response interfaces | ~70 |

### Reference Files (No Changes)

- `app/lib/db/schema.ts` - Database schema with fin table definition
- `app/lib/db/drizzle.ts` - Drizzle ORM connection
- `app/lib/auth/session.ts` - Session management utilities
- `app/api/auth/verify/route.ts` - Authentication pattern reference

---

## API Design Principles

### 1. Middleware Pattern

**Benefit**: Scalable authentication for future APIs

Instead of repeating auth logic in each route:
```typescript
// ❌ Bad: Repetitive auth code
export async function POST(request: NextRequest) {
  const token = await getAuthCookie();
  if (!token) return NextResponse.json({...}, { status: 401 });
  const payload = verifySessionToken(token);
  if (!payload) return NextResponse.json({...}, { status: 401 });
  // ... actual logic
}
```

Use middleware HOF:
```typescript
// ✅ Good: Reusable middleware
export const POST = withAuth(async (request, user) => {
  // Auth handled automatically, user available
  // ... actual logic
});
```

### 2. Selective Updates (PATCH)

**Benefit**: Flexible partial updates without overwriting

Only update fields that are provided:
```typescript
const updates: any = {};
if (body.merchant !== undefined) updates.merchant = body.merchant;
if (body.category !== undefined) updates.category = body.category;
// ... only changed fields

await db.update(fin).set(updates).where(eq(fin.finId, finId));
```

### 3. Cents-Based Storage

**Benefit**: Eliminates floating-point precision errors

Store all amounts as integers (cents):
```typescript
// ✅ Good: Integer cents
originalAmountCents: 12050 // $120.50

// ❌ Bad: Floating point
originalAmount: 120.50 // Precision errors possible
```

### 4. Date Format Enforcement

**Benefit**: Consistent timezone handling, prevents ambiguity

Require ISO 8601 with UTC timezone:
```typescript
// ✅ Valid: Clear timezone
"2025-12-29T15:30:00Z"

// ❌ Invalid: Ambiguous
"2025-12-29" // What time? What timezone?
```

### 5. Protected Fields

**Benefit**: Prevent accidental changes to critical system fields

Update API explicitly blocks:
- `finId` - Primary key, immutable
- `userId` - Ownership field, immutable
- `isScheduled`, `scheduleRuleId`, `scheduledOn` - Scheduling metadata per requirements

---

## Future Enhancements

### Short-Term (Next Sprint)

- [ ] **Real FX API Integration**
  - Integrate with exchangerate-api.com or similar
  - Create FX snapshots on transaction creation
  - Link transactions to snapshots via `fxId`

- [ ] **Query API**
  - GET /api/fin/list - List transactions with filters
  - GET /api/fin/[id] - Get single transaction
  - Support pagination, date range, category filters

- [ ] **Delete API**
  - DELETE /api/fin/[id] - Soft or hard delete
  - Consider cascade deletes for related records

### Medium-Term

- [ ] **Validation Library**
  - Integrate Zod for schema validation
  - Type-safe request validation
  - Auto-generate OpenAPI specs

- [ ] **Line Items Support**
  - POST /api/fin/items - Add line items to transaction
  - Cascade handling for fin_items table
  - Support creating items during transaction creation

### Long-Term

- [ ] **Receipt Upload**
  - POST /api/receipts/upload
  - AI/OCR processing for receipt extraction
  - Link receipts to transactions

- [ ] **Tag Management**
  - CRUD APIs for tags
  - Many-to-many tag relationships via fin_tags

---

## Changelog

### 2025-12-25 - Initial Implementation

**Added**:
- ✅ Authentication middleware with `withAuth` HOF
- ✅ Currency conversion utility with mock rates
- ✅ Unique ID generation for fin records
- ✅ POST /api/fin/create endpoint
- ✅ PATCH /api/fin/update endpoint
- ✅ Comprehensive validation (date format, currency, amount, type)
- ✅ Ownership checks for updates
- ✅ Auto-recalculation of currency amounts on updates

**Documentation**:
- ✅ This implementation document
- ✅ Test cases with curl examples
- ✅ Error handling specifications

---

## Support & Contact

**Issues**: Report bugs or feature requests via GitHub Issues
**Documentation**: See [docs/database-setup.md](./database-setup.md) for schema details
**Testing**: Use Drizzle Studio for database inspection: `yarn db:studio`

---

**Generated**: 2025-12-25
**Last Updated**: 2025-12-25
**Version**: 1.0.0
