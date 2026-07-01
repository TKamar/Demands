# Offline/Air-Gapped Deployment Guide

This guide explains how to deploy the Demands system in a **strictly offline environment** with no internet access.

## Overview

The offline deployment strategy uses Docker as the sole packaging mechanism:

1. **Build Phase** (Internet-connected machine)
   - Build all custom images
   - Pull external images from registries
   - Export everything into a single archive
   - Transfer to offline machine

2. **Deploy Phase** (Offline machine)
   - Load images from archive
   - Configure environment
   - Start services with docker-compose
   - Verify deployment

## Prerequisites

### Internet-Connected Machine (for Building)
- **Docker Engine** 20.10+
- **Docker Compose** 2.0+
- **Bash shell** (Linux, macOS, or WSL on Windows)
- **Git** (to clone the repository)
- ~8GB free disk space (for images during build)
- Internet access to docker registries

### Offline Machine (for Deployment)
- **Docker Engine** 20.10+
- **Docker Compose** 2.0+
- **Bash shell** (Linux or compatible)
- ~3GB free disk space (for images archive and running containers)
- 2GB+ RAM
- NO internet access required ✓

## Step-by-Step Deployment

### Phase 1: Build Offline Package (Internet-Connected Machine)

#### 1.1 Clone Repository

```bash
git clone https://github.com/TKamar/Demands.git
cd Demands/Demands
```

#### 1.2 Prepare Repository

Ensure the code is built and ready:

```bash
# Frontend
cd client
npm install
npm run build
cd ..

# Backend
cd server
npm install
npm run build
cd ..
```

#### 1.3 Run Packaging Script

```bash
bash scripts/package-offline.sh v1.0.0
```

**What this script does:**
1. ✓ Builds server image from `server/Dockerfile`
2. ✓ Builds client image from `client/Dockerfile`
3. ✓ Pulls postgres:16-alpine
4. ✓ Pulls quay.io/keycloak/keycloak:26.0
5. ✓ Exports all images into `images.tar.gz`
6. ✓ Copies configuration files
7. ✓ Creates `.env.example`
8. ✓ Packages everything into `offline-deployment-v1.0.0-*.tar.gz`

**Output:**
```
offline-deployment-v1.0.0-20260701_143022.tar.gz  (~1.5GB)
offline-bundle-v1.0.0-20260701_143022/             (temporary directory)
```

#### 1.4 Verify Bundle

```bash
tar -tzf offline-deployment-v1.0.0-*.tar.gz | head -20
```

Expected contents:
```
offline-bundle-v1.0.0-20260701_143022/
├── images.tar.gz           (~1.5GB - all Docker images)
├── docker-compose.yml      (service configuration)
├── .env.example            (environment template)
├── deploy-offline.sh       (deployment script)
├── README.md               (quick reference)
└── DEPLOYMENT-PROD.md      (detailed guide - optional)
```

#### 1.5 Transfer to Offline Machine

Transfer the `.tar.gz` file to the offline machine using:
- USB drive
- Secure file transfer before air-gap
- Network transfer before isolation
- Any method available in your environment

```bash
# Example using USB or network before airgap
scp offline-deployment-v1.0.0-*.tar.gz user@offline-server:/tmp/
```

---

### Phase 2: Deploy in Offline Environment

#### 2.1 Extract Bundle

On the offline machine:

```bash
cd /opt/demands  # or your deployment directory
tar -xzf offline-deployment-v1.0.0-*.tar.gz
cd offline-bundle-v1.0.0-*
```

#### 2.2 Configure Environment

```bash
# Copy example to actual config
cp .env.example .env

# Edit with your values
nano .env  # or vim, vi, etc.
```

**Critical Configuration:**

Edit these values in `.env`:

```env
# Database
POSTGRES_PASSWORD=your-secure-password  # Change from default!
DATABASE_URL=postgresql://user:your-secure-password@postgres:5432/demands

# Keycloak Admin
KEYCLOAK_ADMIN_PASSWORD=your-admin-password  # Change from default!

# Frontend URL (adjust if behind reverse proxy)
VITE_API_URL=http://localhost:3000
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/demands
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback

# API Security
AUTH_AUDIENCE=demands-api
AUTH_ADMIN_GROUP=admin
```

#### 2.3 Run Deployment Script

```bash
# Make script executable
chmod +x deploy-offline.sh

# Run deployment
./deploy-offline.sh
```

**What this script does:**
1. ✓ Verifies Docker is installed and running
2. ✓ Checks for required files (`images.tar.gz`, `docker-compose.yml`, `.env`)
3. ✓ Validates critical `.env` values
4. ✓ Loads Docker images from archive
5. ✓ Verifies images were loaded successfully
6. ✓ Starts services with `docker-compose up -d`
7. ✓ Waits for services to become healthy
8. ✓ Displays endpoints and next steps

#### 2.4 Verify Deployment

```bash
# Check running services
docker-compose ps

# Test API health
curl http://localhost:3000/health

# View service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server
docker-compose logs -f keycloak
```

**Expected Output:**
```
docker-compose ps
NAME            COMMAND                  STATUS
postgres        postgres                 Up 2 minutes
keycloak        /opt/keycloak/bin/...    Up 1 minute
server          /entrypoint.sh           Up 1 minute
client          sh -c npm install && ... Up 50 seconds (if dev profile)
```

