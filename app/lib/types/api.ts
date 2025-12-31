// User data structure (with password for mock auth)
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // Plain text for mock - would be hashed in production
}

// Client-safe user data (excludes sensitive fields)
export interface UserData {
  id: string;
  username: string;
  email: string;
}

// Login request payload
export interface LoginRequest {
  username: string;
  password: string;
}

// Login response (success)
export interface LoginResponse {
  success: true;
  user: UserData;
}

// Error response
export interface ErrorResponse {
  success: false;
  error: string;
}

// Verify response
export interface VerifyResponse {
  success: true;
  user: UserData;
}

// Logout response
export interface LogoutResponse {
  success: true;
  message: string;
}

// Session token payload (stored in cookie)
export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  createdAt: number;
}

// ========== Fin Transaction Types ==========

// Line Item for fin record
export interface FinLineItem {
  name: string;
  originalAmountCents: number;
  qty?: number;
  unit?: string;
  unitPriceCents?: number;
  personId?: number;
  category?: string;
  subcategory?: string;
  notes?: string;
}

// Create Fin Request
export interface CreateFinRequest {
  // Transaction metadata
  type?: "expense" | "income"; // default: 'expense'
  date: string; // ISO 8601 with time in UTC (required) e.g., "2025-12-29T15:30:00Z"
  merchant?: string;
  comment?: string;
  place?: string;
  city?: string;

  // Categorization
  category?: string;
  subcategory?: string;
  details?: string;

  // Amount (required)
  originalCurrency: "CAD" | "USD" | "CNY";
  originalAmountCents: number; // Amount in cents (e.g., $10.50 = 1050)

  // Line items (optional)
  lineItems?: FinLineItem[];

  // Scheduling (optional)
  isScheduled?: boolean; // default: false
  frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "annually"; // required if isScheduled = true
  scheduleRuleId?: number; // auto-generated from frequency
  scheduledOn?: string; // ISO 8601 with time in UTC, only if isScheduled = true
}

// Update Fin Request
export interface UpdateFinRequest {
  finId: string; // Required to identify the record

  // Fields that can be updated
  type?: "expense" | "income";
  date?: string; // ISO 8601 with time in UTC
  merchant?: string;
  comment?: string;
  place?: string;
  city?: string;

  category?: string;
  subcategory?: string;
  details?: string;

  originalCurrency?: "CAD" | "USD" | "CNY";
  originalAmountCents?: number;

  // Line items (optional)
  lineItems?: FinLineItem[];

  // CANNOT update: isScheduled, scheduleRuleId, scheduledOn, finId, userId
}

// Fin Response (client-safe)
export interface FinData {
  finId: string;
  userId: number;
  type: string;
  date: string;
  merchant: string | null;
  comment: string | null;
  place: string | null;
  city: string | null;
  category: string | null;
  subcategory: string | null;
  details: string | null;
  originalCurrency: string;
  originalAmountCents: number;
  fxId: number | null;
  amountCadCents: number;
  amountUsdCents: number;
  amountCnyCents: number;
  amountBaseCadCents: number;
  isScheduled: boolean;
  scheduleRuleId: number | null;
  scheduledOn: string | null;
}

// Create Fin Response
export interface CreateFinResponse {
  success: true;
  data: FinData;
}

// Update Fin Response
export interface UpdateFinResponse {
  success: true;
  data: FinData;
}

// ========== Fin List Types ==========

// List Fin Query Parameters (from URL)
export interface ListFinQueryParams {
  limit?: string;
  offset?: string;
  type?: "expense" | "income" | "all";
  dateFrom?: string; // ISO 8601 with timezone
  dateTo?: string; // ISO 8601 with timezone
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// List Fin Response
export interface ListFinResponse {
  success: true;
  data: FinData[];
  pagination: PaginationMeta;
}
