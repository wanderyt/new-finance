# Synology Docker Database Permission Fix

## Problem

Docker containers running on Synology NAS encounter "readonly database" errors when trying to write to SQLite database files.

**Error message**:
```
SqliteError: attempt to write a readonly database
  code: 'SQLITE_READONLY'
```

## Root Cause

File ownership mismatch between the Synology host system and the Docker container:

1. **Container Configuration**:
   - Container runs as non-root user: `nextjs` (uid=1001, gid=1001)
   - This is defined in [Dockerfile:69-70](../Dockerfile#L69-L70)

2. **Synology Host**:
   - Database files are owned by Synology user (uid varies, typically 1000, 1024, or 1026)
   - Volume mount: `./db:/app/db` maps host directory to container

3. **Permission Conflict**:
   - Container user (uid=1001) tries to write to file owned by different user
   - Linux file permissions prevent write access
   - SQLite opens database in readonly mode

## Solution: Fix File Ownership on Synology

### Step 1: Check Current Permissions

SSH into your Synology NAS and check the current ownership:

```bash
# SSH into Synology
ssh admin@your-nas-ip

# Navigate to the Docker volume directory
# Adjust path based on your docker-compose.yml volume mount
cd /volume1/docker/new-finance/db

# Check current ownership and permissions
ls -la

# Output example:
# drwxr-xr-x  2 admin    users    4096 Jan 15 10:30 .
# -rw-r--r--  1 admin    users 6877184 Jan 15 10:30 finance.db
```

In the output:
- First column: permissions (`-rw-r--r--` means owner can read/write, others readonly)
- Third column: owner username
- Fourth column: group name

### Step 2: Fix Permissions (Choose One Method)

#### Method 1: Change Ownership to Container User (RECOMMENDED)

This is the cleanest and most secure solution:

```bash
# Change ownership to uid=1001, gid=1001 (container user)
sudo chown -R 1001:1001 .

# Verify the change
ls -la

# Expected output:
# drwxr-xr-x  2 1001    1001    4096 Jan 15 10:30 .
# -rw-r--r--  1 1001    1001 6877184 Jan 15 10:30 finance.db
```

**Why this works**:
- Files are now owned by uid=1001 (same as container user)
- Container can read and write files
- Most secure - maintains least privilege principle

#### Method 2: Make Files World-Writable (LESS SECURE)

Simpler but less secure:

```bash
# Make database files writable by everyone
sudo chmod 666 *.db

# Verify
ls -la

# Expected: -rw-rw-rw- (all users can read/write)
```

**Warning**: This allows any user on the system to modify the database files. Only use if Method 1 doesn't work.

#### Method 3: Set Group Ownership (MODERATE SECURITY)

Middle ground between security and simplicity:

```bash
# Change group to 1001 and make group-writable
sudo chgrp -R 1001 .
sudo chmod -R g+w .

# Verify
ls -la

# Expected: -rw-rw-r-- with group 1001
```

### Step 3: Restart Docker Container

After fixing permissions, restart the container:

```bash
# Navigate to your docker-compose directory
cd /volume1/docker/new-finance

# Restart the container
docker-compose down
docker-compose up -d

# Check logs for any permission errors
docker-compose logs -f new-finance
```

### Step 4: Verify Write Access

Test that the database is now writable:

```bash
# Check container logs for successful startup
docker-compose logs new-finance

# Test a database write operation through the application
# Example: Create a new financial transaction via the UI
```

## Verification Checklist

- [ ] SSH into Synology NAS
- [ ] Navigate to Docker volume directory (`/volume1/docker/new-finance/db`)
- [ ] Check current file ownership (`ls -la`)
- [ ] Apply permission fix (Method 1 recommended: `sudo chown -R 1001:1001 .`)
- [ ] Verify ownership changed (`ls -la` shows uid 1001)
- [ ] Restart Docker container (`docker-compose down && docker-compose up -d`)
- [ ] Check container logs for errors (`docker-compose logs -f`)
- [ ] Test database write (create transaction in app)
- [ ] Verify no "readonly database" errors

## Troubleshooting

### Issue: Permissions revert after restart

**Cause**: Synology Docker volume settings or file station auto-correction

**Solution**:
1. Check docker-compose.yml volume mount path
2. Ensure you're fixing permissions in the correct directory
3. Add permissions to Synology DSM permissions management

### Issue: Cannot use sudo on Synology

**Cause**: Not logged in as admin user

**Solution**:
```bash
# SSH with admin account
ssh admin@your-nas-ip

# Or elevate to admin
su admin
```

### Issue: Container still shows permission errors

**Cause**: Database file might be in use or cached

**Solution**:
```bash
# Stop container completely
docker-compose down

# Remove container and volumes (WARNING: This will delete data)
docker-compose down -v

# Fix permissions
sudo chown -R 1001:1001 ./db

# Rebuild and start fresh
docker-compose up -d --build
```

### Issue: Want to avoid this issue in future

**Solution 1**: Create empty database with correct ownership before first run
```bash
# Before starting container for first time
mkdir -p ./db
touch ./db/finance.db
sudo chown -R 1001:1001 ./db
```

**Solution 2**: Use Docker named volumes instead of bind mounts

Update [docker-compose.yml](../docker-compose.yml):
```yaml
services:
  new-finance:
    volumes:
      - db-data:/app/db  # Named volume instead of ./db:/app/db

volumes:
  db-data:  # Define at bottom of file
    driver: local
```

Named volumes are managed by Docker and have correct permissions automatically.

## Technical Details

### Container User Configuration

From [Dockerfile](../Dockerfile):
```dockerfile
# Line 69-70: Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Line 87: Create db directory with correct ownership
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

# Line 90: Run as non-root user
USER nextjs
```

### Why uid=1001?

- Standard convention for first non-system user in Alpine Linux
- Matches Next.js official Docker recommendations
- Follows security best practices (don't run as root)

### Alternative: Match Container UID to Synology User

If you prefer, you can modify the Dockerfile to use your Synology user's UID:

```dockerfile
# Find your Synology UID with: id <username>
# Example output: uid=1024(youruser) gid=100(users)

# Then update Dockerfile:
RUN addgroup --system --gid 100 nodejs
RUN adduser --system --uid 1024 nextjs
```

This way, container runs as your Synology user and permissions match automatically.

## Related Files

- [Dockerfile](../Dockerfile) - Container user configuration
- [docker-compose.yml](../docker-compose.yml) - Volume mount configuration
- [app/lib/db/drizzle.ts](../app/lib/db/drizzle.ts) - Database initialization

## Prevention for Future Deployments

1. **Always set correct permissions before first container start**
2. **Use named Docker volumes for automatic permission management**
3. **Document the required UID/GID in deployment instructions**
4. **Add permission check script to container entrypoint** (see optional enhancement below)

### Optional: Add Permission Check to Container

Add this to [Dockerfile](../Dockerfile) for automatic permission detection:

```dockerfile
# Create startup script with permission check
RUN echo '#!/bin/sh\n\
echo "🔍 Checking database permissions..."\n\
ls -la /app/db/\n\
if touch /app/db/.write-test 2>/dev/null; then\n\
  rm /app/db/.write-test\n\
  echo "✓ Write permission OK"\n\
else\n\
  echo "✗ No write permission - database files may be readonly"\n\
  echo "  Fix: sudo chown -R 1001:1001 /path/to/volume/db/"\n\
fi\n\
exec "$@"\n\
' > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
```

This will log permission status on every container startup.