#### 2.5 Access Services

Once services are healthy:

- **API Server**: http://localhost:3000
  - Health check: http://localhost:3000/health
  - Swagger docs: http://localhost:3000/docs (if enabled)

- **Keycloak Admin Panel**: http://localhost:8080
  - Username: `admin`
  - Password: (value from `KEYCLOAK_ADMIN_PASSWORD` in `.env`)

- **Frontend** (if dev profile enabled): http://localhost:5173
  - Browse to login
  - Redirects to Keycloak for authentication

#### 2.6 Initial Admin Setup

See `DEPLOYMENT-PROD.md` for detailed first-time admin setup steps.

---

## Troubleshooting

### Images Failed to Load

**Error:** `docker load: unexpected EOF while reading tar stream`

**Cause:** `images.tar.gz` is corrupted or incomplete

**Solution:**
```bash
# Re-transfer the file from the build machine
# Verify checksum if available:
sha256sum offline-deployment-*.tar.gz
```

### Services Won't Start

**Check logs:**
```bash
docker-compose logs
docker-compose logs server
docker-compose logs keycloak
```

**Common issues:**

1. **Port already in use**
   ```bash
   # Check what's using port 3000
   netstat -tlnp | grep 3000
   # Change PORT in .env if needed
   ```

2. **Out of disk space**
   ```bash
   df -h
   # Need at least 3GB free
   ```

3. **Keycloak startup timeout**
   - Keycloak takes 30-60 seconds to start on first boot
   - Check: `docker-compose logs keycloak | tail -50`

### Database Connection Errors

**Error:** `Error: ECONNREFUSED 127.0.0.1:5432`

**Cause:** Postgres is not running or `DATABASE_URL` is incorrect

**Solution:**
```bash
# Verify postgres service is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
# Should be: postgresql://user:password@postgres:5432/demands
# (hostname must be 'postgres', not 'localhost')
```

### Running Services Manually

If `deploy-offline.sh` doesn't work for some reason:

```bash
# Load images manually
docker load -i images.tar.gz

# Source environment
export $(grep -v '^#' .env | xargs)

# Start services
docker-compose up -d

# Watch startup
docker-compose logs -f
```

### Cleanup and Restart

```bash
# Stop services (keep data)
docker-compose down

# Stop services and remove data
docker-compose down -v

# Restart
./deploy-offline.sh
```

---

## Monitoring & Operations

### Daily Operations

```bash
# View all running services
docker-compose ps

# View real-time logs
docker-compose logs -f

# View logs for past hour
docker-compose logs --since 1h

# Export logs for analysis
docker-compose logs > demands-logs.txt
```

### Backup & Recovery

**Backup database:**
```bash
docker-compose exec postgres pg_dump -U user demands > demands-backup.sql
```

**Restore database:**
```bash
docker-compose exec -T postgres psql -U user demands < demands-backup.sql
```

### Scaling (if needed)

The offline bundle is designed for single-node deployment. For scaling in air-gapped environments:
- Consider Kubernetes (k3s can run offline)
- Or re-run `package-offline.sh` on each node
- Ensure PostgreSQL is shared/replicated properly

---

## Advanced Configuration

### Behind a Reverse Proxy

If running behind nginx/Apache:

```env
# Update frontend URLs to match your domain
VITE_API_URL=https://demands.yourcompany.com/api
VITE_OIDC_AUTHORITY=https://keycloak.yourcompany.com/realms/demands
VITE_OIDC_REDIRECT_URI=https://demands.yourcompany.com/callback
```

### Custom Keycloak Configuration

To use a different Keycloak realm:

1. Export realm from production Keycloak
2. Place in `docker/keycloak/demands-realm.json`
3. Rebuild with `package-offline.sh`

### Isolated Networks

For enhanced security, create a dedicated Docker network:

```bash
docker network create demands-net

# Update docker-compose.yml networks section
docker-compose up -d
```

---

## Performance Tips

1. **Increase Docker daemon limits** if running many requests:
   ```bash
   # Edit /etc/docker/daemon.json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   ```

2. **Mount volumes on fast storage** (NVMe if possible)

3. **Enable resource limits** in docker-compose.yml:
   ```yaml
   services:
     server:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

---

## Support & Documentation

- **Quick Reference**: See `README.md` in the bundle
- **Detailed Guide**: See `DEPLOYMENT-PROD.md`
- **API Documentation**: http://localhost:3000/docs
- **Source Code**: https://github.com/TKamar/Demands

---

## Checklist

- [ ] Internet-connected machine has Docker 20.10+
- [ ] Ran `package-offline.sh` successfully
- [ ] Transfer `.tar.gz` to offline machine
- [ ] Offline machine has Docker 20.10+ and 3GB+ disk
- [ ] Extracted bundle on offline machine
- [ ] Copied and edited `.env.example` to `.env`
- [ ] Ran `deploy-offline.sh` successfully
- [ ] Services report healthy status
- [ ] Can access http://localhost:3000/health
- [ ] Can access Keycloak admin panel
- [ ] Initial admin user configured
- [ ] Backup strategy in place

---

**Version**: 1.0  
**Last Updated**: 2026-07-01  
**Tested On**: Docker 25.0+, Docker Compose 2.20+, Ubuntu 22.04 LTS
