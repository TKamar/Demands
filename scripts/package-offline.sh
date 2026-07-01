#!/bin/bash
set -euo pipefail

###############################################################################
# Offline Package Builder
# Runs on an INTERNET-CONNECTED machine to create an offline deployment bundle
# Usage: ./scripts/package-offline.sh [version]
###############################################################################

VERSION="${1:-latest}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUNDLE_DIR="offline-bundle-${VERSION}-${TIMESTAMP}"
BUNDLE_NAME="offline-deployment-${VERSION}-${TIMESTAMP}.tar.gz"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

###############################################################################
# Step 1: Verify Prerequisites
###############################################################################

log_info "=== Offline Package Builder ==="
log_info "Version: $VERSION | Bundle: $BUNDLE_NAME"
log_info ""

# Check docker
if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed or not in PATH"
  exit 1
fi

# Check docker-compose
if ! command -v docker-compose &> /dev/null; then
  log_error "Docker Compose is not installed or not in PATH"
  exit 1
fi

# Verify docker daemon is running
if ! docker info > /dev/null 2>&1; then
  log_error "Docker daemon is not running"
  exit 1
fi

log_info "✓ Docker and Docker Compose found"
log_info ""

###############################################################################
# Step 2: Build Custom Images
###############################################################################

log_info "=== Building Custom Images ==="
log_info "Building server and client images..."

if docker-compose build server client; then
  log_info "✓ Custom images built successfully"
else
  log_error "Failed to build custom images"
  exit 1
fi

log_info ""

###############################################################################
# Step 3: Pull External Images
###############################################################################

log_info "=== Pulling External Images ==="

EXTERNAL_IMAGES=(
  "postgres:16-alpine"
  "quay.io/keycloak/keycloak:26.0"
)

for img in "${EXTERNAL_IMAGES[@]}"; do
  log_info "Pulling $img..."
  if docker pull "$img"; then
    log_info "✓ Pulled $img"
  else
    log_error "Failed to pull $img"
    exit 1
  fi
done

log_info ""

###############################################################################
# Step 4: Prepare Bundle Directory
###############################################################################

log_info "=== Preparing Bundle Directory ==="

if [ -d "$BUNDLE_DIR" ]; then
  log_warn "Bundle directory $BUNDLE_DIR already exists, removing..."
  rm -rf "$BUNDLE_DIR"
fi

mkdir -p "$BUNDLE_DIR"
log_info "✓ Created $BUNDLE_DIR"

###############################################################################
# Step 5: Export Docker Images
###############################################################################

log_info "=== Exporting Docker Images ==="

# Get image names from docker-compose
SERVER_IMAGE=$(docker-compose config --services | xargs docker-compose config | grep "image:" | head -1 | awk '{print $NF}' || echo "demands:server")
CLIENT_IMAGE=$(docker-compose config --services | xargs docker-compose config | grep "image:" | tail -1 | awk '{print $NF}' || echo "demands:client")

# Fallback to service names + rebuild tag
if [ -z "$SERVER_IMAGE" ] || [ "$SERVER_IMAGE" = "image:" ]; then
  SERVER_IMAGE="$(basename $(pwd))_server:latest"
fi
if [ -z "$CLIENT_IMAGE" ] || [ "$CLIENT_IMAGE" = "image:" ]; then
  CLIENT_IMAGE="$(basename $(pwd))_client:latest"
fi

log_info "Exporting images..."
log_info "  - Custom: server"
log_info "  - Custom: client"
log_info "  - External: postgres:16-alpine"
log_info "  - External: quay.io/keycloak/keycloak:26.0"

IMAGES_TAR="$BUNDLE_DIR/images.tar"

if docker save -o "$IMAGES_TAR" \
  "${SERVER_IMAGE}" \
  "${CLIENT_IMAGE}" \
  "postgres:16-alpine" \
  "quay.io/keycloak/keycloak:26.0"; then

  # Compress the tar to reduce size
  log_info "Compressing images archive..."
  gzip "$IMAGES_TAR"
  IMAGES_TAR="${IMAGES_TAR}.gz"

  SIZE=$(du -h "$IMAGES_TAR" | cut -f1)
  log_info "✓ Images exported: $IMAGES_TAR ($SIZE)"
else
  log_error "Failed to export Docker images"
  exit 1
fi

log_info ""

###############################################################################
# Step 6: Copy Configuration Files
###############################################################################

log_info "=== Copying Configuration Files ==="

# Copy docker-compose.yml
if [ -f "docker-compose.yml" ]; then
  cp docker-compose.yml "$BUNDLE_DIR/"
  log_info "✓ Copied docker-compose.yml"
else
  log_error "docker-compose.yml not found in current directory"
  exit 1
fi

