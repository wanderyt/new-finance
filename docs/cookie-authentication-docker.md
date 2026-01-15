# Cookie Authentication Issues in Docker Deployment

## Problem Description

When deploying the application to Docker on Synology NAS (or similar environments) and accessing via HTTP with a custom port (e.g., `http://10.0.0.113:13000`), authentication fails despite successful login:

1. ✅ Login API returns `200 OK` with `Set-Cookie: fin_plat=...` header
2. ❌ Browser rejects/ignores the cookie
3. ❌ Subsequent API calls (`/api/verify`, `/api/fin`) don't include the cookie
4. ❌ User sees empty dashboard because they're not authenticated

## Root Cause Analysis

### The Cookie Security Problem

**In Production (Docker), the application sets:**
```typescript
Set-Cookie: fin_plat=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Key issue:** `Secure` flag requires HTTPS

The `Secure` attribute tells browsers: "Only send this cookie over HTTPS connections."

When you access the app via HTTP (`http://10.0.0.113:13000`):
- Browser receives the cookie with `Secure` flag
- Browser **immediately rejects** it because connection is not HTTPS
- Cookie never gets stored
- Subsequent requests don't include the cookie
- Authentication fails

### Why It Works Locally

**Development mode** (`NODE_ENV=development`):
```typescript
Set-Cookie: fin_plat=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800
```

No `Secure` flag → Works over HTTP on `localhost:3000`

**Production mode** (`NODE_ENV=production`):
```typescript
Set-Cookie: fin_plat=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

`Secure` flag present → Requires HTTPS → Fails on HTTP

### Browser Behavior

Modern browsers enforce strict cookie security:

| Scenario | Secure Flag | Connection | Result |
|----------|-------------|------------|--------|
| Development | ❌ Not set | HTTP | ✅ Cookie accepted |
| Production on HTTP | ✅ Set | HTTP | ❌ Cookie rejected |
| Production on HTTPS | ✅ Set | HTTPS | ✅ Cookie accepted |

**Browser console warning:**
```
Cookie "fin_plat" has been rejected because it is foreign and its 'SameSite' attribute is 'strict' or 'lax', or it has the 'Secure' attribute but the connection is not secure.
```

## The Code Issue

### Current Implementation

**File:** `app/api/auth/login/route.ts` (lines 76-82)

```typescript
response.cookies.set("fin_plat", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",  // ← Always true in Docker
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 604800,
  path: "/",
});
```

**File:** `app/lib/auth/session.ts` (lines 9-16)

```typescript
export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,  // ← Always true in Docker
    sameSite: (IS_PRODUCTION ? "strict" : "lax") as "strict" | "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}
