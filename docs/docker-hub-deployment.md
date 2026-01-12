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

**Quick method (using helper script):**

```bash
# From project root on your local machine
./scripts/push-to-docker-hub.sh your-dockerhub-username
```

**Manual method:**

```bash
# 1. Build image
cd /path/to/new-finance
docker build -t your-dockerhub-username/new-finance:latest .

# 2. Also tag with version number
docker tag your-dockerhub-username/new-finance:latest \
           your-dockerhub-username/new-finance:0.17.0

# 3. Login to Docker Hub
docker login

# 4. Push images
docker push your-dockerhub-username/new-finance:latest
docker push your-dockerhub-username/new-finance:0.17.0
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
3. Search: `your-dockerhub-username/new-finance`
4. Click **Download**
5. Select tag: `latest`
6. Wait for download to complete

#### B. Create Container

1. Go to **Container** tab
2. Click **Create** button
3. Select downloaded image: `your-dockerhub-username/new-finance:latest`
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

### Option 3: Using Docker Compose (SSH/Terminal)

If you prefer command-line or your NAS supports docker-compose:

#### Step 1: Prepare Files on NAS

```bash
# SSH into NAS
ssh user@nas-ip

# Create directory
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
```

**Important:** Replace `your-dockerhub-username` with your actual Docker Hub username!

#### Step 2: Create Database Directory

```bash
mkdir -p /volume1/docker/new-finance-data
```

#### Step 3: Deploy

```bash
docker-compose up -d
```

#### Step 4: Verify

```bash
# Check container status
docker-compose ps

# View logs
docker logs -f new-finance

# Test health endpoint
curl http://localhost:3000/api/health
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
./scripts/push-to-docker-hub.sh your-dockerhub-username
```

### Step 2: Update on NAS

**Using Container Manager (Synology):**
1. Stop container: Select container → **Action** → **Stop**
2. Delete container (keeps data): **Action** → **Delete**
3. Go to **Registry** → Re-download latest image
4. Create container again with same settings

**Using Container Station (QNAP):**
1. Stop and remove container
2. Pull new image: `docker pull your-dockerhub-username/new-finance:latest`
3. Recreate container with same settings

**Using Docker Compose:**
```bash
cd /volume1/docker/new-finance
docker-compose pull
docker-compose up -d
```

The database will persist because it's mounted from the host!

---

## Environment Variables Reference

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `NODE_ENV` | `production` | Yes | Enables production optimizations |
| `DATABASE_PATH` | `/app/db/finance.db` | Yes | Path inside container (don't change) |
| `GOOGLE_GEMINI_API_KEY` | Your API key | Yes | Get from Google AI Studio |

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
# 1. Build and push
./scripts/push-to-docker-hub.sh your-dockerhub-username

# === ON NAS (Option 1: GUI) ===
# Use Container Manager/Station (see sections above)

# === ON NAS (Option 2: CLI) ===
# 2. Create directories
ssh user@nas-ip
mkdir -p /volume1/docker/new-finance
mkdir -p /volume1/docker/new-finance-data

# 3. Create config files
cd /volume1/docker/new-finance
echo "GOOGLE_GEMINI_API_KEY=your_key" > .env
# Create docker-compose.yml (see Option 3 above)

# 4. Deploy
docker-compose up -d

# 5. Verify
docker logs -f new-finance
curl http://localhost:3000/api/health

# 6. Access
# Open browser: http://nas-ip:3000
```

---

## Next Steps

- ✅ Set up automated backups for `/volume1/docker/new-finance-data`
- ✅ Configure reverse proxy for HTTPS access (optional)
- ✅ Set up monitoring/alerts (optional)
- ✅ Document your deployment settings for future reference

For detailed information, see [docker-deployment.md](./docker-deployment.md)
