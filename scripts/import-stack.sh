#!/bin/bash
set -e

# Demands Docker Stack Import Script (macOS/Linux)
#
# This script loads a pre-exported Docker stack archive into the local Docker daemon
# and prepares it for use. It handles:
#   - Rosetta/emulation verification (for Apple Silicon)
#   - Docker image loading
#   - Optional volume restoration
#   - Configuration verification

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="demands"

echo "=== Demands Docker Stack Import ==="
echo "Location: $SCRIPT_DIR"
echo ""

# Color output helpers
info()   { echo -e "\033[1;36m[INFO]\033[0m $1"; }
warn()   { echo -e "\033[1;33m[WARN]\033[0m $1"; }
error()  { echo -e "\033[1;31m[ERROR]\033[0m $1"; }
success() { echo -e "\033[1;32m✓\033[0m $1"; }

# Export project name for compose commands
export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
export NODE_ENV="development"

# Step 1: Verify Docker daemon is running and accessible
info "Checking Docker daemon..."
if ! docker info > /dev/null 2>&1; then
    error "Docker daemon is not running. Please start Docker Desktop and retry."
    exit 1
fi
success "Docker daemon is accessible"

# Step 2: Check for Rosetta emulation support on Apple Silicon
if [[ "$(uname -m)" == "arm64" ]]; then
    info "Apple Silicon detected. Verifying amd64 emulation (Rosetta)..."
    if ! docker run --rm --platform linux/amd64 alpine uname -m > /dev/null 2>&1; then
        error "amd64 emulation is not working. On Apple Silicon, you must enable:"
        echo "  Docker Desktop → Settings → General → 'Use Rosetta for x86/amd64 emulation on Apple Silicon'"
        echo ""
        echo "After enabling, restart Docker Desktop and retry this script."
        exit 1
    fi
    success "Rosetta/amd64 emulation is working"
fi

# Step 3: Check for required files
info "Verifying archive contents..."
required_files=("images/demands-images.tar.gz" "docker-compose.yml")
for file in "${required_files[@]}"; do
    if [[ ! -f "$SCRIPT_DIR/$file" ]]; then
        error "Missing required file: $file"
        exit 1
    fi
done
success "All required files present"

# Step 4: Load Docker images
info "Loading Docker images..."
docker load -i "$SCRIPT_DIR/images/demands-images.tar.gz" 2>&1 | grep -E '(Loaded image|ERROR)' || true
if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    error "Failed to load Docker images"
    exit 1
fi
success "Docker images loaded"

# Step 5: Restore volume if present
if [[ -f "$SCRIPT_DIR/volumes/postgres_data.tar.gz" ]]; then
    info "Restoring postgres_data volume..."
    volume_name="${PROJECT_NAME}_postgres_data"

    # Create the volume
    docker volume create "$volume_name" > /dev/null 2>&1 || true

    # Restore the volume data
    docker run --rm \
        -v "$volume_name:/data" \
        -v "$SCRIPT_DIR/volumes:/backup" \
        alpine \
        sh -c "tar xzf /backup/postgres_data.tar.gz -C /data" 2>&1 | grep -v '^$' || true

    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
        success "Volume restored: $volume_name"
    else
        warn "Volume restoration had issues, but continuing (data may be incomplete)"
    fi
else
    warn "No postgres_data.tar.gz found; proceeding with empty database"
fi

# Step 6: Verify compose file and guide .env setup
info "Checking compose configuration..."
if ! docker compose -f "$SCRIPT_DIR/docker-compose.yml" config > /dev/null 2>&1; then
    error "docker-compose.yml validation failed"
    exit 1
fi
success "Compose configuration is valid"

# Step 7: Check for .env files and guide setup
info "Checking environment configuration..."
env_setup_needed=false
for dir in server client; do
    if [[ ! -f "$SCRIPT_DIR/$dir/.env" ]]; then
        if [[ -f "$SCRIPT_DIR/$dir/.env.example" ]]; then
            warn "Missing $dir/.env (found .env.example)"
            env_setup_needed=true
        fi
    fi
done

if [[ "$env_setup_needed" == "true" ]]; then
    echo ""
    echo "To complete setup, create .env files from .env.example:"
    echo "  cp server/.env.example server/.env"
    echo "  cp client/.env.example client/.env"
    echo ""
    echo "Edit the files with your actual secrets (Keycloak client ID, DB password, etc.)"
    echo ""
fi

# Step 8: Summary and next steps
echo ""
echo "=== Import Complete ==="
success "All Docker images and volumes are ready"
echo ""
echo "Next steps:"
echo "  1. If needed, create .env files (see above)"
echo "  2. Start the stack:"
echo "     cd $SCRIPT_DIR"
echo "     NODE_ENV=development docker compose --profile dev up"
echo ""
echo "Access the services:"
echo "  - Client (Vite):   http://localhost:5173"
echo "  - Server (Express): http://localhost:3000"
echo "  - Keycloak (Auth):  http://localhost:8080"
echo ""
echo "Default Keycloak credentials: admin / admin"
echo "Default test users: admin / admin123, user1 / test123, mod1 / test123"
echo ""
