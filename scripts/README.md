# Demands Docker Stack Export/Import Scripts

Two-script solution for portable Docker stack deployment from Windows dev machine to Apple Silicon Mac (or any cross-platform target) without rebuilding from source.

## Quick Start

### Export (Windows Dev Machine)

```powershell
cd Demands
./scripts/export-stack.ps1
```

**Output:** `demands-stack-export.tar.gz` (~150–400 MB)

**Options:**
```powershell
# Exclude database volume to reduce size (start with clean DB on target)
./scripts/export-stack.ps1 -IncludeVolumes $false

# Keep staging directory for inspection/debugging
./scripts/export-stack.ps1 -KeepStaging $true

# Specify custom output directory
./scripts/export-stack.ps1 -OutputPath "C:\exports"
```

### Import (macOS/Linux Target)

```bash
tar xzf demands-stack-export.tar.gz
cd demands-stack-export
bash import-stack.sh
```

**Apple Silicon (M1/M2/M3/M4) Requirement:**  
Enable Rosetta emulation in Docker Desktop:  
Settings → General → "Use Rosetta for x86/amd64 emulation on Apple Silicon"

The import script will verify this before proceeding.

### Start the Stack

```bash
NODE_ENV=development docker compose --profile dev up
```

Access:
- **Client:** http://localhost:5173 (Vite)
- **Server:** http://localhost:3000 (Express)
- **Keycloak:** http://localhost:8080 (admin/admin)

## What Gets Exported

| Item | Included | Notes |
|------|----------|-------|
| Docker Images | ✅ | All 4: `server`, `client`, `postgres:16-alpine`, `keycloak:26.0` |
| postgres_data Volume | ✅* | Optional; restores DB + Keycloak realm state |
| Compose Config | ✅ | `docker-compose.yml` (from export time) |
| Keycloak Realm | ✅ | `docker/keycloak/demands-realm.json` (bind-mounted) |
| Postgres Init | ✅ | `docker/postgres/init-multiple-dbs.sh` (bind-mounted) |
| .env Templates | ✅ | `server/.env.example`, `client/.env.example` |
| .env Secrets | ❌ | Not included; create locally from templates |
| Source Code | ❌ | Not included; images contain compiled/built artifacts |

\* Volume export optional via `-IncludeVolumes $false`

## Architecture

**Cross-Platform Strategy:** Rosetta/QEMU emulation
- Images built as amd64-only on Windows (no buildx setup needed)
- macOS Docker Desktop emulates x86_64 → arm64 via Rosetta
- Simple export, single-arch tarball, acceptable dev performance

**Alternative:** True multi-arch buildx (not used here)
- Would require `buildx` + QEMU on Windows
- 2x image size (amd64 + arm64 variants)
- Longer export time
- Slightly better Mac runtime performance

## Troubleshooting

### `exec format error` on macOS
**Cause:** Rosetta emulation not enabled  
**Fix:** Docker Desktop → Settings → General → enable "Use Rosetta for x86/amd64 emulation", restart Docker, retry

### Keycloak realm not imported
**Cause:** Stale realm cache in Keycloak container  
**Fix:** The entrypoint script (in `docker-compose.yml`) removes `demands-realm-imported` flag before each startup, forcing reimport. If stuck, delete Keycloak container: `docker rm demands-keycloak`

### Database migration errors on import
**Cause:** Mismatched Prisma schemas between export and target  
**Fix:** Ensure both machines are on same `dev` branch with latest migrations. The server container auto-runs `prisma migrate deploy` on startup.

### Volume restore fails silently
**Status:** Non-fatal. Script warns and continues.  
**Remedy:** Start fresh with `docker compose up` (creates empty database). Alternatively, manually copy volume on target if needed.

## Files

- `export-stack.ps1` — PowerShell export script (8.2 KB)
- `import-stack.sh` — Bash import script (4.7 KB)
- `README.md` — This file

## Environment Variables

Both scripts use these env vars (set automatically):
- `COMPOSE_PROJECT_NAME=demands` — Ensures deterministic image/volume naming
- `NODE_ENV=development` — For server configuration

## Security

- **No secrets in bundle:** Real `.env` files with `KEYCLOAK_CLIENT_SECRET`, DB passwords, etc. are **not** included
- Recipients must create `.env` files from provided `.env.example` templates
- Transfer real secrets via separate secure channel (1Password, secure email, etc.) if needed

## Further Reading

See `WORK_LOG.md` for full task context and verification checklist.
