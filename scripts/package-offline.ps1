#Requires -Version 5.1
<#
.SYNOPSIS
    Offline Package Builder for Windows
    Runs on an INTERNET-CONNECTED Windows machine to create an offline deployment bundle

.DESCRIPTION
    This script builds Docker images, pulls external images, and packages everything
    into a single compressed tarball for offline deployment on Windows air-gapped machines.

.PARAMETER Version
    Version string for the bundle (default: 'latest')

.EXAMPLE
    .\package-offline.ps1 -Version "v1.0.0"

.NOTES
    Requires: PowerShell 5.1+, Docker Desktop/Engine, Docker Compose, Windows 10+ tar.exe
#>

param(
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# ============================================================================
# Configuration
# ============================================================================

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BundleDir = "offline-bundle-${Version}-${Timestamp}"
$BundleName = "offline-deployment-${Version}-${Timestamp}.tar.gz"

# Color scheme
$ColorInfo = "Green"
$ColorWarn = "Yellow"
$ColorError = "Red"
$ColorHeader = "Cyan"

# ============================================================================
# Logging Functions
# ============================================================================

function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO]" -ForegroundColor $ColorInfo -NoNewline
    Write-Host " $Message"
}

function Write-LogWarn {
    param([string]$Message)
    Write-Host "[WARN]" -ForegroundColor $ColorWarn -NoNewline
    Write-Host " $Message"
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR]" -ForegroundColor $ColorError -NoNewline
    Write-Host " $Message"
}

function Write-LogHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor $ColorHeader
    Write-Host ""
}

# ============================================================================
# Step 1: Verify Prerequisites
# ============================================================================

Write-LogHeader "Verifying Prerequisites"

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-LogError "PowerShell 5.1+ required (current: $($PSVersionTable.PSVersion))"
    exit 1
}
Write-LogInfo "PowerShell version: $($PSVersionTable.PSVersion)"

# Check Docker
try {
    $DockerVersion = docker --version
    Write-LogInfo "Docker found: $DockerVersion"
} catch {
    Write-LogError "Docker is not installed or not in PATH"
    exit 1
}

# Check Docker daemon
try {
    $null = docker info
    Write-LogInfo "✓ Docker daemon is running"
} catch {
    Write-LogError "Docker daemon is not running or not accessible"
    exit 1
}

# Check Docker Compose
try {
    $ComposeVersion = docker-compose --version
    Write-LogInfo "Docker Compose found: $ComposeVersion"
} catch {
    Write-LogError "Docker Compose is not installed or not in PATH"
    exit 1
}

# Check tar command
try {
    $TarVersion = tar --version
    Write-LogInfo "✓ tar.exe is available"
} catch {
    Write-LogError "tar.exe not found. Windows 10+ includes native tar.exe"
    Write-LogError "If using older Windows, install Git Bash or WSL"
    exit 1
}

# ============================================================================
# Step 2: Build Custom Images
# ============================================================================

Write-LogHeader "Building Custom Images"
Write-LogInfo "Building server and client images..."

try {
    docker-compose build server client
    Write-LogInfo "✓ Custom images built successfully"
} catch {
    Write-LogError "Failed to build custom images"
    Write-LogError $_.Exception.Message
    exit 1
}

# ============================================================================
# Step 3: Pull External Images
# ============================================================================

Write-LogHeader "Pulling External Images"

$ExternalImages = @(
    "postgres:16-alpine",
    "quay.io/keycloak/keycloak:26.0"
)

foreach ($Image in $ExternalImages) {
    Write-LogInfo "Pulling $Image..."
    try {
        docker pull $Image
        Write-LogInfo "✓ Pulled $Image"
    } catch {
        Write-LogError "Failed to pull $Image"
        exit 1
    }
}

# ============================================================================
# Step 4: Prepare Bundle Directory
# ============================================================================

Write-LogHeader "Preparing Bundle Directory"

if (Test-Path $BundleDir) {
    Write-LogWarn "Bundle directory $BundleDir already exists, removing..."
    Remove-Item -Path $BundleDir -Recurse -Force
}

New-Item -Path $BundleDir -ItemType Directory -Force | Out-Null
Write-LogInfo "✓ Created $BundleDir"

# ============================================================================
# Step 5: Export Docker Images
# ============================================================================

Write-LogHeader "Exporting Docker Images"

Write-LogInfo "Exporting images to tarball..."
Write-LogInfo "  - Custom: server"
Write-LogInfo "  - Custom: client"
Write-LogInfo "  - External: postgres:16-alpine"
Write-LogInfo "  - External: quay.io/keycloak/keycloak:26.0"

$ImagesPath = Join-Path $BundleDir "images.tar"

try {
    docker save -o $ImagesPath `
        "demands:server" `
        "demands:client" `
        "postgres:16-alpine" `
        "quay.io/keycloak/keycloak:26.0"

    Write-LogInfo "✓ Images exported to $ImagesPath"
} catch {
    Write-LogError "Failed to export Docker images"
    Write-LogError $_.Exception.Message
    exit 1
}

# Note: Compression will happen with tar command later
$FileSize = (Get-Item $ImagesPath).Length / 1GB
Write-LogInfo "Uncompressed size: $([math]::Round($FileSize, 2)) GB"

# ============================================================================
# Step 6: Copy Configuration Files
# ============================================================================

Write-LogHeader "Copying Configuration Files"