# Copy DEPLOYMENT-PROD.md if it exists
if [ -f "DEPLOYMENT-PROD.md" ]; then
  cp DEPLOYMENT-PROD.md "$BUNDLE_DIR/"
  log_info "✓ Copied DEPLOYMENT-PROD.md"
else
  log_warn "DEPLOYMENT-PROD.md not found (optional)"
fi

# Create .env.example from docker-compose environment variables
log_info "Creating .env.example..."
cat > "$BUNDLE_DIR/.env.example" << 'EOF'
# Demands System - Offline Deployment Environment Variables
# Copy this file to .env and fill in your values before running deploy-offline.sh

# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/demands
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_MULTIPLE_DATABASES=demands,keycloak

# OIDC / Keycloak Authentication
OIDC_DISCOVERY_URL=http://keycloak:8080/realms/demands/.well-known/openid-configuration
AUTH_ISSUER=http://keycloak:8080/realms/demands
AUTH_AUDIENCE=demands-api
AUTH_GROUP_CLAIM_PATH=groups
AUTH_ADMIN_GROUP=admin
AUTH_MODERATOR_GROUP=moderator
AUTH_CLIENT_TYPE=keycloak

# Keycloak Configuration
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=demands
KEYCLOAK_CLIENT_ID=demands-api
KEYCLOAK_CLIENT_SECRET=demands-api-secret
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin

# Frontend Configuration
VITE_API_URL=http://localhost:3000
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/demands
VITE_OIDC_CLIENT_ID=demands-web
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback

# Prisma
PRISMA_HIDE_UPDATE_MESSAGE=1
EOF
log_info "✓ Created .env.example"

log_info ""

###############################################################################
# Step 7: Copy Deployment Script
###############################################################################

log_info "=== Including Deployment Script ==="

if [ -f "scripts/deploy-offline.sh" ]; then
  cp scripts/deploy-offline.sh "$BUNDLE_DIR/"
  chmod +x "$BUNDLE_DIR/deploy-offline.sh"
  log_info "✓ Copied and made executable: deploy-offline.sh"
else
  log_warn "scripts/deploy-offline.sh not found (will be created separately)"
fi

log_info ""

###############################################################################
# Step 8: Create README in Bundle
###############################################################################

log_info "=== Creating Bundle README ==="

cat > "$BUNDLE_DIR/README.md" << 'EOF'
# Offline Deployment Bundle

This package contains everything needed to deploy the Demands system in an **offline/air-gapped** environment.

## Contents
- `images.tar.gz` - All Docker images (server, client, postgres, keycloak)
- `docker-compose.yml` - Service configuration
- `.env.example` - Environment variables template
- `deploy-offline.sh` - Automated deployment script
- `DEPLOYMENT-PROD.md` - Detailed deployment guide

## Quick Start

### 1. Extract Bundle
```bash
tar -xzf offline-deployment-*.tar.gz
cd offline-deployment-*
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings (passwords, hostnames, etc.)
nano .env
```

### 3. Deploy
```bash
./deploy-offline.sh
```

### 4. Verify
```bash
docker-compose ps
curl http://localhost:3000/health
```

## System Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ available disk space
- 2GB+ RAM
- Bash shell

## Troubleshooting

### Images fail to load
```bash
# Manually load images if deploy script fails
docker load -i images.tar.gz
```

### Permission denied on deploy-offline.sh
```bash
chmod +x deploy-offline.sh
./deploy-offline.sh
```

### Services won't start
Check logs:
```bash
docker-compose logs -f server
docker-compose logs -f keycloak
```

## Further Help
See `DEPLOYMENT-PROD.md` for comprehensive deployment documentation.
EOF

log_info "✓ Created README.md"
log_info ""

###############################################################################
# Step 9: Create Final Bundle Archive
###############################################################################

log_info "=== Creating Final Archive ==="

if tar -czf "$BUNDLE_NAME" "$BUNDLE_DIR"; then
  FINAL_SIZE=$(du -h "$BUNDLE_NAME" | cut -f1)
  log_info "✓ Bundle created: $BUNDLE_NAME ($FINAL_SIZE)"
else
  log_error "Failed to create bundle archive"
  exit 1
fi

log_info ""

###############################################################################
# Step 10: Summary & Cleanup
###############################################################################

log_info "=== Packaging Complete ==="
log_info ""
log_info "Output Bundle: $BUNDLE_NAME"
log_info "Temporary Directory: $BUNDLE_DIR (kept for inspection)"
log_info ""
log_info "Next Steps:"
log_info "1. Transfer '$BUNDLE_NAME' to the offline machine"
log_info "2. Extract: tar -xzf $BUNDLE_NAME"
log_info "3. Run: cd $(basename $BUNDLE_DIR) && ./deploy-offline.sh"
log_info ""
log_info "For detailed instructions, see OFFLINE-README.md"
log_info ""
log_info "✓ Done!"
