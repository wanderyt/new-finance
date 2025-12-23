# Authentication Flow Documentation

## TODO List

Implementation tasks for the authentication flow:

1. [x] **Add Login API** - Implement `POST /api/auth/login` route handler
   - Validate credentials
   - Generate session token
   - Set `fin_plat` cookie
   - Return user data

2. [x] **Add Verify API** - Implement `GET /api/auth/verify` route handler
   - Validate session token from cookie
   - Return user data if valid
   - Return 401 if invalid/expired

3. [x] **Client-side Cookie Check** - Check for `fin_plat` cookie on app initialization
   - Detect cookie presence in browser
   - Trigger verification flow if cookie exists

4. [x] **Verify Session on Load** - Use verify API to validate cookie
   - Call `/api/auth/verify` with cookie credentials
   - Update Redux state if verification passes

5. [x] **Navigate to Dashboard** - If verify passes, auto-login user
   - Dispatch Redux login action
   - Render Dashboard UI
   - Skip login screen

6. [x] **Navigate to Login** - If verify fails (including missing cookie)
   - Clear invalid cookie
   - Keep unauthenticated state
   - Show Login UI

---

## Implementation Status

**Status:** ✅ **Implemented** (Mock Authentication)

**Completed Features:**
- ✅ API Routes (Login, Verify, Logout) with mock validation
- ✅ Session token generation using Base64 encoding
- ✅ Cookie management with proper security flags
- ✅ Redux async thunks for authentication (using Axios)
- ✅ AuthProvider component for automatic session verification
- ✅ LoginForm integration with error handling and loading states
- ✅ Dashboard logout integration with loading states
- ✅ Client-side cookie detection and verification
- ✅ TypeScript type definitions for all API requests/responses
- ✅ Global loading component with full-screen loading UI
- ✅ Redux state for tracking verification status (`isVerifying`)
- ✅ Full-screen loading during initial session verification

**Mock Users Available:**
| Username | Password | Email |
|----------|----------|-------|
| `demo` | `password123` | demo@example.com |
| `john_doe` | `password123` | john@example.com |
| `jane_smith` | `password123` | jane@example.com |

**Implementation Details:**
- **Session Management:** Base64-encoded tokens (mock implementation)
- **Password Validation:** Plain text comparison (mock implementation)
- **HTTP Client:** Axios with `withCredentials: true`
- **Cookie Name:** `fin_plat`
- **Session Duration:** 7 days
- **Security:** HttpOnly cookies, Secure flag in production, SameSite protection

**File Structure:**
```
app/
├── api/
│   └── auth/
│       ├── login/route.ts        # Login API endpoint
│       ├── verify/route.ts       # Session verification endpoint
│       └── logout/route.ts       # Logout endpoint
├── lib/
│   ├── types/
│   │   └── api.ts               # TypeScript interfaces
│   ├── auth/
│   │   ├── mockUsers.ts         # Mock user database
│   │   └── session.ts           # Session token utilities
│   └── redux/
│       └── features/auth/
│           ├── authSlice.ts     # Redux async thunks + isVerifying state
│           └── authTypes.ts     # Updated with isVerifying field
├── components/
│   ├── providers/
│   │   └── AuthProvider.tsx    # Session verification provider with loading
│   ├── ui-kit/
│   │   └── Loading.tsx          # Reusable loading component
│   ├── login/
│   │   └── LoginForm.tsx        # Updated with async login
│   └── dashboard/
│       └── Dashboard.tsx        # Updated with async logout
└── layout.tsx                    # Includes AuthProvider
```

**Migration Path to Production:**
When ready for production authentication:
1. Replace Base64 tokens with JWT (install `jsonwebtoken`)
2. Replace plain text passwords with bcrypt hashing (install `bcryptjs`)
3. Replace mock users with database queries (Prisma, Drizzle, etc.)
4. All API routes and client code remain unchanged

---

## Overview

This document outlines the cookie-based authentication system for the new-finance application. The system uses session cookies for persistent authentication with login and verify API routes.

## System Architecture

### Components

1. **API Routes** (to be implemented)
   - `POST /api/auth/login` - User authentication endpoint
   - `GET /api/auth/verify` - Session validation endpoint
   - `POST /api/auth/logout` - Session termination endpoint

2. **Cookie Management**
   - Cookie name: `fin_plat`
   - Storage: HTTP-only, secure cookie
   - Purpose: Session token storage

