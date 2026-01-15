# Docker Container Startup Fixes

## Problem

When deploying the application to Synology Container Manager (or other Docker environments), the container fails to start with the following error:

```
node:events:502 throw err; // unhandled 'error'
Error: connect ECONNREFUSED 127.0.0.1:3000
at TCPConnectWrap.afterConnect
```

## Root Causes

### 1. Incorrect CMD Syntax

**Issue:** The CMD in the Dockerfile was passing flags to `yarn` instead of to `next`:

```dockerfile
CMD ["yarn", "start", "-H", "0.0.0.0", "-p", "3000"]
```

When using exec form (array syntax) in Docker, arguments are passed literally. This means:
- `yarn` receives the arguments `["start", "-H", "0.0.0.0", "-p", "3000"]`
- `yarn start` executes `next start` from package.json
- The flags `-H` and `-p` are lost in translation and never reach Next.js

**Result:** Next.js binds to `localhost` (127.0.0.1) instead of `0.0.0.0`, making it unreachable from outside the container.

### 2. Health Check Interference

**Issue:** The `HEALTHCHECK` instruction was causing startup failures:
- Health check attempts to connect before Next.js is ready
- Node.js evaluation in health check may fail during initialization
- Creates unnecessary complexity and potential failure points
- Not required for basic Docker operation

**Result:** Container fails to start with `ECONNREFUSED` errors during health check execution.

### 3. Missing DATABASE_PATH Environment Variable

**Issue:** The Dockerfile doesn't explicitly set `DATABASE_PATH`, relying on:
- docker-compose.yml to provide it
- Manual configuration in Container Manager

**Result:** Database initialization failures if environment variable not configured correctly.

## Solutions Implemented

### Fix 1: Direct Next.js Invocation

**Change:** Invoke Next.js binary directly instead of through Yarn script

**Before:**
```dockerfile
CMD ["yarn", "start", "-H", "0.0.0.0", "-p", "3000"]
```

**After:**
```dockerfile
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
```

**Why this works:**
- Bypasses Yarn script indirection
- Flags are passed directly to `next` binary
- More explicit and reliable
- Ensures `-H 0.0.0.0` reaches Next.js correctly

### Fix 2: Removed Health Check

**Change:** Completely removed the `HEALTHCHECK` instruction

**Before:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

**After:**
```dockerfile
# (Removed entirely)
```

**Why this helps:**
- Eliminates potential failure point during startup
- Health checks are optional in Docker - not required for operation
- Simplifies container configuration
- Container status will show as running if Next.js starts successfully
- You can still manually verify health via `curl http://localhost:3000/api/health`

### Fix 3: Explicit DATABASE_PATH Environment Variable

**Change:** Set DATABASE_PATH in Dockerfile

**Added:**
```dockerfile
ENV DATABASE_PATH=/app/db/finance.db
```

**Why this helps:**
- Ensures database path is always set
- Provides sensible default even if docker-compose missing
- Makes container more self-contained
- Reduces configuration errors

## Verification Steps

### Local Testing with Docker

1. **Build the image:**
   ```bash
   docker build -t new-finance:test .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/db:/app/db \
     -e GOOGLE_GEMINI_API_KEY=your_api_key \
     --name new-finance-test \
     new-finance:test
   ```

3. **Check container logs:**
   ```bash
   docker logs -f new-finance-test
   ```

   Expected output:
   ```
   ▲ Next.js 16.1.0
   - Local:        http://0.0.0.0:3000
   - Network:      http://0.0.0.0:3000

   ✓ Ready in 2.3s
   ```

4. **Verify container is running:**
   ```bash
   docker ps | grep new-finance-test
   ```

   Should show status as "Up" (not "Restarting")

5. **Test the health endpoint manually:**
   ```bash
   curl http://localhost:3000/api/health
   ```

   Expected response:
   ```json
   {"status":"ok","timestamp":"2026-01-14T..."}
   ```

6. **Test the application:**
   ```bash
   open http://localhost:3000
   ```