```

**Problem:** Hardcoded to use `secure: true` in production, no way to disable for HTTP access.

## Solution Options

### Option 1: Disable Secure Cookies for Private Networks (Recommended)

**Best for:** Private home/office networks where app is only accessible internally

**Pros:**
- Simple implementation (single environment variable)
- Works with HTTP on private IP addresses
- No SSL certificate setup required
- Suitable for 99% of home NAS deployments

**Cons:**
- Cookies sent over unencrypted HTTP (acceptable on private 10.x.x.x network)
- Not suitable if exposing app to public internet

**Security Note:** On a private network (10.0.0.0/8, 192.168.0.0/16), HTTP without `Secure` flag is acceptable because:
- Network traffic is contained within your home/office
- No external attackers can intercept traffic
- Physical security is typically adequate

### Option 2: Setup HTTPS with SSL Certificate

**Best for:** Public-facing deployments or high-security requirements

**Pros:**
- Proper end-to-end encryption
- Cookies work with `Secure` flag as intended
- Industry best practice

**Cons:**
- Requires SSL certificate (self-signed or Let's Encrypt)
- Requires reverse proxy (Nginx/Caddy) setup
- More complex configuration
- Overkill for most home NAS use cases

**Not recommended** unless:
- Exposing app to internet (port forwarding from WAN)
- Organizational security policies require HTTPS
- You already have reverse proxy infrastructure

### Option 3: Use Both (Conditional Security)

Allow environment variable to control security based on deployment:
- Private network deployment: `SECURE_COOKIES=false` (use HTTP)
- Public deployment: `SECURE_COOKIES=true` (requires HTTPS)

**This is our recommended approach.**

## Implementation

### Changes Required

#### 1. Update Cookie Configuration Helper

**File:** `app/lib/auth/session.ts`

```typescript
// Get cookie configuration based on environment
export function getCookieOptions() {
  // Allow disabling secure cookies for HTTP access on private networks
  // Set SECURE_COOKIES=false in environment to disable
  const useSecure = IS_PRODUCTION && process.env.SECURE_COOKIES !== 'false';

  return {
    httpOnly: true,
    secure: useSecure,
    sameSite: "lax" as const,  // More permissive than "strict" for better compatibility
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}
```

**Key changes:**
- Check `SECURE_COOKIES` environment variable
- Default to secure in production, but allow override
- Use `sameSite: "lax"` instead of `"strict"` for better compatibility with custom ports

#### 2. Centralize Cookie Options in Login Route

**File:** `app/api/auth/login/route.ts`

```typescript
import { getCookieOptions } from "@/app/lib/auth/session";

// ... in POST handler ...

// Set cookie on response using centralized options
response.cookies.set("fin_plat", token, getCookieOptions());
```

**Benefits:**
- Single source of truth for cookie configuration
- Consistent behavior across all auth routes
- Easier to maintain

#### 3. Add Environment Variable to Dockerfile

**File:** `Dockerfile`

```dockerfile
# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/db/finance.db
ENV SECURE_COOKIES=false  # Allow HTTP access on private networks
```

#### 4. Update docker-compose.yml

**File:** `docker-compose.yml`

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_PATH=/app/db/finance.db
  - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
  - SECURE_COOKIES=false  # Allow HTTP access
```

### Deployment in Synology Container Manager

When creating/editing the container, add environment variable:

**Environment Variables:**
- `NODE_ENV=production`
- `DATABASE_PATH=/app/db/finance.db`
- `GOOGLE_GEMINI_API_KEY=your_key_here`
- `SECURE_COOKIES=false` ← **Add this**

## Verification Steps

### Before Fix

1. **Login fails silently:**
   ```
   POST /api/auth/login → 200 OK ✅
   GET /api/auth/verify → 401 Unauthorized ❌
   ```

2. **Browser DevTools → Application → Cookies:**
   - `fin_plat` cookie is **missing**

3. **Browser DevTools → Console:**
   - Warning: "Cookie rejected because connection is not secure"

### After Fix

1. **Login succeeds:**
   ```
   POST /api/auth/login → 200 OK ✅
   GET /api/auth/verify → 200 OK ✅
   ```

2. **Browser DevTools → Application → Cookies:**
   - `fin_plat` cookie is **present**
   - Properties: `HttpOnly`, `SameSite=Lax`, `Path=/`
   - No `Secure` flag (when `SECURE_COOKIES=false`)

3. **Dashboard loads with data:**
   - API calls include `Cookie: fin_plat=...` header
   - User data and fin records load successfully

### Testing Commands

```bash
# 1. Rebuild Docker image
docker build -t new-finance:latest .

# 2. Stop old container
docker stop new-finance
docker rm new-finance

# 3. Run with new environment variable
docker run -d \
  -p 13000:3000 \
  -v /volume1/docker/new-finance-data:/app/db \
  -e NODE_ENV=production \
  -e DATABASE_PATH=/app/db/finance.db \
  -e SECURE_COOKIES=false \
  -e GOOGLE_GEMINI_API_KEY=your_key \
  --name new-finance \
  new-finance:latest

# 4. Check logs
docker logs -f new-finance

# 5. Test login
curl -X POST http://10.0.0.113:13000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}' \
  -v

# Look for: Set-Cookie: fin_plat=... (without Secure flag)
```

## Security Considerations

### Is This Safe?

**Yes, for private networks:**
- Your home network (10.x.x.x, 192.168.x.x) is not exposed to internet
- Attackers would need physical access to your network
- Traffic between your device and NAS stays on local network

**No, for public internet:**
- Don't expose app to internet without HTTPS
- Don't forward port 13000 from your router to NAS
- If you need public access, use reverse proxy with SSL

### Best Practices

1. **For private home use:** `SECURE_COOKIES=false` is perfectly acceptable
2. **For internet-facing:** Use reverse proxy with HTTPS + Let's Encrypt
3. **For organizations:** Follow your security policies (likely requires HTTPS)

### Additional Security Layers

Consider these additional protections:

1. **Network isolation:**
   - Keep NAS on private VLAN
   - Use firewall rules to restrict access

2. **VPN access:**
   - Access NAS through VPN instead of port forwarding
   - Maintains security without SSL complexity

3. **Synology's reverse proxy:**
   - Use built-in reverse proxy with SSL certificate
   - Access via `https://nas.local/finance` instead of `http://ip:13000`

## Troubleshooting

### Cookie Still Not Working

1. **Clear browser cookies completely:**
   - DevTools → Application → Cookies → Clear all

2. **Check environment variable is set:**
   ```bash
   docker exec new-finance printenv | grep SECURE_COOKIES
   # Should show: SECURE_COOKIES=false
   ```

3. **Verify cookie in response headers:**
   ```bash
   curl -X POST http://10.0.0.113:13000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"demo","password":"demo123"}' \
     -v 2>&1 | grep "Set-Cookie"

   # Should see: Set-Cookie: fin_plat=...; HttpOnly; SameSite=Lax
   # Should NOT see: Secure flag
   ```

### SameSite Issues

If you still have issues, the `SameSite` attribute might be too restrictive:

**Current:** `SameSite=Lax`
- Works for same-site requests
- Works for top-level navigation
- May fail for cross-origin requests

**If needed:** Change to `SameSite=None` (requires `Secure` flag, so only with HTTPS)

## Migration Guide

### Existing Deployments

If you already have a running container:

1. **Stop container:**
   ```bash
   docker stop new-finance
   ```

2. **Add environment variable in Container Manager:**
   - Edit container settings
   - Add `SECURE_COOKIES=false` to environment

3. **Rebuild image with updated code:**
   ```bash
   docker build -t new-finance:latest .
   ```

4. **Start container:**
   ```bash
   docker start new-finance
   ```

5. **Clear browser cookies and re-login**

### Future HTTPS Migration

If you later setup HTTPS (reverse proxy):

1. **Remove or change environment variable:**
   ```bash
   SECURE_COOKIES=true  # or remove entirely
   ```

2. **Cookies will automatically use `Secure` flag**

3. **Users will need to re-login** (cookies from HTTP won't transfer to HTTPS)

## References

- [MDN: Set-Cookie Secure attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#secure)
- [MDN: SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Synology DSM: Container Manager User Guide
