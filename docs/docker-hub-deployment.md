# Docker Hub Deployment - Quick Guide

This guide shows how to deploy new-finance to your NAS using Docker Hub (no building required on NAS).

## Why Use Docker Hub?

✅ **No compilation on NAS** - Saves time and CPU resources
✅ **Works with NAS GUI** - Synology Container Manager, QNAP Container Station
✅ **Easy updates** - Just pull new image
✅ **Version control** - Keep multiple versions tagged

---

## One-Time Setup: Push to Docker Hub

### Prerequisites
- Docker Hub account (free): https://hub.docker.com/signup
- Docker installed on your local machine

### Step 1: Build and Push Image

**Using the automated script:**

```bash
# From project root on your local machine
./scripts/push-to-docker-hub.sh
```

The script will:
- Read the version from `package.json` (e.g., `1.2.0`)
- Build the Docker image
- Tag it with both the version number AND `latest`
- Push both tags to Docker Hub at `wanderyt/new-finance`

**Available tags after push:**
- `wanderyt/new-finance:1.2.0` (version-specific)
- `wanderyt/new-finance:latest` (always points to newest)

**Manual method (if needed):**

```bash
# 1. Build image with both tags
cd /path/to/new-finance
VERSION=$(node -p "require('./package.json').version")
docker build -t wanderyt/new-finance:${VERSION} -t wanderyt/new-finance:latest .

# 2. Login to Docker Hub
docker login

# 3. Push both tags
docker push wanderyt/new-finance:${VERSION}
docker push wanderyt/new-finance:latest
```

### Step 2: Make Repository Public (Optional)

This allows your NAS to pull without logging in:

1. Go to https://hub.docker.com/repositories
2. Click on `new-finance` repository
3. Settings → Change visibility to **Public**

---

## Deploying to NAS

### Option 1: Using Synology Container Manager (GUI)

#### A. Download Image

1. Open **Container Manager** app (or **Docker** on older DSM)
2. Go to **Registry** tab
3. Search: `wanderyt/new-finance`
4. Click **Download**
5. Select tag: `latest`
6. Wait for download to complete

#### B. Create Container

1. Go to **Container** tab
2. Click **Create** button
3. Select downloaded image: `wanderyt/new-finance:latest`
4. Click **Next**

#### C. Configure Container

**General Settings:**
- Container Name: `new-finance`
- Enable auto-restart: ✅ Check this box

**Port Settings:**
Click **Add** to add port mapping:
- Local Port: `3000` → Container Port: `3000` → Type: `TCP`
- (Optional) Local Port: `4983` → Container Port: `4983` → Type: `TCP`

**Volume Settings:**
Click **Add Folder**:
1. Create or select folder: `/docker/new-finance-data`
2. Mount path: `/app/db`
3. Read/Write permissions: ✅

**Environment Variables:**
Click **+** to add each variable:
- Variable: `NODE_ENV` → Value: `production`
- Variable: `DATABASE_PATH` → Value: `/app/db/finance.db`
- Variable: `GOOGLE_GEMINI_API_KEY` → Value: `your_actual_api_key_here`
- Variable: `SECURE_COOKIES` → Value: `false`

#### D. Apply and Start

1. Click **Apply** (or **Done**)
2. Container should start automatically
3. Check logs for any errors

---

### Option 2: Using QNAP Container Station (GUI)

#### A. Create Container

1. Open **Container Station**
2. Click **Create** button
3. Select **Create Container**
4. Search: `your-dockerhub-username/new-finance:latest`
5. Click on the image to select it

#### B. Configure Container

**Basic Settings:**
- Name: `new-finance`
- CPU/Memory limits: (optional, set if needed)

**Network:**
- Port forwarding:
  - Host: `3000` → Container: `3000`
  - (Optional) Host: `4983` → Container: `4983`

**Shared Folders:**
Click **Add**:
- Volume from host: `/Container/new-finance-data`
- Mount point: `/app/db`