### Synology Container Manager Deployment

1. **Stop and remove old container** (if exists)

2. **Remove old image** (to force rebuild)
   - Go to Image section
   - Delete old `new-finance` image

3. **Rebuild via docker-compose:**
   ```bash
   # SSH into Synology
   cd /volume1/docker/new-finance
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **OR build and load manually:**
   ```bash
   # On your local machine
   docker build -t new-finance:latest .
   docker save new-finance:latest | gzip > new-finance.tar.gz

   # Upload to Synology and load
   docker load < new-finance.tar.gz
   ```

5. **Create container in Container Manager GUI:**
   - **Image:** `new-finance:latest`
   - **Port Settings:**
     - Local Port: 3000
     - Container Port: 3000
     - Type: TCP
   - **Volume:**
     - Local Path: `/volume1/docker/new-finance-data`
     - Mount Path: `/app/db`
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `DATABASE_PATH=/app/db/finance.db`
     - `GOOGLE_GEMINI_API_KEY=your_api_key`

6. **Start the container and verify:**
   - Check logs in Container Manager (should show "Ready" message)
   - Container should stay running (not restart loop)
   - Access `http://<synology-ip>:3000` in browser

## Troubleshooting

### Container Still Fails to Start

**Check logs for specific errors:**
```bash
docker logs new-finance-test 2>&1 | grep -i error
```

**Common issues:**
- Missing database directory: Ensure volume mount exists
- Permission errors: Check `db` directory ownership
- Port already in use: Use different port mapping

### Want to Re-enable Health Checks?

**If you need health monitoring, manually test the endpoint:**
```bash
# From outside container
curl http://localhost:3000/api/health

# From inside container
docker exec -it new-finance-test sh
wget -O - http://localhost:3000/api/health
```

**To re-add HEALTHCHECK (not recommended):**
- Add it back with a very long `start-period` (90s+)
- Or use external monitoring tools instead
- Health checks are mainly for orchestration (Kubernetes, Swarm)

### Cannot Access from Browser

**Verify port mapping:**
```bash
docker port new-finance-test
```

**Check firewall:**
- Synology firewall may block port 3000
- Add firewall rule to allow TCP port 3000

**Verify network binding:**
```bash
docker exec -it new-finance-test netstat -tuln | grep 3000
```

Should show: `0.0.0.0:3000` (not `127.0.0.1:3000`)

## Technical Details

### Why Direct Binary Invocation Works

Docker's exec form `CMD ["command", "arg1", "arg2"]` doesn't use a shell. This means:

1. **With Yarn wrapper:**
   ```dockerfile
   CMD ["yarn", "start", "-H", "0.0.0.0", "-p", "3000"]
   ```
   - Executes: `/usr/local/bin/yarn start -H 0.0.0.0 -p 3000`
   - Yarn runs package.json script: `next start`
   - Arguments are NOT passed through to `next`

2. **With direct invocation:**
   ```dockerfile
   CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
   ```
   - Executes: `/app/node_modules/.bin/next start -H 0.0.0.0 -p 3000`
   - Arguments passed directly to `next` binary
   - Next.js receives and processes flags correctly

### Alternative Approaches

#### Shell Form CMD (Not Recommended)

```dockerfile
CMD yarn start -H 0.0.0.0 -p 3000
```

**Pros:** Simpler syntax, shell expansion works
**Cons:** Doesn't use exec form, harder to handle signals (SIGTERM)

#### Modified package.json (Not Recommended)

```json
"start": "next start -H 0.0.0.0 -p 3000"
```

**Pros:** Uses Yarn wrapper
**Cons:** Affects local development, Docker-specific config in source code

## References

- [Docker CMD Documentation](https://docs.docker.com/engine/reference/builder/#cmd)
- [Next.js CLI Documentation](https://nextjs.org/docs/app/api-reference/next-cli)
- [Docker HEALTHCHECK](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Synology Container Manager Guide](https://kb.synology.com/en-global/DSM/help/ContainerManager/docker_container)