3. **Redux State**
   - Auth slice: `app/lib/redux/features/auth/authSlice.ts`
   - Actions: `login()`, `logout()`, `verifySession()`
   - Selectors: `selectIsAuthenticated`, `selectCurrentUser`

---

## Authentication Flows

### 1. Initial Login Flow

**User Journey:**
```
Login Page → Enter Credentials → Submit → API Validation → Set Cookie → Update Redux → Dashboard
```

**Detailed Steps:**

1. **User Submits Credentials**
   - Component: `LoginForm.tsx`
   - User enters username and password
   - Form submission triggers login action

2. **API Request**
   ```typescript
   POST /api/auth/login
   Content-Type: application/json

   {
     "username": "user@example.com",
     "password": "********"
   }
   ```

3. **API Response (Success)**
   ```typescript
   HTTP/1.1 200 OK
   Set-Cookie: fin_plat=<session-token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
   Content-Type: application/json

   {
     "success": true,
     "user": {
       "id": "user-123",
       "username": "John Doe",
       "email": "user@example.com"
     }
   }
   ```

4. **Client-side Actions**
   - Cookie automatically stored by browser
   - Dispatch Redux `login(username)` action
   - Update auth state: `isAuthenticated = true`
   - Page transitions to Dashboard via AnimatePresence

5. **API Response (Failure)**
   ```typescript
   HTTP/1.1 401 Unauthorized
   Content-Type: application/json

   {
     "success": false,
     "error": "Invalid credentials"
   }
   ```

**Implementation Reference:**
```typescript
// app/components/login/LoginForm.tsx
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Important: include cookies
    });

    if (response.ok) {
      const data = await response.json();
      dispatch(login(data.user.username));
    } else {
      // Handle error (show toast, etc.)
    }
  } catch (error) {
    // Handle network error
  }
};
```

---

### 2. Auto-login Flow (Cookie Verification)

**User Journey:**
```
App Load → Check Cookie → Verify API Call → Valid? → Auto-login → Dashboard
                                         → Invalid? → Clear Cookie → Login Page
```

**Detailed Steps:**

1. **Application Initialization**
   - Component: `app/page.tsx` or `app/layout.tsx`
   - Check for `fin_plat` cookie existence
   - Trigger on first render

2. **Cookie Check**
   ```typescript
   // Client-side cookie check
   const hasAuthCookie = document.cookie
     .split('; ')
     .find(row => row.startsWith('fin_plat='));
   ```

3. **Verify API Request**
   ```typescript
   GET /api/auth/verify
   Cookie: fin_plat=<session-token>
   ```

4. **API Response (Valid Session)**
   ```typescript
   HTTP/1.1 200 OK
   Content-Type: application/json

   {
     "success": true,
     "user": {
       "id": "user-123",
       "username": "John Doe",
       "email": "user@example.com"
     }
   }
   ```
   - Dispatch Redux `login(username)` action
   - Auto-authenticate user
   - Render Dashboard

5. **API Response (Invalid Session)**
   ```typescript
   HTTP/1.1 401 Unauthorized
   Content-Type: application/json

   {
     "success": false,
     "error": "Invalid or expired session"
   }
   ```
   - Clear `fin_plat` cookie
   - Keep Redux state as unauthenticated
   - Show Login page

**Implementation Reference:**
```typescript
// app/providers/AuthProvider.tsx (to be created)
'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/app/lib/redux/hooks';
import { login } from '@/app/lib/redux/features/auth/authSlice';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          dispatch(login(data.user.username));
        } else {
          // Invalid session - clear cookie
          document.cookie = 'fin_plat=; Max-Age=0; path=/';
        }
      } catch (error) {
        console.error('Session verification failed:', error);
      }
    };

    verifySession();
  }, [dispatch]);

  return <>{children}</>;
}
```

---

### 3. Logout Flow

**User Journey:**
```
Dashboard → Click Logout → Clear Redux State → API Logout Call → Clear Cookie → Login Page
```

**Detailed Steps:**

1. **User Initiates Logout**
   - Component: `Dashboard.tsx`
   - User clicks logout button
   - Dispatch Redux `logout()` action

2. **Client-side State Clear**
   - Redux auth state reset to initial
   - `isAuthenticated = false`
   - `currentUser = null`

3. **API Request**
   ```typescript
   POST /api/auth/logout
   Cookie: fin_plat=<session-token>
   ```

