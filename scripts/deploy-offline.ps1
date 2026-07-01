#Requires -Version 5.1
<#
.SYNOPSIS
    Offline Deployment Script for Windows
    Runs on the OFFLINE/AIR-GAPPED Windows machine to load images and start services

.DESCRIPTION
    This script loads Docker images from a tarball, validates environment configuration,
    and starts the Demands system using docker-compose.

.EXAMPLE
    .\deploy-offline.ps1

.NOTES
    Requires: PowerShell 5.1+, Docker Desktop/Engine, Docker Compose
    If execution policy blocks the script:
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

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

# Check Docker
try {
    $DockerVersion = docker --version
    Write-LogInfo "Docker found: $DockerVersion"
} catch {
    Write-LogError "Docker is not installed or not in PATH"
    Write-Host "Please install Docker Desktop for Windows"
    exit 1
}

# Check Docker daemon
try {
    $null = docker info
    Write-LogInfo "✓ Docker daemon is running"
} catch {
    Write-LogError "Docker daemon is not running or not accessible"
    Write-Host "Please start Docker Desktop and try again"
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

# ============================================================================
# Step 2: Verify Required Files
# ============================================================================

Write-LogHeader "Verifying Bundle Files"

$RequiredFiles = @("images.tar", "docker-compose.yml", ".env")
$MissingFiles = @()

foreach ($File in $RequiredFiles) {
    if (Test-Path $File) {
        Write-LogInfo "✓ Found $File"
    } else {
        $MissingFiles += $File
    }
}

if ($MissingFiles.Count -gt 0) {
    Write-LogError "Missing required files:"
    $MissingFiles | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    Write-Host "Setup Instructions:" -ForegroundColor $ColorWarn
    Write-Host "1. Extract the bundle: tar -xzf offline-deployment-*.tar.gz"
    Write-Host "2. Copy .env.example to .env: Copy-Item .env.example .env"
    Write-Host "3. Edit .env with your configuration"
    Write-Host "4. Run this script again"
    exit 1
}

# ============================================================================
# Step 3: Validate .env Configuration
# ============================================================================

Write-LogHeader "Validating Environment Configuration"

# Read .env file
$EnvContent = Get-Content ".env" | Where-Object { $_ -match '^\s*[^#]' }

$CriticalVars = @("POSTGRES_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "DATABASE_URL")
$UnconfiguredVars = @()

foreach ($Var in $CriticalVars) {
    $VarLine = $EnvContent | Where-Object { $_ -match "^$Var=" }
    if (-not $VarLine -or $VarLine -match "(password|admin)$") {
        $UnconfiguredVars += $Var
    }
}

if ($UnconfiguredVars.Count -gt 0) {
    Write-LogWarn "Please configure the following variables in .env:"
    $UnconfiguredVars | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    $Response = Read-Host "Continue anyway? (y/N)"
    if ($Response -ne "y" -and $Response -ne "Y") {
        Write-LogError "Aborted by user"
        exit 1
    }
}

Write-LogInfo "✓ Environment configuration looks good"

# ============================================================================
# Step 4: Load Docker Images
# ============================================================================

Write-LogHeader "Loading Docker Images"

if (-not (Test-Path "images.tar")) {
    Write-LogError "images.tar not found"
    exit 1
}

Write-LogInfo "This may take several minutes depending on disk speed..."
Write-LogInfo "Loading images..."

try {
    docker load -i images.tar
    Write-LogInfo "✓ Docker images loaded successfully"
} catch {
    Write-LogError "Failed to load Docker images"
    Write-LogError $_.Exception.Message
    exit 1
}

# ============================================================================
# Step 5: Verify Images Loaded
# ============================================================================

Write-LogHeader "Verifying Loaded Images"

$ExpectedImages = @(
    "postgres:16-alpine",
    "quay.io/keycloak/keycloak:26.0"
)

foreach ($Image in $ExpectedImages) {
    try {
        $null = docker image inspect $Image
        Write-LogInfo "✓ Found $Image"
    } catch {
        Write-LogWarn "Image $Image not found in local registry"
    }
}

# Check for custom images
try {
    $CustomImages = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -match "(server|client)" }
    if ($CustomImages) {
        $CustomImages | ForEach-Object {
            Write-LogInfo "✓ Found custom image: $_"
        }
    }
} catch {
    Write-LogWarn "Could not verify custom images"
}

# ============================================================================
# Step 6: Start Services
# ============================================================================

Write-LogHeader "Starting Services"

Write-LogInfo "Running: docker-compose up -d"

try {
    docker-compose up -d
    Write-LogInfo "✓ Services started"
} catch {
    Write-LogError "Failed to start services"
    Write-LogError "Check docker-compose logs for details:"
    docker-compose logs
    exit 1
}

# ============================================================================
# Step 7: Wait for Services to Be Ready
# ============================================================================

Write-LogHeader "Waiting for Services to Become Ready"

Write-LogInfo "Waiting for services to stabilize (up to 60 seconds)..."

$MaxAttempts = 60
$Attempt = 0
$ServiceReady = $false

while ($Attempt -lt $MaxAttempts) {
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/health" -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            Write-LogInfo "✓ API server is healthy"
            $ServiceReady = $true
            break
        }
    } catch {
        # Service not ready yet
    }

    $Attempt++
    if ($Attempt % 10 -eq 0) {
        Write-LogInfo "Waiting... ($Attempt/${MaxAttempts}s)"
    }
    Start-Sleep -Seconds 1
}

if (-not $ServiceReady) {
    Write-LogWarn "Services did not report healthy within timeout"
    Write-LogWarn "Check logs: docker-compose logs"
} else {
    Write-LogInfo "All services ready"
}

# ============================================================================
# Step 8: Display Summary
# ============================================================================

Write-LogHeader "Deployment Complete!"

Write-Host ""
Write-Host "Service Endpoints:" -ForegroundColor $ColorInfo
Write-Host "  API Server:  http://localhost:3000" -ForegroundColor $ColorInfo
Write-Host "  Keycloak:    http://localhost:8080" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor $ColorInfo
Write-Host "  View logs:              docker-compose logs -f" -ForegroundColor $ColorInfo
Write-Host "  View specific logs:     docker-compose logs -f server" -ForegroundColor $ColorInfo
Write-Host "  Stop services:          docker-compose down" -ForegroundColor $ColorInfo
Write-Host "  Stop and remove data:   docker-compose down -v" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Health Check:" -ForegroundColor $ColorInfo
Write-Host "  curl http://localhost:3000/health" -ForegroundColor $ColorInfo
Write-Host "  or: Invoke-WebRequest http://localhost:3000/health" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor $ColorInfo
Write-Host "  1. Configure your firewall and reverse proxy" -ForegroundColor $ColorInfo
Write-Host "  2. Set up monitoring and alerting" -ForegroundColor $ColorInfo
Write-Host "  3. Configure backup procedures" -ForegroundColor $ColorInfo
Write-Host "  4. See DEPLOYMENT-PROD.md for detailed guidance" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "✓ Done!" -ForegroundColor $ColorInfo
