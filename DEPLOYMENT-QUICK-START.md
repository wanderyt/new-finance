# Docker Deployment - Quick Start Guide

Choose your deployment approach and follow the steps below.

## 🚀 Two Approaches

### Simplest Approach (CLI) - Start Here!
**Best for:** First-time deployment, testing
**Time:** 5-10 minutes build + 2 minutes setup
**Requirements:** SSH access to NAS

### Docker Hub Approach (GUI)
**Best for:** Production, easy updates, NAS Container Manager
**Time:** 5 minutes build + instant deployment
**Requirements:** Docker Hub account (free)

---

## ⚡ Simplest Approach - 7 Steps

Perfect for trying it out first!

```bash
# 1. SSH to NAS and copy project
ssh user@nas-ip
cd /volume1/docker
git clone <repository-url>
cd new-finance

# 2. Create .env with your API key
echo "GOOGLE_GEMINI_API_KEY=your_actual_key_here" > .env

# 3. (Optional) Edit volume path if not using Synology
nano docker-compose.yml
# Change line 14: - /volume1/docker/new-finance-data:/app/db

# 4. Create database directory
mkdir -p /volume1/docker/new-finance-data

# 5. Build and run (takes 5-10 minutes)
docker-compose up -d --build

# 6. Check logs
docker logs -f new-finance
# Wait for: "Ready on port 3000"

# 7. Access app
# Open browser: http://nas-ip:3000
```

✅ **Done!** Your app is running.

---

## 🐳 Docker Hub Approach - 3 Steps

Best once you're ready for production or want GUI management.

### Step 1: Push to Docker Hub (on local machine)

```bash
# On your local/development machine
cd /path/to/new-finance

# Build and push
./scripts/push-to-docker-hub.sh your-dockerhub-username

# Make repository private (recommended)
# Go to: https://hub.docker.com/repositories
# Click repository → Settings → Make Private
```

### Step 2: Configure NAS Authentication

**Synology Container Manager:**
1. Open Container Manager → Registry → Settings (⚙️ icon)
2. Click **Add**
3. Enter Docker Hub credentials
4. Click OK

**CLI alternative:**
```bash
ssh user@nas-ip
docker login
```

### Step 3: Deploy via GUI

**Synology Container Manager:**

1. **Registry** tab → Search `your-dockerhub-username/new-finance`
2. Click **Download** → Select `latest`
3. **Container** tab → **Create** → Select image
4. Configure:
   - Container name: `new-finance`
   - Port: `3000:3000`
   - Volume: `/docker/new-finance-data` → `/app/db`
   - Environment:
     - `NODE_ENV=production`
     - `DATABASE_PATH=/app/db/finance.db`
     - `GOOGLE_GEMINI_API_KEY=your_key`
5. **Apply** and start

✅ **Done!** Access at `http://nas-ip:3000`

---

## 📋 Environment Variables Required

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Always set this |
| `DATABASE_PATH` | `/app/db/finance.db` | Don't change (internal path) |
| `GOOGLE_GEMINI_API_KEY` | `your_actual_key` | Get from [Google AI Studio](https://makersuite.google.com/app/apikey) |

---

## 🔍 Verification Commands

```bash
# Check container status
docker ps | grep new-finance

# View logs
docker logs -f new-finance

# Test health endpoint
curl http://localhost:3000/api/health

# Check database exists
ls -lh /volume1/docker/new-finance-data/
```

---

## 🗄️ Database Location

| On Host (NAS) | Inside Container |
|---------------|------------------|
| `/volume1/docker/new-finance-data/finance.db` | `/app/db/finance.db` |

**Backup:** Just copy the file from the host path!

---

## 🔄 Updating Your Deployment

### Simplest Approach:
```bash
ssh user@nas-ip
cd /volume1/docker/new-finance
git pull origin main
docker-compose up -d --build
```

### Docker Hub Approach:
```bash
# On local machine: push new image
./scripts/push-to-docker-hub.sh your-username

# On NAS via GUI:
# 1. Stop container
# 2. Delete container (keeps data)
# 3. Download new image
# 4. Recreate container with same settings

# Or via CLI:
ssh user@nas-ip
cd /volume1/docker/new-finance
docker-compose pull
docker-compose up -d
```

---

## 🎛️ Drizzle Studio Access

### SSH + Docker Exec (Default)
```bash
ssh user@nas-ip
docker exec -it new-finance yarn db:studio
# Access at: http://nas-ip:4983
```

### Always-On (Optional)
Edit `docker-compose.yml`:
```yaml
ports:
  - "3000:3000"
  - "4983:4983"  # Uncomment this line
```
Then restart container.

---

## 🆘 Common Issues

### "Cannot connect to database"
```bash
# Check database directory exists
ls -lh /volume1/docker/new-finance-data/

# Fix permissions if needed
sudo chown -R 1001:1001 /volume1/docker/new-finance-data/
```

### "Port 3000 already in use"
Change port in docker-compose.yml:
```yaml
ports:
  - "3001:3000"  # Use 3001 on host instead
```

### "Image not found" (Docker Hub)
- Make sure you're logged in: `docker login`
- Check repository is accessible
- For private repos, ensure authentication is configured

### Container exits immediately
```bash
# Check logs for errors
docker logs new-finance

# Common cause: missing GOOGLE_GEMINI_API_KEY
# Verify in docker-compose.yml or container settings
```

---

## 📚 Full Documentation

- **Complete Guide:** [docs/docker-deployment.md](docs/docker-deployment.md)
- **Docker Hub Details:** [docs/docker-hub-deployment.md](docs/docker-hub-deployment.md)
- **Security Info:** See "Security Considerations" in docker-deployment.md

---

## 🎯 Recommended Path

1. ✅ **Start with Simplest Approach** to test everything works
2. ✅ Once confirmed, switch to **Docker Hub Approach** for production
3. ✅ Make Docker Hub repository **private** for security
4. ✅ Set up automated backups of `/volume1/docker/new-finance-data/`

---

## 💡 Tips

- **First deployment?** Use Simplest Approach to verify everything works
- **Production deployment?** Use Docker Hub + private repository
- **Frequent updates?** Docker Hub makes updates much faster
- **Multiple NAS devices?** Docker Hub lets you reuse the same image
- **Security conscious?** Make Docker Hub repo private, never commit `.env` files

---

**Questions?** Check the full documentation in [docs/docker-deployment.md](docs/docker-deployment.md)
