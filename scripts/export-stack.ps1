#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Export the Demands dev Docker stack to a portable tar.gz archive for cross-machine deployment.

.DESCRIPTION
    Builds server/client images, pulls external images (postgres, keycloak), extracts the compose
    configuration, bundles all images + optionally postgres_data volume into a single compressed
    tarball suitable for import on macOS (via Rosetta emulation) or another Windows machine.

.PARAMETER OutputPath
    Path where demands-stack-export.tar.gz will be written. Defaults to current directory.

.PARAMETER IncludeVolumes
    If $true (default), includes postgres_data volume state in the export. Set to $false to skip.

.PARAMETER KeepStaging
    If $true, retains the temporary staging directory after export for inspection. Default: $false.

.EXAMPLE
    .\export-stack.ps1
    # Exports to ./demands-stack-export.tar.gz with postgres_data volume

.EXAMPLE
    .\export-stack.ps1 -OutputPath "C:\exports" -IncludeVolumes $false
    # Exports to C:\exports\demands-stack-export.tar.gz without volume backup
#>

param(
    [string]$OutputPath = ".",
    [bool]$IncludeVolumes = $true,
    [bool]$KeepStaging = $false
)

$ErrorActionPreference = "Stop"

# Ensure we're in the project root (Demands folder)
if (-not (Test-Path "docker-compose.yml")) {
    Write-Error "docker-compose.yml not found in current directory. Run this script from Demands/ root."
    exit 1
}

# Force project name to ensure deterministic image/volume names
$env:COMPOSE_PROJECT_NAME = "demands"
$env:NODE_ENV = "development"

Write-Host "=== Demands Docker Stack Export ===" -ForegroundColor Cyan
Write-Host "Project: $env:COMPOSE_PROJECT_NAME"
Write-Host "Include volumes: $IncludeVolumes"
Write-Host ""

# Step 1: Build buildable images and pull external images
Write-Host "[1/5] Building server & client images..." -ForegroundColor Yellow
docker compose --profile dev build -q
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
Write-Host "  Build complete"

Write-Host "[2/5] Pulling external images (postgres, keycloak)..." -ForegroundColor Yellow
docker compose --profile dev pull --ignore-buildable -q
if ($LASTEXITCODE -ne 0) { Write-Error "Pull failed"; exit 1 }
Write-Host "  Pull complete"

# Step 2: Extract compose config and get actual image names
Write-Host "[3/5] Extracting compose configuration..." -ForegroundColor Yellow
$composeConfig = docker compose --profile dev config --format json | ConvertFrom-Json
$projectName = $composeConfig.name
$services = $composeConfig.services
$volumes = $composeConfig.volumes

Write-Host "  Project name: $projectName"

# Get all image names: both from 'image' property and built services
$imageList = @()
foreach ($service in $services.PSObject.Properties) {
    $serviceName = $service.Name
    $serviceConfig = $service.Value

    if ($null -ne $serviceConfig.image) {
        # Service with explicit image reference
        $imageList += $serviceConfig.image
        Write-Host "  Service: $serviceName -> Image: $($serviceConfig.image)"
    } elseif ($null -ne $serviceConfig.build) {
        # Service with build config - derive image name from project + service name
        # Docker Compose uses: {project}-{service}:latest as the default tag
        $builtImage = "${projectName}-${serviceName}:latest"
        $imageList += $builtImage
        Write-Host "  Service: $serviceName -> Built Image: $builtImage"
    }
}

if ($imageList.Count -eq 0) {
    Write-Error "No images found in compose config"
    exit 1
}

# Step 3: Create staging directory
$stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) "demands-export-$(Get-Random)"
$imagesDir = Join-Path $stagingDir "images"
$volumesDir = Join-Path $stagingDir "volumes"
$dockerDir = Join-Path $stagingDir "docker"

New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null
New-Item -ItemType Directory -Force -Path $volumesDir | Out-Null
New-Item -ItemType Directory -Force -Path $dockerDir | Out-Null

Write-Host "  Staging directory: $stagingDir"

# Step 4: Save all images to a single tarball
Write-Host "[4/5] Saving Docker images to tar..." -ForegroundColor Yellow
$imagesTar = Join-Path $imagesDir "demands-images.tar"
$imagesArchive = "$imagesTar.gz"

# Save all images in one docker save call (auto-deduplicates shared layers)
Write-Host "  Saving images: $($imageList -join ', ')"
docker save -o $imagesTar $imageList
if ($LASTEXITCODE -ne 0) { Write-Error "docker save failed"; exit 1 }

