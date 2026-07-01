# Windows Offline/Air-Gapped Deployment Guide

This guide explains how to deploy the Demands system in a **strictly offline Windows environment** with no internet access.

## Overview

The Windows offline deployment strategy uses **PowerShell scripts** and Docker as the packaging mechanism:

1. **Build Phase** (Internet-connected Windows machine)
   - Build all custom Docker images
   - Pull external images from registries
   - Export everything into a single compressed archive
   - Transfer to offline machine

2. **Deploy Phase** (Offline Windows machine)
   - Load images from archive
   - Configure environment
   - Start services with docker-compose
   - Verify deployment

## Prerequisites

### Internet-Connected Machine (for Building)

**Hardware & OS:**
- Windows 10 (build 2004+), Windows 11, or Windows Server 2019+
- 8GB+ free disk space
- Internet access to Docker registries

**Software:**
- **Docker Desktop for Windows** (20.10+)
  - Download from: https://www.docker.com/products/docker-desktop
  - Or **Docker Engine** for Windows Server
- **PowerShell 5.1+** (included in Windows 10+)
- **tar.exe** (included in Windows 10+ build 2004+)
  - Verify: Open PowerShell and run `tar --version`
  - If not available, install **Git for Windows** which includes tar
- **Git** (to clone the repository)

**Verification:**

```powershell
# Check PowerShell version (should be 5.1 or higher)
$PSVersionTable.PSVersion

# Check Docker
docker --version
docker-compose --version

# Check tar
tar --version
```

### Offline Machine (for Deployment)

**Hardware & OS:**
- Windows 10 (build 2004+), Windows 11, or Windows Server 2019+
- 3GB+ free disk space (for images archive)
- 2GB+ RAM
- NO internet access required ✓

**Software:**
- **Docker Desktop for Windows** (20.10+) or **Docker Engine**
  - Must be installed and configured BEFORE transferring bundle
  - Test: `docker run hello-world`
- **PowerShell 5.1+** (included in Windows 10+)
- **tar.exe** (included in Windows 10+ build 2004+)

---

## Step-by-Step Deployment

### Phase 1: Build Offline Package (Internet-Connected Machine)

#### 1.1 Open PowerShell as Administrator

```powershell
# Right-click PowerShell → "Run as administrator"
# Or use Windows Terminal with admin privileges
```

#### 1.2 Navigate to Repository

```powershell
cd C:\path\to\Demands\Demands
# Example: cd C:\Development\Demands\Demands
```

#### 1.3 Prepare Repository

Build the frontend and backend:

```powershell
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

#### 1.4 Run Packaging Script

```powershell
# If you get execution policy error, run this first:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Run the packaging script
.\scripts\package-offline.ps1 -Version "v1.0.0"
```

**What this script does:**
1. ✓ Verifies Docker and Docker Compose
2. ✓ Builds server image from `server\Dockerfile`
3. ✓ Builds client image from `client\Dockerfile`
4. ✓ Pulls postgres:16-alpine
5. ✓ Pulls quay.io/keycloak/keycloak:26.0
6. ✓ Exports all images into `images.tar`
7. ✓ Copies configuration files
8. ✓ Creates `.env.example`
9. ✓ Compresses everything into `offline-deployment-v1.0.0-*.tar.gz`

**Output:**
```
offline-deployment-v1.0.0-20260701_143022.tar.gz  (~1.5GB)
offline-bundle-v1.0.0-20260701_143022\            (temporary directory)
```

#### 1.5 Verify Bundle

```powershell
# List contents (verify structure)
tar -tzf offline-deployment-v1.0.0-*.tar.gz | Select-Object -First 20
```

Expected contents:
```
offline-bundle-v1.0.0-20260701_143022/
├── images.tar           (~1.5GB - all Docker images)
├── docker-compose.yml   (service configuration)
├── .env.example         (environment template)
├── deploy-offline.ps1   (deployment script)
├── README.md            (quick reference)
└── DEPLOYMENT-PROD.md   (detailed guide - optional)
```

#### 1.6 Transfer to Offline Machine

Transfer the `.tar.gz` file to the offline machine using:
- USB drive
- Secure file transfer before air-gap
- Network transfer before isolation
- Cloud storage before air-gap (if allowed by security policy)

```powershell
# Example: Copy to USB drive at E:\
Copy-Item -Path "offline-deployment-v1.0.0-*.tar.gz" -Destination "E:\"
```

---

### Phase 2: Deploy in Offline Windows Environment

#### 2.1 Open PowerShell as Administrator

On the offline machine, open PowerShell with administrator privileges.

#### 2.2 Extract Bundle

```powershell
# Navigate to deployment directory
cd C:\Demands  # or your preferred location