# Copy docker-compose.yml
if (Test-Path "docker-compose.yml") {
    Copy-Item -Path "docker-compose.yml" -Destination $BundleDir
    Write-LogInfo "✓ Copied docker-compose.yml"
} else {
    Write-LogError "docker-compose.yml not found in current directory"
    exit 1
}

# Copy DEPLOYMENT-PROD.md if it exists
if (Test-Path "DEPLOYMENT-PROD.md") {
    Copy-Item -Path "DEPLOYMENT-PROD.md" -Destination $BundleDir
    Write-LogInfo "✓ Copied DEPLOYMENT-PROD.md"
} else {
    Write-LogWarn "DEPLOYMENT-PROD.md not found (optional)"
}

# Create .env.example
Write-LogInfo "Creating .env.example..."
$EnvContent = @"
# Demands System - Offline Deployment Environment Variables
# Copy this file to .env and fill in your values before running deploy-offline.ps1

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
"@

$EnvContent | Out-File -FilePath (Join-Path $BundleDir ".env.example") -Encoding UTF8
Write-LogInfo "✓ Created .env.example"

# ============================================================================
# Step 7: Copy Deployment Script
# ============================================================================

Write-LogHeader "Including Deployment Script"

if (Test-Path "scripts/deploy-offline.ps1") {
    Copy-Item -Path "scripts/deploy-offline.ps1" -Destination $BundleDir
    Write-LogInfo "✓ Copied deploy-offline.ps1"
} else {
    Write-LogWarn "scripts/deploy-offline.ps1 not found (will be created separately)"
}

# ============================================================================
# Step 8: Create Bundle README
# ============================================================================

Write-LogHeader "Creating Bundle README"

$ReadmeContent = @"
# Offline Deployment Bundle (Windows)

This package contains everything needed to deploy the Demands system in an **offline/air-gapped** Windows environment.

## Contents
- ``images.tar`` - All Docker images (compressed within bundle)
- ``docker-compose.yml`` - Service configuration
- ``.env.example`` - Environment variables template
- ``deploy-offline.ps1`` - Automated deployment script (PowerShell)
- ``DEPLOYMENT-PROD.md`` - Detailed deployment guide

## Quick Start

### 1. Extract Bundle
\`\`\`powershell
tar -xzf offline-deployment-*.tar.gz
cd offline-deployment-*
\`\`\`

### 2. Configure Environment
\`\`\`powershell
Copy-Item -Path ".env.example" -Destination ".env"
# Edit .env with your settings
notepad .env
\`\`\`

### 3. Deploy
\`\`\`powershell
# If execution policy blocks script:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Run deployment
.\deploy-offline.ps1
\`\`\`

### 4. Verify
\`\`\`powershell
docker-compose ps
curl http://localhost:3000/health
\`\`\`

## System Requirements
- Docker Desktop (20.10+) or Docker Engine
- Docker Compose (2.0+)
- PowerShell 5.1+ (Windows 10+)
- 4GB+ available disk space
- 2GB+ RAM
- Windows 10, Windows 11, or Windows Server 2019+

## Troubleshooting

### PowerShell Execution Policy
If the script won't run:
\`\`\`powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy-offline.ps1
\`\`\`

### Permission Denied
Run PowerShell as Administrator if Docker commands fail.

### Services Won't Start
\`\`\`powershell
docker-compose logs
docker-compose logs server
docker-compose logs keycloak
\`\`\`

## Further Help
See ``OFFLINE-WINDOWS-README.md`` for comprehensive deployment documentation.
"@

$ReadmeContent | Out-File -FilePath (Join-Path $BundleDir "README.md") -Encoding UTF8
Write-LogInfo "✓ Created README.md"

# ============================================================================
# Step 9: Compress Bundle with tar
# ============================================================================

Write-LogHeader "Compressing Bundle"

Write-LogInfo "Compressing with tar (this may take a minute)..."

try {
    # Use native Windows tar command (PowerShell will handle paths)
    & tar -czf $BundleName $BundleDir
    Write-LogInfo "✓ Bundle created: $BundleName"
} catch {
    Write-LogError "Failed to create compressed bundle"
    Write-LogError $_.Exception.Message
    exit 1
}

# Get final size
$BundleSize = (Get-Item $BundleName).Length
$BundleSizeGB = [math]::Round($BundleSize / 1GB, 2)
$BundleSizeMB = [math]::Round($BundleSize / 1MB, 1)

if ($BundleSizeGB -ge 1) {
    Write-LogInfo "Bundle size: $BundleSizeGB GB"
} else {
    Write-LogInfo "Bundle size: $BundleSizeMB MB"
}

Write-LogInfo ""

# ============================================================================
# Step 10: Summary & Next Steps
# ============================================================================

Write-LogHeader "Packaging Complete!"

Write-Host ""
Write-Host "Output Bundle: $BundleName" -ForegroundColor $ColorInfo
Write-Host "Temporary Directory: $BundleDir (kept for inspection)" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor $ColorInfo
Write-Host "1. Transfer '$BundleName' to the offline Windows machine" -ForegroundColor $ColorInfo
Write-Host "2. Extract: tar -xzf $BundleName" -ForegroundColor $ColorInfo
Write-Host "3. Run: cd $(Split-Path $BundleDir -Leaf) ; .\deploy-offline.ps1" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "For detailed instructions, see OFFLINE-WINDOWS-README.md" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "✓ Done!" -ForegroundColor $ColorInfo