**Environment:**
Add variables:
- `NODE_ENV=production`
- `DATABASE_PATH=/app/db/finance.db`
- `GOOGLE_GEMINI_API_KEY=your_actual_api_key_here`

**Advanced Settings:**
- Restart policy: **Always**

#### C. Create and Start

1. Click **Create**
2. Container will start automatically
3. Go to **Overview** tab to check status

---

### Option 3: Using Docker Compose (SSH/Terminal) - RECOMMENDED

This is the simplest method for deployment and upgrades.

#### Understanding Docker Compose File Selection

Docker Compose looks for files in this order:
1. `docker-compose.yml` (default) - used when you run `docker-compose up -d`
2. Explicit file with `-f` flag - `docker-compose -f docker-compose.production.yml up -d`

**Two approaches:**

**Approach A: Copy and rename (simpler commands)**
- Copy `docker-compose.production.yml` to NAS and rename to `docker-compose.yml`
- Run simple commands: `docker-compose up -d`, `docker-compose pull`

**Approach B: Keep original name (more explicit)**
- Copy `docker-compose.production.yml` to NAS as-is
- Always use `-f` flag: `docker-compose -f docker-compose.production.yml up -d`

#### Step 1: Prepare Files on NAS

**Option A: Copy from local machine (EASIEST)**

```bash
# From your local machine
scp docker-compose.production.yml user@nas-ip:/volume1/docker/new-finance/docker-compose.yml
```

**Option B: Create manually on NAS**

```bash
# SSH into NAS
ssh user@nas-ip

# Create directory
mkdir -p /volume1/docker/new-finance
cd /volume1/docker/new-finance

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  new-finance:
    container_name: new-finance
    image: wanderyt/new-finance:latest
    ports:
      - "3000:3000"
      # Uncomment for Drizzle Studio access
      # - "4983:4983"
    volumes:
      - /volume1/docker/new-finance-data:/app/db
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/db/finance.db
      - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
      - SECURE_COOKIES=false
    restart: unless-stopped
EOF
```

#### Step 2: Create .env File

The `.env` file must be in the **same directory** as `docker-compose.yml`:

```bash
# SSH into NAS (if not already)
ssh user@nas-ip
cd /volume1/docker/new-finance

# Create .env file
cat > .env << 'EOF'
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
EOF

# Secure the file
chmod 600 .env

# Verify
cat .env
```

#### Step 3: Create Database Directory

```bash
mkdir -p /volume1/docker/new-finance-data
```

#### Step 4: Deploy

```bash
cd /volume1/docker/new-finance

# Pull the latest image
docker pull wanderyt/new-finance:latest

# Start the container
docker-compose up -d
```

#### Step 5: Verify

```bash
# Check container status
docker-compose ps

# View logs (real-time)
docker-compose logs -f

# Or just check recent logs
docker logs new-finance

# Test the application
curl http://localhost:3000
```

#### Directory Structure on NAS

After setup, your NAS directory structure will be:

```
/volume1/docker/
├── new-finance/              # Deployment directory
│   ├── docker-compose.yml    # Compose configuration
│   └── .env                  # Environment variables (SECURE_COOKIES, API keys)
└── new-finance-data/         # Database volume (auto-created)
    └── finance.db            # SQLite database (created on first run)
```

---

## Accessing Your Application

Once deployed, access your application:

- **Web App**: `http://nas-ip:3000`
- **Drizzle Studio** (if port 4983 exposed): `http://nas-ip:4983`
- **From other devices**: Replace `nas-ip` with your NAS IP address

---

## Updating to New Version

When you have a new version to deploy:

### Step 1: Push New Image (on local machine)

```bash
# Build and push both version and latest tags
./scripts/push-to-docker-hub.sh
```

### Step 2: Update on NAS

**Using Docker Compose (EASIEST):**
```bash
ssh user@nas-ip
cd /volume1/docker/new-finance

# Pull latest image
docker-compose pull

# Recreate container with new image
docker-compose up -d

# Verify
docker-compose logs -f
```

