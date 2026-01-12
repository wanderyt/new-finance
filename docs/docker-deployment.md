# Docker Deployment Guide

This guide covers deploying the new-finance application as a Docker container on your NAS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Build and Deploy](#build-and-deploy)
4. [Database Management](#database-management)
5. [Drizzle Studio Access](#drizzle-studio-access)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **NAS Storage**: Dedicated path for database persistence

### Required Configuration
- Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))
- NAS network access and SSH credentials
- Available ports: 3000 (application), optionally 4983 (Drizzle Studio)

### System Requirements
- **Disk Space**: ~500MB for Docker image + database growth
- **Memory**: Minimum 512MB, recommended 1GB
- **CPU**: Any modern processor (ARM64 or AMD64)

## Deployment Approaches

Choose the approach that best fits your needs:

| Approach | Best For | Complexity | NAS GUI Support |
|----------|----------|------------|-----------------|
| **[Simplest Approach](#simplest-approach-recommended-for-first-time)** | First-time users, testing | Low ⭐ | ❌ CLI only |
| **[Docker Hub Approach](#docker-hub-approach-best-for-production)** | Production, easy updates | Medium ⭐⭐ | ✅ Full GUI |

---

## Simplest Approach (Recommended for First-Time)

**Best for:** Testing, first-time setup, users comfortable with SSH

This approach builds and runs everything directly on your NAS using one command.

### Step 1: Copy Project to NAS

```bash
# Option A: Clone directly on NAS (if git is installed)
ssh user@nas-ip
cd /volume1/docker
git clone <repository-url>
cd new-finance

# Option B: Copy from local machine
scp -r /path/to/new-finance user@nas-ip:/volume1/docker/
ssh user@nas-ip
cd /volume1/docker/new-finance
```

### Step 2: Configure Environment Variables

```bash
# Create .env file with your API key
echo "GOOGLE_GEMINI_API_KEY=your_actual_api_key_here" > .env
```

### Step 3: Update Volume Path (if needed)

Edit `docker-compose.yml` to match your NAS:

```bash
nano docker-compose.yml
```

Change line 14 to your NAS path:
```yaml
volumes:
  - /volume1/docker/new-finance-data:/app/db  # Synology
  # - /share/Container/new-finance-data:/app/db  # QNAP
```

### Step 4: Create Database Directory

```bash
mkdir -p /volume1/docker/new-finance-data
```

### Step 5: Build and Run

```bash
# This will build the image and start the container
docker-compose up -d --build
```

**Note:** Building takes 5-10 minutes on NAS (compiling Node.js dependencies).

### Step 6: Verify Deployment

```bash
# Check container status
docker-compose ps

# View logs (wait for "Ready on port 3000")
docker logs -f new-finance

# Test health endpoint
curl http://localhost:3000/api/health
```

### Step 7: Access Your Application

Open browser: `http://nas-ip:3000`

**Pros:**
- ✅ Simplest setup (no Docker Hub account needed)
- ✅ One command deployment
- ✅ All files stay on your NAS

**Cons:**
- ❌ Slow initial build (5-10 minutes)
- ❌ Requires SSH access
- ❌ No GUI management

---

## Docker Hub Approach (Best for Production)

**Best for:** Production use, NAS GUI management, easy updates

This approach uses pre-built images from Docker Hub, compatible with NAS container managers.

### Overview

1. Build image on your **local machine** (fast, powerful)
2. Push to **Docker Hub** (private repository recommended)
3. Pull and run on **NAS** via GUI or CLI (instant, no building)

### Step 1: Push Image to Docker Hub (One-Time Setup)

**On your local machine:**

```bash
cd /path/to/new-finance

# Run the helper script
./scripts/push-to-docker-hub.sh your-dockerhub-username

# The script will:
# 1. Build the image
# 2. Tag with version from package.json
# 3. Push to Docker Hub
```

**Manual alternative:**
```bash
# Build image
docker build -t your-dockerhub-username/new-finance:latest .

# Login to Docker Hub
docker login

# Push image
docker push your-dockerhub-username/new-finance:latest
```

### Step 2: Make Repository Private (Recommended)

For security, make your Docker Hub repository private:

1. Go to https://hub.docker.com/repositories
2. Click on `new-finance` repository
3. Settings → Change visibility to **Private**

### Step 3: Deploy on NAS

Choose your deployment method:

#### Option 3A: Synology Container Manager (GUI)

**Setup Docker Hub Authentication (one-time):**

1. Open **Container Manager**
2. Go to **Registry** → Settings icon (top right)
3. Click **Add**
   - Registry Name: `Docker Hub`
   - Registry URL: `https://registry-1.docker.io`
   - Username: Your Docker Hub username
   - Password: Your Docker Hub password
4. Click **OK**

**Download and Run Image:**

1. Go to **Registry** tab
2. Search: `your-dockerhub-username/new-finance`
3. Click **Download** → Select `latest` tag
4. After download, go to **Container** → **Create**
5. Select image: `your-dockerhub-username/new-finance:latest`
6. Configure container:

   **General Settings:**
   - Container name: `new-finance`
   - Enable auto-restart: ✅

   **Port Settings:**
   - Local Port: `3000` → Container Port: `3000` → Type: `TCP`

   **Volume Settings:**
   - Click **Add Folder**
   - Select/create: `/docker/new-finance-data`
   - Mount path: `/app/db`

   **Environment Variables:**
   - `NODE_ENV` = `production`
   - `DATABASE_PATH` = `/app/db/finance.db`
   - `GOOGLE_GEMINI_API_KEY` = `your_actual_api_key_here`

7. Click **Apply** and start

#### Option 3B: QNAP Container Station (GUI)

Similar process to Synology:

1. **Container Station** → **Create**
2. Search: `your-dockerhub-username/new-finance:latest`
3. Configure:
   - **Port forwarding**: `3000:3000`
   - **Shared folder**: `/Container/new-finance-data` → `/app/db`
   - **Environment**: Same variables as above
4. Create and start

#### Option 3C: Docker Compose (CLI)

**On your NAS:**

```bash
ssh user@nas-ip
mkdir -p /volume1/docker/new-finance
cd /volume1/docker/new-finance

# Create .env file
cat > .env << 'EOF'
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  new-finance:
    container_name: new-finance
    image: your-dockerhub-username/new-finance:latest
    ports:
      - "3000:3000"
    volumes:
      - /volume1/docker/new-finance-data:/app/db
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/db/finance.db
      - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
    restart: unless-stopped
EOF

# Login to Docker Hub (if private repo)
docker login

# Create database directory
mkdir -p /volume1/docker/new-finance-data

# Pull and run
docker-compose up -d
```

### Step 4: Verify and Access

```bash
# Check status
docker logs -f new-finance

# Test health
curl http://localhost:3000/api/health
```

Access: `http://nas-ip:3000`

**Pros:**
- ✅ Fast deployment (no building on NAS)
- ✅ Works with NAS GUI container managers
- ✅ Easy updates (pull new image, recreate container)
- ✅ Professional workflow
- ✅ Can keep multiple versions

**Cons:**
- ❌ Requires Docker Hub account
- ❌ Extra step to push images
- ❌ Need to configure authentication for private repos

---

## Quick Comparison

| Feature | Simplest Approach | Docker Hub Approach |
|---------|-------------------|---------------------|
| **Setup Time** | Longer (build on NAS) | Faster (pre-built) |
| **NAS GUI Support** | ❌ CLI only | ✅ Full support |
| **Docker Hub Account** | ❌ Not needed | ✅ Required |
| **Updates** | Rebuild on NAS | Pull new image |
| **Best For** | Testing, one-time | Production, frequent updates |
| **Difficulty** | ⭐ Easiest | ⭐⭐ Easy-Medium |

---

## Which Should You Choose?

**Start with Simplest Approach if:**
- First time deploying Docker on NAS
- Want to test quickly
- Comfortable with SSH/terminal
- Don't need GUI management

**Use Docker Hub Approach if:**
- Want to use NAS container manager GUI
- Planning for production use
- Need easy updates and version management
- Have multiple NAS devices or want to share

---

## Database Management

### Initial Setup

If starting with a fresh database:

```bash
# Run migrations to create tables
docker exec -it new-finance yarn db:migrate

# Optional: Seed with demo data
docker exec -it new-finance yarn db:seed
```

If migrating an existing database:

```bash
# Copy your existing database to the NAS volume path
cp /path/to/existing/finance.db /volume1/docker/new-finance-data/

# Restart the container
docker-compose restart
```

### Running Migrations

When updating to a new version with schema changes:

```bash
# Check current migration status
docker exec -it new-finance yarn db:migrate

# Or use drizzle-kit directly
docker exec -it new-finance yarn db:push
```

### Database Backup

Backup the SQLite database regularly:

```bash
# Manual backup
cp /volume1/docker/new-finance-data/finance.db \
   /volume1/backups/finance-backup-$(date +%Y%m%d).db

# Automated backup script (add to NAS cron)
#!/bin/bash
BACKUP_DIR="/volume1/backups/new-finance"
mkdir -p $BACKUP_DIR
cp /volume1/docker/new-finance-data/finance.db \
   $BACKUP_DIR/finance-$(date +%Y%m%d-%H%M%S).db

# Keep only last 30 days
find $BACKUP_DIR -name "finance-*.db" -mtime +30 -delete
```

### Database Restore

To restore from a backup:

```bash
# Stop the container
docker-compose stop

# Restore the database
cp /volume1/backups/finance-backup-20260112.db \
   /volume1/docker/new-finance-data/finance.db

# Start the container
docker-compose start
```

## Drizzle Studio Access

Drizzle Studio provides a web UI to view and edit database records. Two access methods are available:

### Option A: SSH + Docker Exec (Default, Recommended)

This method runs Drizzle Studio on-demand and is more secure.

**Steps:**

1. SSH into your NAS:
   ```bash
   ssh user@nas-ip
   ```

2. Start Drizzle Studio:
   ```bash
   docker exec -it new-finance yarn db:studio
   ```

3. Access in your browser:
   ```
   http://nas-ip:4983
   ```

4. Stop with `Ctrl+C` in the SSH terminal when done.

**Pros:**
- More secure (not exposed when not needed)
- Lower resource usage
- Studio only runs when you need it

**Cons:**
- Requires SSH access to NAS
- Manual start/stop required
- Terminal must stay open

### Option B: Always-On Port Exposure

This method keeps Drizzle Studio running at all times, accessible directly from your network.

**Setup:**

1. Edit `docker-compose.yml` and uncomment the Studio port:
   ```yaml
   ports:
     - "3000:3000"
     - "4983:4983"  # Uncomment this line
   ```

2. Create a custom startup script or use Docker CMD override:
   ```yaml
   # Add to docker-compose.yml service definition
   command: sh -c "yarn start & yarn db:studio --host 0.0.0.0"
   ```

3. Rebuild and restart:
   ```bash
   docker-compose up -d --build
   ```

4. Access directly from any device:
   ```
   http://nas-ip:4983
   ```

**Pros:**
- No SSH required
- Always accessible from any device on your network
- Convenient for frequent database checks

**Cons:**
- Uses more resources (Studio always running)
- Port 4983 exposed on network
- Potential security concern if network is not secure

**Security Note:** If using Option B, ensure port 4983 is only accessible on your local network. Configure your NAS firewall to block external access.

### Option C: Separate Docker Service (Advanced)

For complete isolation, run Drizzle Studio as a separate container:

1. Create `docker-compose.override.yml`:
   ```yaml
   services:
     drizzle-studio:
       container_name: new-finance-studio
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "4983:4983"
       volumes:
         - /volume1/docker/new-finance-data:/app/db
       environment:
         - DATABASE_PATH=/app/db/finance.db
       command: ["yarn", "db:studio", "--host", "0.0.0.0"]
       restart: unless-stopped
       depends_on:
         - new-finance
   ```

2. Deploy both services:
   ```bash
   docker-compose up -d
   ```

This creates a separate container for Drizzle Studio sharing the database volume.

## Maintenance

### View Logs

```bash
# Real-time logs
docker logs -f new-finance

# Last 100 lines
docker logs --tail 100 new-finance

# With timestamps
docker logs -t new-finance
```

### Restart Container

```bash
# Graceful restart
docker-compose restart

# Force restart
docker-compose down && docker-compose up -d
```

### Update Application

When a new version is released:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run any new migrations
docker exec -it new-finance yarn db:migrate
```

### Stop/Remove Container

```bash
# Stop container (keeps data)
docker-compose stop

# Stop and remove container (keeps data in volume)
docker-compose down

# Remove everything including volumes (DESTRUCTIVE)
docker-compose down -v  # WARNING: This deletes the database!
```

### Monitor Resources

```bash
# Real-time resource usage
docker stats new-finance

# Container details
docker inspect new-finance
```

### Clean Up Old Images

After updates, remove old images to save space:

```bash
docker image prune -a
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs new-finance
```

**Common issues:**
- Port 3000 already in use: Change port in `docker-compose.yml` to `"3001:3000"`
- Missing environment variables: Verify `.env.docker.local` is configured
- Database permissions: Ensure NAS volume path is writable

### Database Connection Errors

**Symptoms:** "Cannot open database" or permission errors

**Solutions:**

1. Check file permissions:
   ```bash
   ls -l /volume1/docker/new-finance-data/
   ```

2. Fix ownership (NAS user ID):
   ```bash
   chown -R 1001:1001 /volume1/docker/new-finance-data/
   ```

3. Verify DATABASE_PATH environment variable:
   ```bash
   docker exec new-finance printenv DATABASE_PATH
   ```

### Better-sqlite3 Compilation Errors

**Symptoms:** "Module did not self-register" or native module errors

**Solution:** Rebuild with no cache:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Health Check Failing

**Check health status:**
```bash
docker inspect --format='{{json .State.Health}}' new-finance | jq
```

**Test manually:**
```bash
docker exec new-finance node -e "require('http').get('http://localhost:3000/api/health', (r) => console.log(r.statusCode))"
```

### Drizzle Studio Can't Connect

**For Option A (SSH + Exec):**
- Ensure container is running: `docker ps`
- Check if Studio port is bound: `docker exec new-finance netstat -tuln | grep 4983`
- Verify DATABASE_PATH: `docker exec new-finance printenv DATABASE_PATH`

**For Option B (Always-On):**
- Check port mapping: `docker port new-finance`
- Verify firewall allows port 4983
- Check if process is running: `docker exec new-finance ps aux | grep drizzle`

### Out of Memory

If the container runs out of memory:

1. Add memory limits to `docker-compose.yml`:
   ```yaml
   services:
     new-finance:
       # ... existing config
       mem_limit: 1g
       mem_reservation: 512m
   ```

2. Restart:
   ```bash
   docker-compose up -d
   ```

### Port Conflicts

If ports are already in use:

```bash
# Find what's using port 3000
lsof -i :3000  # On NAS
netstat -tulpn | grep 3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

## Security Considerations

### API Keys

- **Never commit** `.env.docker.local` with real API keys
- Store API keys securely on NAS with restricted permissions:
  ```bash
  chmod 600 .env.docker.local
  ```

### Network Security

- **Firewall Rules**: Restrict ports 3000 and 4983 to local network only
- **Synology**: Control Panel → Security → Firewall
- **QNAP**: Control Panel → Security → Firewall
- Consider using VPN for remote access instead of exposing ports

### Database Security

- Regular backups (see [Database Backup](#database-backup))
- Restrict file permissions:
  ```bash
  chmod 600 /volume1/docker/new-finance-data/finance.db
  ```
- Consider encrypting NAS volume containing database

### Container Security

- Container runs as non-root user (UID 1001)
- Health checks monitor container status
- Automatic restart on failure

### HTTPS/SSL

For production use, consider adding a reverse proxy:

**Using Nginx Proxy Manager (on NAS):**

1. Install Nginx Proxy Manager via Docker
2. Create a proxy host pointing to `new-finance:3000`
3. Enable SSL with Let's Encrypt
4. Access via `https://finance.yourdomain.com`

**Example Nginx Config:**
```nginx
server {
    listen 443 ssl;
    server_name finance.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Updates and Patching

- Regularly update the application: `git pull && docker-compose up -d --build`
- Monitor for security advisories for dependencies
- Keep Docker and NAS system updated

## Advanced Configuration

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Node environment | `production` | Yes |
| `PORT` | Application port | `3000` | No |
| `DATABASE_PATH` | SQLite database path | `/app/db/finance.db` | Yes |
| `GOOGLE_GEMINI_API_KEY` | Google AI API key | - | Yes |

### Custom Build Args

To customize the build:

```dockerfile
# In Dockerfile, add ARG
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS deps
```

```bash
# Build with custom arg
docker build --build-arg NODE_VERSION=21 -t new-finance:latest .
```

### Resource Limits

Add resource constraints in `docker-compose.yml`:

```yaml
services:
  new-finance:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Multiple Environments

To run staging and production:

```bash
# Create docker-compose.staging.yml
cp docker-compose.yml docker-compose.staging.yml

# Edit ports and volume paths
# Then run:
docker-compose -f docker-compose.staging.yml up -d
docker-compose -f docker-compose.yml up -d
```

## Support and Resources

- **Project Issues**: [GitHub Issues](https://github.com/your-repo/new-finance/issues)
- **Docker Documentation**: https://docs.docker.com
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Drizzle ORM**: https://orm.drizzle.team

## Appendix

### Complete docker-compose.yml Example

```yaml
services:
  new-finance:
    container_name: new-finance
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      # - "4983:4983"  # Uncomment for always-on Drizzle Studio
    volumes:
      - /volume1/docker/new-finance-data:/app/db
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/db/finance.db
      - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Automated Backup Script

Save as `/volume1/scripts/backup-new-finance.sh`:

```bash
#!/bin/bash

# Configuration
DB_PATH="/volume1/docker/new-finance-data/finance.db"
BACKUP_DIR="/volume1/backups/new-finance"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/finance-$TIMESTAMP.db"

# Copy database
cp "$DB_PATH" "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup successful: $BACKUP_FILE"

    # Clean old backups
    find "$BACKUP_DIR" -name "finance-*.db" -mtime +$RETENTION_DAYS -delete
    echo "Cleaned backups older than $RETENTION_DAYS days"
else
    echo "Backup failed!"
    exit 1
fi
```

Make it executable and add to cron:
```bash
chmod +x /volume1/scripts/backup-new-finance.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /volume1/scripts/backup-new-finance.sh >> /volume1/logs/backup-new-finance.log 2>&1
```

---

**Last Updated:** 2026-01-12
**Version:** 0.17.0