# Compress the tar
Write-Host "  Compressing images tar..." -ForegroundColor Yellow
tar -czf $imagesArchive -C (Split-Path $imagesTar) (Split-Path $imagesTar -Leaf) 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "tar compression failed"; exit 1 }

Remove-Item $imagesTar -Force
$archSize = ([System.IO.FileInfo]$imagesArchive).Length / 1MB
Write-Host "  Compressed: $($archSize.ToString('F2')) MB"

# Step 5: Export postgres_data volume (optional)
if ($IncludeVolumes) {
    Write-Host "  Exporting postgres_data volume..." -ForegroundColor Yellow
    $volumeName = "${projectName}_postgres_data"

    # Check if volume exists
    $volumeExists = docker volume ls --filter "name=$volumeName" --format "{{.Name}}" | Select-String $volumeName

    if ($volumeExists) {
        # Ensure alpine image is available (pre-pull quietly)
        docker pull alpine -q 2>&1 | Out-Null

        $volumeTarGz = Join-Path $volumesDir "postgres_data.tar.gz"
        docker run --rm `
            -v "${volumeName}:/data:ro" `
            -v "$volumesDir`:/backup" `
            alpine `
            sh -c "tar czf /backup/postgres_data.tar.gz -C /data ." -ErrorAction SilentlyContinue 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0 -and (Test-Path $volumeTarGz)) {
            $volSize = ([System.IO.FileInfo]$volumeTarGz).Length / 1MB
            Write-Host "    Volume backed up: $($volSize.ToString('F2')) MB"
        } else {
            Write-Host "    Warning: Volume backup failed, proceeding without it" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    Volume $volumeName not found, skipping..." -ForegroundColor Yellow
    }
}

# Step 6: Copy supporting files to staging
Write-Host "[5/5] Bundling supporting files..." -ForegroundColor Yellow

# Copy docker-compose.yml
Copy-Item "docker-compose.yml" $stagingDir
Write-Host "  Copied: docker-compose.yml"

# Copy docker/ directory (keycloak realm, postgres init script)
if (Test-Path "docker") {
    Copy-Item "docker" -Destination $dockerDir -Recurse -Force
    Write-Host "  Copied: docker/"
}

# Copy .env.example files
foreach ($dir in @("server", "client")) {
    if (Test-Path "$dir\.env.example") {
        Copy-Item "$dir\.env.example" (Join-Path $stagingDir $dir) -Force
        Write-Host "  Copied: $dir/.env.example"
    }
}

# Copy import script
Copy-Item "$(Split-Path $MyInvocation.MyCommand.Path)/import-stack.sh" $stagingDir
Write-Host "  Copied: import-stack.sh"

# Create import instructions
$importInstructions = @"
=== Demands Stack Import (macOS) ===

1. Ensure Docker Desktop is running and Rosetta emulation is enabled:
   Settings → General → Use Rosetta for x86/amd64 emulation on Apple Silicon

2. Extract this archive:
   tar xzf demands-stack-export.tar.gz
   cd demands-stack-export

3. Run the import script:
   bash import-stack.sh

4. Create .env files from .env.example:
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   (Edit the .env files with your actual secrets if needed)

5. Start the stack:
   NODE_ENV=development docker compose --profile dev up

Access:
  - Client: http://localhost:5173
  - Server: http://localhost:3000
  - Keycloak: http://localhost:8080

For issues, see import-stack.sh output above for diagnostic details.
"@
Set-Content -Path (Join-Path $stagingDir "IMPORT-INSTRUCTIONS.txt") -Value $importInstructions
Write-Host "  Created: IMPORT-INSTRUCTIONS.txt"

# Step 7: Create the final compressed archive
Write-Host ""
Write-Host "Creating final archive..." -ForegroundColor Yellow
$outputDir = Resolve-Path $OutputPath
$outputFile = Join-Path $outputDir "demands-stack-export.tar.gz"

# Remove old archive if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

tar -czf $outputFile -C $stagingDir . 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "Final tar.gz creation failed"; exit 1 }

# Cleanup staging directory unless -KeepStaging is true
if (-not $KeepStaging) {
    Remove-Item $stagingDir -Recurse -Force
} else {
    Write-Host "Staging directory retained: $stagingDir" -ForegroundColor Cyan
}

$outputSize = ([System.IO.FileInfo]$outputFile).Length / 1MB
Write-Host ""
Write-Host "Export complete!" -ForegroundColor Green
Write-Host "  Archive: $outputFile"
Write-Host "  Size: $($outputSize.ToString('F2')) MB"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Transfer demands-stack-export.tar.gz to target Mac"
Write-Host "  2. Extract and run: bash import-stack.sh"
Write-Host "  3. See IMPORT-INSTRUCTIONS.txt for complete setup"