**Using Container Manager (Synology):**
1. Stop container: Select container → **Action** → **Stop**
2. Delete container (keeps data): **Action** → **Delete**
3. Go to **Registry** → Re-download `wanderyt/new-finance:latest`
4. Create container again with same settings

**Using Container Station (QNAP):**
1. Stop and remove container
2. Pull new image: `docker pull wanderyt/new-finance:latest`
3. Recreate container with same settings

**Note:** The database will persist because it's mounted from `/volume1/docker/new-finance-data` on the host!

---

## Environment Variables Reference

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `NODE_ENV` | `production` | Yes | Enables production optimizations |
| `DATABASE_PATH` | `/app/db/finance.db` | Yes | Path inside container (don't change) |
| `GOOGLE_GEMINI_API_KEY` | Your API key | Yes | Get from Google AI Studio |
| `SECURE_COOKIES` | `false` | Yes | Required for HTTP access (local NAS and HTTPS domains) |

---

## Troubleshooting

### Image not found in Registry
- **Cause**: Repository is private
- **Solution**:
  - Make repository public on Docker Hub, OR
  - Login on NAS: `docker login` then pull manually

### Permission denied on /app/db
- **Cause**: Volume permissions mismatch
- **Solution**:
  ```bash
  sudo chown -R 1001:1001 /volume1/docker/new-finance-data
  ```

### Container exits immediately
- **Cause**: Environment variables not set correctly
- **Solution**: Check logs: `docker logs new-finance`
- Verify `GOOGLE_GEMINI_API_KEY` is set

### Can't access on port 3000
- **Cause**: Port mapping not configured or firewall
- **Solution**:
  - Verify port mapping in container settings
  - Check NAS firewall allows port 3000

---

## Advanced: Private Docker Hub Repository

If you want to keep your image private:

### On Local Machine (when pushing):
```bash
# Image is private by default on Docker Hub
docker push your-dockerhub-username/new-finance:latest
```

### On NAS (before pulling):
```bash
# Login to Docker Hub
docker login

# Then pull or run docker-compose
docker-compose up -d
```

**For Container Manager GUI:**
1. Settings → Registry → Add Registry
2. Name: Docker Hub
3. Registry URL: `https://index.docker.io/v1/`
4. Username: Your Docker Hub username
5. Password: Your Docker Hub password
6. Now you can pull private images via GUI

---

## Quick Reference: Complete Workflow

```bash
# === ON LOCAL MACHINE ===
# 1. Build and push (both version + latest tags)
./scripts/push-to-docker-hub.sh

# === ON NAS (Option 1: GUI) ===
# Use Container Manager/Station (see sections above)

# === ON NAS (Option 2: Docker Compose - RECOMMENDED) ===
# 2. Copy compose file to NAS
scp docker-compose.production.yml user@nas-ip:/volume1/docker/new-finance/docker-compose.yml

# 3. Create .env file on NAS
ssh user@nas-ip
cd /volume1/docker/new-finance
cat > .env << 'EOF'
GOOGLE_GEMINI_API_KEY=your_actual_key_here
EOF
chmod 600 .env

# 4. Create database directory
mkdir -p /volume1/docker/new-finance-data

# 5. Deploy
docker pull wanderyt/new-finance:latest
docker-compose up -d

# 6. Verify
docker-compose logs -f
curl http://localhost:3000

# 7. Access
# Open browser: http://nas-ip:3000

# === UPGRADING LATER ===
ssh user@nas-ip
cd /volume1/docker/new-finance
docker-compose pull
docker-compose up -d
```

---

## Next Steps

- ✅ Set up automated backups for `/volume1/docker/new-finance-data`
- ✅ Configure reverse proxy for HTTPS access (optional)
- ✅ Set up monitoring/alerts (optional)
- ✅ Document your deployment settings for future reference

For detailed information, see [docker-deployment.md](./docker-deployment.md)