4. **API Response**
   ```typescript
   HTTP/1.1 200 OK
   Set-Cookie: fin_plat=; Max-Age=0; path=/
   Content-Type: application/json

   {
     "success": true,
     "message": "Logged out successfully"
   }
   ```

5. **Client-side Cleanup**
   - Cookie cleared by API response
   - Page transitions to Login via AnimatePresence

**Implementation Reference:**
```typescript
// app/components/dashboard/Dashboard.tsx
const handleLogout = async () => {
  try {
    // Clear Redux state first
    dispatch(logout());

    // Call API to invalidate server-side session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    // Cookie will be cleared by API response
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

---

### 4. Session Expiry Flow

**User Journey:**
```
Authenticated User → API Call → 401 Response → Clear State → Clear Cookie → Login Page
```

**Detailed Steps:**

1. **Expired Session Detection**
   - Any API call returns 401 Unauthorized
   - Indicates session token is expired or invalid

2. **Global Error Handler**
   - Intercept 401 responses
   - Trigger logout flow

3. **Client-side Actions**
   - Dispatch Redux `logout()` action
   - Clear `fin_plat` cookie
   - Show notification: "Session expired. Please log in again."
   - Redirect to Login page

**Implementation Reference:**
```typescript
// app/lib/api/apiClient.ts (to be created)
export async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  if (response.status === 401) {
    // Session expired
    store.dispatch(logout());
    document.cookie = 'fin_plat=; Max-Age=0; path=/';
    // Optionally show toast notification
    return null;
  }

  return response;
}
```

---

## API Route Specifications

### POST /api/auth/login

**Purpose:** Authenticate user and create session

**Request:**
```typescript
{
  username: string;
  password: string;
}
```

**Response (Success - 200):**
```typescript
{
  success: true;
  user: {
    id: string;
    username: string;
    email: string;
  };
}
```

**Response (Failure - 401):**
```typescript
{
  success: false;
  error: string;
}
```

**Cookie Set:**
```
fin_plat=<JWT-or-session-token>;
HttpOnly;
Secure;
SameSite=Strict;
Max-Age=604800 (7 days)
```

---

### GET /api/auth/verify

**Purpose:** Validate existing session cookie

**Request:** Cookie-based (no body)

**Response (Valid - 200):**
```typescript
{
  success: true;
  user: {
    id: string;
    username: string;
    email: string;
  };
}
```

**Response (Invalid - 401):**
```typescript
{
  success: false;
  error: "Invalid or expired session";
}
```

---

### POST /api/auth/logout

**Purpose:** Terminate session and clear cookie

**Request:** Cookie-based (no body)

**Response (Success - 200):**
```typescript
{
  success: true;
  message: "Logged out successfully";
}
```

**Cookie Clear:**
```
fin_plat=; Max-Age=0; path=/
```

---

## Cookie Configuration

### Cookie Attributes

```typescript
{
  name: 'fin_plat',
  value: '<session-token>',
  httpOnly: true,        // Prevents JavaScript access (XSS protection)
  secure: true,          // HTTPS only (production)
  sameSite: 'strict',    // CSRF protection
  maxAge: 604800,        // 7 days in seconds
  path: '/',             // Available site-wide
}
```

### Security Considerations

| Attribute | Purpose | Value |
|-----------|---------|-------|
| `HttpOnly` | XSS Protection | `true` - JavaScript cannot access cookie |
| `Secure` | HTTPS Only | `true` - Only sent over HTTPS in production |
| `SameSite` | CSRF Protection | `Strict` - Only sent with same-site requests |
| `Max-Age` | Session Duration | `604800` - 7 days (adjustable) |
| `Path` | Cookie Scope | `/` - Available to entire application |

### Environment-based Configuration

```typescript
// Development
const cookieOptions = {
  httpOnly: true,
  secure: false,        // Allow HTTP in dev
  sameSite: 'lax',      // More permissive for local testing
  maxAge: 604800,
};

// Production
const cookieOptions = {
  httpOnly: true,
  secure: true,         // Require HTTPS
  sameSite: 'strict',   // Strict CSRF protection
  maxAge: 604800,
};
```

---

## Redux Integration

### Auth Slice Updates

The existing auth slice needs enhancement for API integration:

```typescript
// app/lib/redux/features/auth/authSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Async thunk for login
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    return data.user;
  }
);

// Async thunk for session verification
export const verifySessionAsync = createAsyncThunk(
  'auth/verify',
  async () => {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Session invalid');
    }

    const data = await response.json();
    return data.user;
  }
);

