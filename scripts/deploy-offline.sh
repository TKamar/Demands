#!/bin/bash
set -euo pipefail

###############################################################################
# Offline Deployment Script
# Runs on the OFFLINE/AIR-GAPPED machine to load images and start services
# Usage: ./deploy-offline.sh
###############################################################################

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_header() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
  echo ""
}

###############################################################################
# Step 1: Verify Prerequisites
###############################################################################

log_header "Verifying Prerequisites"

# Check docker
if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed or not in PATH"
  echo "Please install Docker Engine 20.10 or later"
  exit 1
fi

# Check docker-compose
if ! command -v docker-compose &> /dev/null; then
  log_error "Docker Compose is not installed or not in PATH"
  echo "Please install Docker Compose 2.0 or later"
  exit 1
fi

# Verify docker daemon is running
if ! docker info > /dev/null 2>&1; then
  log_error "Docker daemon is not running"
  echo "Please start the Docker daemon and try again"
  exit 1
fi

DOCKER_VERSION=$(docker --version | grep -oP 'Docker version \K[0-9]+\.[0-9]+')
COMPOSE_VERSION=$(docker-compose --version | grep -oP 'Docker Compose version \K[0-9]+\.[0-9]+')

log_info "✓ Docker $DOCKER_VERSION found"
log_info "✓ Docker Compose $COMPOSE_VERSION found"

###############################################################################
# Step 2: Verify Required Files
###############################################################################

log_header "Verifying Bundle Files"

REQUIRED_FILES=(
  "images.tar.gz"
  "docker-compose.yml"
  ".env"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  else
    log_info "✓ Found $file"
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  log_error "Missing required files:"
  for file in "${MISSING_FILES[@]}"; do
    echo "  - $file"
  done
  echo ""
  echo "Setup Instructions:"
  echo "1. Extract the bundle: tar -xzf offline-deployment-*.tar.gz"
  echo "2. Copy .env.example to .env: cp .env.example .env"
  echo "3. Edit .env with your configuration"
  echo "4. Run this script again"
  exit 1
fi

###############################################################################
# Step 3: Validate .env Configuration
###############################################################################

log_header "Validating Environment Configuration"

# Source the .env file
set +u  # Allow unset variables for a moment
source .env
set -u

CRITICAL_VARS=(
  "POSTGRES_PASSWORD"
  "KEYCLOAK_ADMIN_PASSWORD"
  "DATABASE_URL"
)

UNCONFIGURED_VARS=()

for var in "${CRITICAL_VARS[@]}"; do
  if [ -z "${!var:-}" ] || [ "${!var}" = "password" ] || [ "${!var}" = "admin" ]; then
    UNCONFIGURED_VARS+=("$var")
  fi
done

if [ ${#UNCONFIGURED_VARS[@]} -gt 0 ]; then
  log_warn "Please configure the following variables in .env:"
  for var in "${UNCONFIGURED_VARS[@]}"; do
    echo "  - $var"
  done
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Aborted by user"
    exit 1
  fi
fi

log_info "✓ Environment configuration looks good"

###############################################################################
# Step 4: Load Docker Images
###############################################################################

log_header "Loading Docker Images"

if [ ! -f "images.tar.gz" ]; then
  log_error "images.tar.gz not found"
  exit 1
fi

log_info "This may take several minutes depending on disk speed..."
log_info "Extracting and loading images..."

if docker load -i images.tar.gz; then
  log_info "✓ Docker images loaded successfully"
else
  log_error "Failed to load Docker images"
  exit 1
fi

###############################################################################
# Step 5: Verify Images Loaded
###############################################################################

log_header "Verifying Loaded Images"

EXPECTED_IMAGES=(
  "postgres:16-alpine"
  "quay.io/keycloak/keycloak:26.0"
)

for img in "${EXPECTED_IMAGES[@]}"; do
  if docker image inspect "$img" > /dev/null 2>&1; then
    log_info "✓ Found $img"
  else
    log_warn "Image $img not found in local registry"
  fi
done

docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(server|client)" | while read img; do
  log_info "✓ Found custom image: $img"
done

###############################################################################
# Step 6: Start Services
###############################################################################

log_header "Starting Services"

log_info "Running: docker-compose up -d"

if docker-compose up -d; then
  log_info "✓ Services started"
else
  log_error "Failed to start services"
  log_info "Check docker-compose logs:"
  docker-compose logs
  exit 1
fi

###############################################################################
# Step 7: Wait for Services to Be Ready
###############################################################################

log_header "Waiting for Services to Become Ready"

log_info "Waiting for services to stabilize (up to 60 seconds)..."

MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # Check server health
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    log_info "✓ API server is healthy"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  if [ $((ATTEMPT % 10)) -eq 0 ]; then
    log_info "Waiting... ($ATTEMPT/${MAX_ATTEMPTS}s)"
  fi
  sleep 1
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  log_warn "Services did not report healthy within timeout"
  log_warn "Check logs: docker-compose logs"
else
  log_info "All services ready"
fi

###############################################################################
# Step 8: Display Summary
###############################################################################

log_header "Deployment Complete!"

echo ""
echo "Service Endpoints:"
echo "  API Server:  http://localhost:3000"
echo "  UI:          http://localhost:5173 (if dev profile)"
echo "  Keycloak:    http://localhost:8080"
echo ""
echo "Useful Commands:"
echo "  View logs:              docker-compose logs -f"
echo "  View specific logs:     docker-compose logs -f server"
echo "  Stop services:          docker-compose down"
echo "  Stop and remove data:   docker-compose down -v"
echo ""
echo "Health Check:"
echo "  curl http://localhost:3000/health"
echo ""
echo "Next Steps:"
echo "  1. Configure your infrastructure/reverse proxy"
echo "  2. Set up monitoring and alerting"
echo "  3. Configure backup procedures"
echo "  4. See DEPLOYMENT-PROD.md for detailed guidance"
echo ""

###############################################################################
# Cleanup
###############################################################################

# Optionally clean up the compressed images if explicitly requested
if [ "${CLEANUP_IMAGES:-false}" = "true" ]; then
  log_info "Removing compressed images archive (keeping loaded images)..."
  rm -f images.tar.gz
  log_info "✓ Cleaned up images.tar.gz"
fi

log_info "✓ Done!"