# Extract bundle (or use Windows Explorer "Extract All")
tar -xzf offline-deployment-v1.0.0-*.tar.gz

# Navigate into extracted directory
cd offline-bundle-v1.0.0-*
```

#### 2.3 Handle Execution Policy (if needed)

If PowerShell blocks the script:

```powershell
# Option 1: Bypass for current process only (recommended)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Option 2: Right-click deploy-offline.ps1 → Run with PowerShell
# (If already done, skip to 2.4)
```

#### 2.4 Configure Environment

```powershell
# Copy example to actual config
Copy-Item -Path ".env.example" -Destination ".env"

# Edit with your values (using notepad or your editor)
notepad .env
# Or: code .env (if Visual Studio Code installed)
```

**Critical Configuration:**

Edit these values in `.env`:

```env
# Database - MUST CHANGE THESE
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://user:your-secure-password@postgres:5432/demands

# Keycloak Admin - MUST CHANGE THIS
KEYCLOAK_ADMIN_PASSWORD=your-admin-password

# Frontend URL (adjust if behind reverse proxy)
VITE_API_URL=http://localhost:3000
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/demands
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback

# API Security
AUTH_AUDIENCE=demands-api
AUTH_ADMIN_GROUP=admin
```

#### 2.5 Run Deployment Script

```powershell
# Ensure execution policy allows script execution
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Run deployment
.\deploy-offline.ps1
```

**Script Output Example:**
```
=== Verifying Prerequisites ===
[INFO] Docker found: Docker version 25.0.1
[INFO] ✓ Docker daemon is running
[INFO] Docker Compose found: Docker Compose version v2.20.2

=== Verifying Bundle Files ===
[INFO] ✓ Found images.tar
[INFO] ✓ Found docker-compose.yml
[INFO] ✓ Found .env

=== Loading Docker Images ===
[INFO] This may take several minutes...
[INFO] ✓ Docker images loaded successfully

=== Starting Services ===
[INFO] Running: docker-compose up -d
[INFO] ✓ Services started

=== Waiting for Services ===
[INFO] ✓ API server is healthy
[INFO] All services ready

=== Deployment Complete! ===
Service Endpoints:
  API Server:  http://localhost:3000
  Keycloak:    http://localhost:8080
```

#### 2.6 Verify Deployment

```powershell
# Check running services
docker-compose ps

# Test API health
curl http://localhost:3000/health
# Or with PowerShell:
Invoke-WebRequest http://localhost:3000/health

# View service logs
docker-compose logs

# View specific service logs
docker-compose logs server
docker-compose logs keycloak
```

**Expected Output:**
```
NAME            STATUS
postgres        Up 2 minutes
keycloak        Up 1 minute
server          Up 1 minute
client          Up 50 seconds (if dev profile)
```

#### 2.7 Access Services

Once services are healthy:

- **API Server**: http://localhost:3000
  - Health check: http://localhost:3000/health
  - Swagger docs: http://localhost:3000/docs (if enabled)

- **Keycloak Admin Panel**: http://localhost:8080
  - Username: `admin`
  - Password: (value from `KEYCLOAK_ADMIN_PASSWORD` in `.env`)

#### 2.8 Initial Admin Setup

See `DEPLOYMENT-PROD.md` for detailed first-time admin setup steps.

---

## Troubleshooting

### PowerShell Execution Policy Error

**Error:** `script.ps1 cannot be loaded because running scripts is disabled`

**Solution:**

```powershell
# Bypass for current process only (most secure)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Then run the script
.\deploy-offline.ps1
```

Or right-click the `.ps1` file → "Run with PowerShell"

### Docker Daemon Not Running

**Error:** `error during connect: This error may indicate the daemon is not running`

**Solution:**

```powershell
# Start Docker Desktop
# Look for Docker icon in system tray

# Or if using Docker Engine:
# Restart Docker service as administrator
Restart-Service docker

# Verify it's running
docker ps
```

### Images Failed to Load

**Error:** `EOF while reading tar stream` or `corrupted tar`

**Cause:** `images.tar` may be corrupted or incomplete

**Solution:**

```powershell
# Re-transfer the file from the build machine
# Verify file size matches original

# If that fails, manually re-create bundle on build machine
```

### Services Won't Start

**Check logs:**

```powershell
docker-compose logs
docker-compose logs server
docker-compose logs keycloak

