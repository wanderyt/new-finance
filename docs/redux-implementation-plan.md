# Redux State Management Implementation Plan

## Overview
Implement Redux Toolkit for centralized state management in the Next.js 16 application, replacing the current useState-based authentication state with a scalable Redux solution.

## Progress Checklist

### Phase 1: Setup
- [x] Install Redux dependencies (`@reduxjs/toolkit`, `react-redux`)
- [x] Create directory structure (`app/lib/redux/`)

### Phase 2: Redux Infrastructure
- [x] Create auth types file (`app/lib/redux/features/auth/authTypes.ts`)
- [x] Create auth slice with login/logout reducers (`authSlice.ts`)
- [x] Create Redux store configuration (`store.ts`)
- [x] Create typed Redux hooks (`hooks.ts`)
- [x] Create Redux Provider component (`provider.tsx`)

### Phase 3: Integration
- [x] Integrate ReduxProvider in `app/layout.tsx`

### Phase 4: Component Migration
- [x] Migrate LoginForm to use Redux dispatch
- [x] Migrate Dashboard to use Redux selectors
- [x] Migrate `app/page.tsx` to use Redux

### Phase 5: Testing & Validation
- [x] Test login flow (form → dashboard transition)
- [x] Test logout flow (dashboard → login transition)
- [x] Verify Redux DevTools shows actions
- [x] Run build and verify no TypeScript errors
- [ ] Run linter

### Phase 6: Optional Enhancements
- [ ] Add redux-persist for state persistence
- [ ] Test state persists across page refreshes

---

## Implementation Details

### Current State Analysis
- **app/page.tsx**: Uses useState for `isAuthenticated` and `currentUser`
- **LoginForm**: Local form state, receives `onLoginSuccess` callback
- **Dashboard**: Stateless, receives `username` and `onLogout` props
- **Pattern**: Prop drilling from root to components
- **Issue**: No state persistence, tight coupling between components

### Redux Architecture

#### Store Structure
```
app/lib/redux/
├── store.ts              # Store configuration, RootState, AppDispatch types
├── hooks.ts              # Typed useAppDispatch & useAppSelector hooks
├── provider.tsx          # Client-side Redux Provider with useRef pattern
└── features/
    └── auth/
        ├── authSlice.ts  # Auth slice: login/logout reducers & selectors
        └── authTypes.ts  # TypeScript interfaces for auth state
```

#### Auth State Schema
```typescript
interface AuthState {
  isAuthenticated: boolean
  currentUser: string | null
  lastLoginTime: number | null
  authStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
}
```

#### Actions & Reducers
- `login(username)`: Set authenticated, store username and timestamp
- `logout()`: Clear state, reset to initial values
- Selectors: `selectIsAuthenticated`, `selectCurrentUser`, `selectAuthState`

### Files to Create (5)

1. **app/lib/redux/features/auth/authTypes.ts**
   - Define `AuthState` interface
   - Export all auth-related types

2. **app/lib/redux/features/auth/authSlice.ts**
   - Create slice with `createSlice`
   - Implement `login` and `logout` reducers
   - Export action creators and selectors
   - Set initial state

3. **app/lib/redux/store.ts**
   - Configure store with `configureStore`
   - Export `RootState` and `AppDispatch` types
   - Enable Redux DevTools for development

4. **app/lib/redux/hooks.ts**
   - Create typed `useAppDispatch` hook
   - Create typed `useAppSelector` hook
   - Export for use in components

5. **app/lib/redux/provider.tsx**
   - Mark as `"use client"`
   - Use `useRef` for store instance (Next.js App Router pattern)
   - Wrap children with `<Provider store={store}>`

### Files to Modify (4)

1. **app/layout.tsx**
   - Import `ReduxProvider`
   - Wrap `{children}` with `<ReduxProvider>`
   - Layout remains server component

2. **app/components/login/LoginForm.tsx**
   - Import `useAppDispatch` and `login` action
   - Remove `onLoginSuccess` from props interface
   - Replace callback with `dispatch(login(username))`
   - Keep form state (username, password) local

3. **app/components/dashboard/Dashboard.tsx**
   - Import `useAppSelector`, `useAppDispatch`, and `logout` action
   - Remove props interface entirely
   - Use `selectCurrentUser` to get username
   - Replace `onLogout` prop with `dispatch(logout())`

4. **app/page.tsx**
   - Remove all `useState` hooks and imports
   - Import `useAppSelector` and selectors
   - Use `selectIsAuthenticated` and `selectCurrentUser`
   - Remove handler functions (`handleLoginSuccess`, `handleLogout`)
   - Keep all AnimatePresence and motion logic unchanged

### Key Technical Decisions

#### Next.js 16 App Router Integration
- Provider must be client component with `"use client"`
- Use `useRef` pattern for store instance (prevents re-creation)
- Layout remains server component, wraps provider
- All components using Redux must be client components (already are)

#### TypeScript Strategy
- Export `RootState` and `AppDispatch` from store
- Create pre-typed hooks to avoid repetitive typing
- Use `PayloadAction<T>` for action payloads
- Let selectors infer return types automatically

#### State Organization
- Keep form state local (username/password inputs in LoginForm)
- Only global/shared state goes in Redux (authentication)
- Feature-based organization for scalability

#### Performance
- Use selector pattern for optimal re-renders
- Redux DevTools only in development
- Memoized selectors with Reselect (future enhancement)

### Benefits After Implementation
✅ No prop drilling - components access state directly
✅ Centralized state management - single source of truth
✅ Better scalability - easy to add user, accounts, transactions slices
✅ Redux DevTools - time-travel debugging and state inspection
✅ Type safety - full TypeScript support throughout
✅ State persistence ready - easy to add redux-persist
✅ Testability - easier to test components and state logic separately

### Future Enhancements
- Add redux-persist for authentication across refreshes
- Create async thunks for real API authentication
- Add user profile slice for additional user data
- Implement accounts and transactions slices for financial data
- Add RTK Query for advanced data fetching and caching

### Rollback Plan
If issues arise, rollback is straightforward:
1. Remove ReduxProvider from layout.tsx
2. Restore useState in page.tsx with handlers
3. Restore props in LoginForm and Dashboard
4. Remove app/lib/redux/ directory
5. Uninstall packages: `yarn remove @reduxjs/toolkit react-redux`