// Async thunk for logout
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Keep existing synchronous reducers for simple state updates
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload;
      state.lastLoginTime = Date.now();
      state.authStatus = "succeeded";
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.lastLoginTime = null;
      state.authStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    // Login async
    builder.addCase(loginAsync.pending, (state) => {
      state.authStatus = 'loading';
    });
    builder.addCase(loginAsync.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload.username;
      state.lastLoginTime = Date.now();
      state.authStatus = 'succeeded';
    });
    builder.addCase(loginAsync.rejected, (state) => {
      state.authStatus = 'failed';
    });

    // Verify async
    builder.addCase(verifySessionAsync.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.currentUser = action.payload.username;
      state.authStatus = 'succeeded';
    });
    builder.addCase(verifySessionAsync.rejected, (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.authStatus = 'idle';
    });

    // Logout async
    builder.addCase(logoutAsync.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.currentUser = null;
      state.lastLoginTime = null;
      state.authStatus = 'idle';
    });
  },
});
```

---

## Security Considerations

### 1. XSS Protection
- **HttpOnly cookies**: JavaScript cannot access `fin_plat` cookie
- **Input sanitization**: Sanitize all user inputs before rendering
- **Content Security Policy**: Implement CSP headers

### 2. CSRF Protection
- **SameSite=Strict**: Cookie only sent with same-site requests
- **CSRF tokens**: Consider adding CSRF tokens for state-changing operations
- **Origin validation**: Verify request origin on server

### 3. Session Management
- **Token expiration**: Sessions expire after 7 days (configurable)
- **Secure token generation**: Use cryptographically secure random tokens
- **Token storage**: Store session data securely on server (Redis/database)
- **Session invalidation**: Properly invalidate sessions on logout

### 4. HTTPS Enforcement
- **Secure flag**: Cookies only transmitted over HTTPS in production
- **HSTS header**: Enforce HTTPS at server level
- **Redirect HTTP**: Automatically redirect HTTP to HTTPS

### 5. Password Security
- **Hashing**: Use bcrypt or Argon2 for password hashing
- **Salt**: Unique salt per password
- **Never log passwords**: Sanitize logs to prevent password exposure

### 6. Rate Limiting
- **Login attempts**: Limit failed login attempts (e.g., 5 per 15 minutes)
- **API rate limiting**: Prevent brute force attacks
- **Account lockout**: Temporary lockout after repeated failures

### 7. Token Refresh Strategy (Future)
- **Short-lived access tokens**: 15-minute access tokens
- **Long-lived refresh tokens**: 7-day refresh tokens in HttpOnly cookies
- **Automatic refresh**: Silently refresh before expiration
- **Revocation**: Ability to revoke refresh tokens

---

## Implementation Checklist

### Phase 1: API Routes Setup
- [ ] Create `/api/auth/login` route handler
- [ ] Create `/api/auth/verify` route handler
- [ ] Create `/api/auth/logout` route handler
- [ ] Implement session token generation (JWT or session ID)
- [ ] Set up session storage (Redis, database, or in-memory for dev)
- [ ] Configure cookie options (httpOnly, secure, sameSite)

### Phase 2: Auth Provider Component
- [ ] Create `AuthProvider` component for session verification
- [ ] Implement cookie check on app load
- [ ] Call verify API on initialization
- [ ] Handle auto-login on valid session
- [ ] Clear cookie on invalid session
- [ ] Add to layout.tsx alongside ReduxProvider

### Phase 3: Redux Integration
- [ ] Add async thunks to auth slice (`loginAsync`, `verifySessionAsync`, `logoutAsync`)
- [ ] Update LoginForm to use `loginAsync`
- [ ] Update Dashboard logout to use `logoutAsync`
- [ ] Add loading states for async operations
- [ ] Handle error states and display user feedback

### Phase 4: Error Handling
- [ ] Create global API client with 401 interceptor
- [ ] Handle session expiry across all API calls
- [ ] Display toast notifications for auth errors
- [ ] Implement graceful degradation

### Phase 5: Security Hardening
- [ ] Enable HTTPS in production
- [ ] Configure Content Security Policy headers
- [ ] Implement rate limiting on auth endpoints
- [ ] Add CSRF token validation (optional)
- [ ] Set up logging and monitoring for auth events

### Phase 6: Testing
- [ ] Test login flow end-to-end
- [ ] Test auto-login on page refresh
- [ ] Test logout flow
- [ ] Test session expiry handling
- [ ] Test with expired cookies
- [ ] Test network error scenarios
- [ ] Test concurrent session handling

### Phase 7: Documentation Updates
- [ ] Update CLAUDE.md with auth implementation details
- [ ] Add API route documentation
- [ ] Document environment variables needed
- [ ] Create troubleshooting guide

---

## Future Enhancements

### Token Refresh Strategy
- Implement refresh token rotation
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Silent token refresh before expiration

### Multi-device Session Management
- Track active sessions per user
- Allow users to view and revoke sessions
- Push notifications for new logins
- Device fingerprinting

### Social Authentication
- OAuth integration (Google, GitHub, etc.)
- SSO support
- Account linking

### Two-Factor Authentication
- TOTP (Time-based One-Time Password)
- SMS verification
- Backup codes

### Password Reset Flow
- Email-based password reset
- Temporary reset tokens
- Password strength requirements

### Audit Logging
- Log all authentication events
- Track login attempts (success/failure)
- IP address tracking
- User activity monitoring

---

## Sequence Diagrams

### Login Flow
```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────┐
│  Client  │     │ LoginForm │     │   API    │     │ Redux │
└────┬─────┘     └─────┬─────┘     └────┬─────┘     └───┬───┘
     │                 │                 │               │
     │  1. Submit      │                 │               │
     │────────────────>│                 │               │
     │                 │                 │               │
     │                 │  2. POST /login │               │
     │                 │────────────────>│               │
     │                 │                 │               │
     │                 │    3. Validate  │               │
     │                 │       & Set     │               │
     │                 │       Cookie    │               │
     │                 │<────────────────│               │
     │                 │                 │               │
     │                 │  4. dispatch(login)             │
     │                 │────────────────────────────────>│
     │                 │                 │               │
     │     5. Navigate to Dashboard      │               │
     │<──────────────────────────────────────────────────│
