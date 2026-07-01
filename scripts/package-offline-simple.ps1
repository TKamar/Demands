#!/usr/bin/env pwsh
# Offline Package Builder for Windows
# Simplified version to create offline deployment bundle

param([string]$Version = "latest")

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BundleDir = "offline-bundle-${Version}-${Timestamp}"
$BundleName = "offline-deployment-${Version}-${Timestamp}.tar.gz"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Offline Package Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify Docker
Write-Host "[*] Verifying Docker..."
try {
    $DockerVersion = docker --version
    Write-Host "[OK] Docker: $DockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found" -ForegroundColor Red
    exit 1
}

try {
    $null = docker info
    Write-Host "[OK] Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker daemon not running" -ForegroundColor Red
    exit 1
}

# Verify Docker Compose
Write-Host "[*] Verifying Docker Compose..."
try {
    $ComposeVersion = docker-compose --version
    Write-Host "[OK] Docker Compose: $ComposeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker Compose not found" -ForegroundColor Red
    exit 1
}

# Build custom images
Write-Host ""
Write-Host "[*] Building custom images..." -ForegroundColor Cyan
try {
    docker-compose build server client
    Write-Host "[OK] Custom images built" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to build images" -ForegroundColor Red
    exit 1
}

# Pull external images
Write-Host ""
Write-Host "[*] Pulling external images..." -ForegroundColor Cyan
$Images = @("postgres:16-alpine", "quay.io/keycloak/keycloak:26.0")
foreach ($Image in $Images) {
    Write-Host "    Pulling $Image..."
    try {
        docker pull $Image
        Write-Host "[OK] Pulled $Image" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to pull $Image" -ForegroundColor Red
        exit 1
    }
}

# Create bundle directory
Write-Host ""
Write-Host "[*] Preparing bundle directory..." -ForegroundColor Cyan
if (Test-Path $BundleDir) {
    Remove-Item -Path $BundleDir -Recurse -Force
}
New-Item -Path $BundleDir -ItemType Directory -Force | Out-Null
Write-Host "[OK] Created $BundleDir" -ForegroundColor Green

# Export images
Write-Host ""
Write-Host "[*] Exporting Docker images..." -ForegroundColor Cyan
$ImagesPath = Join-Path $BundleDir "images.tar"
try {
    docker save -o $ImagesPath `
        "demands-server:latest" `
        "demands-client:latest" `
        "postgres:16-alpine" `
        "quay.io/keycloak/keycloak:26.0"
    Write-Host "[OK] Images exported" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to export images" -ForegroundColor Red
    exit 1
}

# Copy configuration files
Write-Host ""
Write-Host "[*] Copying configuration files..." -ForegroundColor Cyan

if (Test-Path "docker-compose.yml") {
    Copy-Item -Path "docker-compose.yml" -Destination $BundleDir
    Write-Host "[OK] Copied docker-compose.yml" -ForegroundColor Green
} else {
    Write-Host "[ERROR] docker-compose.yml not found" -ForegroundColor Red
    exit 1
}

if (Test-Path "DEPLOYMENT-PROD.md") {
    Copy-Item -Path "DEPLOYMENT-PROD.md" -Destination $BundleDir
    Write-Host "[OK] Copied DEPLOYMENT-PROD.md" -ForegroundColor Green
}

# Create .env.example
Write-Host "[*] Creating .env.example..." -ForegroundColor Cyan
$EnvFile = Join-Path $BundleDir ".env.example"
$EnvContent = @'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@postgres:5432/demands
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_MULTIPLE_DATABASES=demands,keycloak
OIDC_DISCOVERY_URL=http://keycloak:8080/realms/demands/.well-known/openid-configuration
AUTH_ISSUER=http://keycloak:8080/realms/demands
AUTH_AUDIENCE=demands-api
AUTH_GROUP_CLAIM_PATH=groups
AUTH_ADMIN_GROUP=admin
AUTH_MODERATOR_GROUP=moderator
AUTH_CLIENT_TYPE=keycloak
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=demands
KEYCLOAK_CLIENT_ID=demands-api
KEYCLOAK_CLIENT_SECRET=demands-api-secret
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
VITE_API_URL=http://localhost:3000
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/demands
VITE_OIDC_CLIENT_ID=demands-web
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
PRISMA_HIDE_UPDATE_MESSAGE=1
'@
$EnvContent | Out-File -FilePath $EnvFile -Encoding UTF8
Write-Host "[OK] Created .env.example" -ForegroundColor Green

# Copy deployment script
Write-Host "[*] Including deployment script..." -ForegroundColor Cyan
if (Test-Path "scripts/deploy-offline.ps1") {
    Copy-Item -Path "scripts/deploy-offline.ps1" -Destination $BundleDir
    Write-Host "[OK] Copied deploy-offline.ps1" -ForegroundColor Green
}

# Compress bundle
Write-Host ""
Write-Host "[*] Compressing bundle with tar..." -ForegroundColor Cyan
try {
    tar -czf $BundleName $BundleDir
    Write-Host "[OK] Bundle created: $BundleName" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to compress bundle" -ForegroundColor Red
    exit 1
}

$BundleSize = (Get-Item $BundleName).Length / 1GB
Write-Host "[OK] Bundle size: $([math]::Round($BundleSize, 2)) GB" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Packaging Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Output: $BundleName" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Transfer '$BundleName' to the offline machine"
Write-Host "2. Extract: tar -xzf $BundleName"
Write-Host "3. cd into the extracted folder"
Write-Host "4. Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass"
Write-Host "5. Run: .\deploy-offline.ps1"
Write-Host ""