# Export logs for analysis
docker-compose logs > demands-logs.txt
```

**Common Issues:**

1. **Port already in use**
   ```powershell
   # Find what's using port 3000
   netstat -ano | Select-String ":3000"
   # Change PORT in .env if needed
   ```

2. **Out of disk space**
   ```powershell
   Get-Volume | Select-Object Drive, SizeRemaining, Size
   # Need at least 3GB free
   ```

3. **Keycloak startup timeout**
   - Keycloak takes 30-60 seconds to start on first boot
   - Check logs: `docker-compose logs keycloak | tail -50`

### Database Connection Errors

**Error:** `Error: ECONNREFUSED 127.0.0.1:5432`

**Cause:** Postgres not running or `DATABASE_URL` is incorrect

**Solution:**

```powershell
# Verify postgres service is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
# Should be: postgresql://user:password@postgres:5432/demands
# (hostname must be 'postgres', not 'localhost')
```

### Running Services Manually

If `deploy-offline.ps1` doesn't work:

```powershell
# Load images manually
docker load -i images.tar

# Read environment file (manual)
# Copy values from .env

# Start services
docker-compose up -d

# Watch startup
docker-compose logs -f
```

### Cleanup and Restart

```powershell
# Stop services (keep data)
docker-compose down

# Stop services and remove data
docker-compose down -v

# Restart from clean state
.\deploy-offline.ps1
```

---

## Monitoring & Operations

### Daily Operations

```powershell
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

```powershell
docker-compose exec postgres pg_dump -U user demands | Out-File -Encoding UTF8 -FilePath demands-backup.sql
```

**Restore database:**

```powershell
Get-Content demands-backup.sql | docker-compose exec -T postgres psql -U user demands
```

### Useful PowerShell Utilities

```powershell
# Kill a container if needed
docker-compose kill server

# Remove stopped containers
docker container prune

# View image disk usage
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}"

# Free up space by removing images
docker rmi postgres:16-alpine
```

---

## Advanced Configuration

### Behind a Reverse Proxy

If running behind nginx/IIS:

```env
# Update frontend URLs to match your domain
VITE_API_URL=https://demands.yourcompany.com/api
VITE_OIDC_AUTHORITY=https://keycloak.yourcompany.com/realms/demands
VITE_OIDC_REDIRECT_URI=https://demands.yourcompany.com/callback
```

### Custom Keycloak Configuration

To use a different Keycloak realm:

1. Export realm from production Keycloak
2. Place in `docker\keycloak\demands-realm.json`
3. Rebuild with `package-offline.ps1`

### Isolated Docker Networks

For enhanced security:

```powershell
# Create custom network
docker network create demands-net

# Update docker-compose.yml networks section
docker-compose up -d
```

---

## Performance Tips

1. **Increase Docker daemon resource limits:**
   - Right-click Docker icon → Settings
   - Resources → CPU and Memory sliders

2. **Mount volumes on fast storage** (SSD if possible)

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

4. **Disable Docker log rotation** if logs grow too large:
   - Edit `%AppData%\Docker\daemon.json`
   - Add log-driver configuration

---

## Support & Documentation

- **Quick Reference**: See `README.md` in the bundle
- **Detailed Guide**: See `DEPLOYMENT-PROD.md`
- **API Documentation**: http://localhost:3000/docs
- **Source Code**: https://github.com/TKamar/Demands
- **Docker Desktop Help**: https://docs.docker.com/desktop/

---

## Checklist

- [ ] Internet machine has Docker Desktop 20.10+
- [ ] Ran `package-offline.ps1` successfully
- [ ] Transfer `.tar.gz` to offline machine
- [ ] Offline machine has Docker Desktop 20.10+ and 3GB+ disk
- [ ] Extracted bundle on offline machine
- [ ] Copied and edited `.env.example` to `.env`
- [ ] Changed default passwords in `.env`
- [ ] Ran `deploy-offline.ps1` successfully (or use execution policy bypass)
- [ ] Services report healthy status
- [ ] Can access http://localhost:3000/health
- [ ] Can access Keycloak admin panel
- [ ] Initial admin user configured
- [ ] Backup strategy in place
- [ ] Firewall/port rules configured
- [ ] Reverse proxy configured (if applicable)

---

**Version**: 1.0 (Windows)  
**Last Updated**: 2026-07-01  
**Tested On**: Windows 11 (22H2), Docker Desktop 25.0, PowerShell 5.1