```

### Auto-login Flow
```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌───────┐
│  Client  │     │ AuthProvider │     │   API    │     │ Redux │
└────┬─────┘     └──────┬───────┘     └────┬─────┘     └───┬───┘
     │                  │                   │               │
     │  1. App Load     │                   │               │
     │─────────────────>│                   │               │
     │                  │                   │               │
     │                  │  2. Check Cookie  │               │
     │                  │     Exists        │               │
     │                  │                   │               │
     │                  │  3. GET /verify   │               │
     │                  │──────────────────>│               │
     │                  │                   │               │
     │                  │  4. Valid Session │               │
     │                  │<──────────────────│               │
     │                  │                   │               │
     │                  │  5. dispatch(login)               │
     │                  │──────────────────────────────────>│
     │                  │                   │               │
     │  6. Show Dashboard                   │               │
     │<─────────────────────────────────────────────────────│
```

### Logout Flow
```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌───────┐
│  Client  │     │ Dashboard │     │   API    │     │ Redux │
└────┬─────┘     └─────┬─────┘     └────┬─────┘     └───┬───┘
     │                 │                 │               │
     │  1. Click       │                 │               │
     │     Logout      │                 │               │
     │────────────────>│                 │               │
     │                 │                 │               │
     │                 │  2. dispatch(logout)            │
     │                 │────────────────────────────────>│
     │                 │                 │               │
     │                 │  3. POST /logout│               │
     │                 │────────────────>│               │
     │                 │                 │               │
     │                 │  4. Clear Cookie│               │
     │                 │<────────────────│               │
     │                 │                 │               │
     │  5. Redirect to Login             │               │
     │<──────────────────────────────────────────────────│
```

---

## Environment Variables

```env
# .env.local (Development)
NEXT_PUBLIC_API_URL=http://localhost:3000
SESSION_SECRET=<random-secret-key-for-dev>
SESSION_MAX_AGE=604800  # 7 days
COOKIE_SECURE=false      # Allow HTTP in dev

# .env.production (Production)
NEXT_PUBLIC_API_URL=https://your-domain.com
SESSION_SECRET=<cryptographically-secure-secret>
SESSION_MAX_AGE=604800  # 7 days
COOKIE_SECURE=true      # Require HTTPS
```

---

## References

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Redux Async Thunks](https://redux-toolkit.js.org/api/createAsyncThunk)
- [HTTP Cookies (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Status:** Planning / Design Phase
**Next Steps:** Implement API routes and AuthProvider component
