# Production Deployment Guide — Demands Resource Management System

This guide provides step-by-step instructions for deploying the Demands application to a production environment with a clean, real-world database (no mock data, no test projects or users).

---

## 0. What "Clean Production" Means

The production database starts **completely empty** of:
- Users (except those created in Keycloak)
- Projects and Demands
- Centers, Branches, Sections (organizational hierarchy)
- Bases, Environments, Networks, Clusters, Locations (infrastructure locations)
- Wallets, Capacities, CloudResourceStatus (monitoring/finance data)

The database **is pre-populated with**:
- Services catalog (18 entries: VM, HDFS, Postgres, Kafka, etc.)
- Resources per service (40+ entries: CPU, Memory, Storage, etc.)
- ProjectKinds (App, Track)
- EmergencyOptions (Security Breach, System Failure, etc.)

**Why?** Services and Resources are app-level configuration — without them, the demand creation flow is blocked. Everything else is organization-specific data that admins configure via the UI after deployment.

---

## 1. Prerequisites

Ensure the following are installed on your production host machine:

- **Docker** — version 20.10+ or later  
  Install from: https://docs.docker.com/engine/install/
- **Docker Compose** — version 2.0+ (included with Docker Desktop; or install standalone)  
  Verify: `docker compose --version`
- **Access to** a working PostgreSQL instance OR permission to run PostgreSQL in Docker
- **Access to** a working Keycloak instance OR permission to run Keycloak in Docker

---

## 2. Pre-flight Checklist

Before beginning the deployment, prepare the following:

- [ ] **Production domain name** — e.g., `demands.your-company.com`
- [ ] **SSL certificate** — if using a reverse proxy (nginx, Traefik)
- [ ] **Keycloak realm export** (`docker/keycloak/demands-realm.json`) with production redirect URIs
- [ ] **Strong passwords ready** for:
  - PostgreSQL superuser (`POSTGRES_PASSWORD`)
  - Keycloak service-account client (`KEYCLOAK_CLIENT_SECRET`)
  - Keycloak bootstrap admin (`KEYCLOAK_ADMIN_PASSWORD`)
- [ ] **First production admin user** created in Keycloak with `admin` group assignment
- [ ] **Network access verified** — containers can reach each other; external clients can reach the API and Keycloak URLs

---

## 3. Environment Configuration

### 3.1 Copy the Environment Template

```bash
cp .env.example .env
```

### 3.2 Fill in Production Values

Edit `.env` and provide real values for **all** variables. Critical production variables:

#### Database Security
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-very-secure-postgres-password-here
DATABASE_URL=postgresql://postgres:your-very-secure-postgres-password-here@postgres:5432/demands
```
⚠️ **Use a strong, unique password** (20+ characters, mix of upper/lower/numbers/symbols). This superuser has full database access.

#### Keycloak Configuration
```
KC_HOSTNAME=demands.your-domain.com
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=demands
KEYCLOAK_CLIENT_ID=demands-api
KEYCLOAK_CLIENT_SECRET=your-very-secure-keycloak-client-secret-here
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=your-very-secure-keycloak-admin-password-here
```
⚠️ **`KC_HOSTNAME` is critical** — must match the external hostname exactly. If mismatched, all JWT tokens will fail validation.

#### JWT Validation
```
AUTH_ISSUER=https://demands.your-domain.com:8080/realms/demands
OIDC_DISCOVERY_URL=http://keycloak:8080/realms/demands/.well-known/openid-configuration
AUTH_AUDIENCE=demands-api
AUTH_ADMIN_GROUP=admin
AUTH_MODERATOR_GROUP=moderator
```

#### API & Frontend URLs
```
PORT=3000
VITE_API_URL=https://demands.your-domain.com:3000
VITE_OIDC_AUTHORITY=https://demands.your-domain.com:8080/realms/demands
VITE_OIDC_CLIENT_ID=demands-web
VITE_OIDC_REDIRECT_URI=https://demands.your-domain.com/callback
```

### 3.3 Verify `.env` is Secure

```bash
chmod 600 .env
```

Ensure the `.env` file is readable only by the application user, not world-readable.

---

## 4. Keycloak Realm Configuration

### 4.1 Update Redirect URIs in Realm Export

The Keycloak realm export is at `docker/keycloak/demands-realm.json`. This file is auto-imported on first Keycloak startup. Edit the following redirect URIs to match your production domain:

**In `demands-api` client** (confidential/backend):
```json
"redirectUris": [
  "https://demands.your-domain.com:3000/*",
  "https://demands.your-domain.com:5173/*"
],
"webOrigins": [
  "https://demands.your-domain.com:3000",
  "https://demands.your-domain.com:5173"
]
```

**In `demands-web` client** (public/frontend):
```json
"redirectUris": [
  "https://demands.your-domain.com/*"
],
"webOrigins": [
  "https://demands.your-domain.com"
]
```

Then commit the updated realm file:

```bash
git add docker/keycloak/demands-realm.json
git commit -m "chore: update Keycloak redirect URIs for production domain"
```

### 4.2 Create First Production Admin in Keycloak

Before deployment, create a user account in your production Keycloak realm and assign them to the `admin` group. The exact steps depend on whether you're using a standalone Keycloak or deploying Keycloak as a container.

**Username:** Use a real account name (e.g., `john.doe`)  
**Group:** Assign to the `admin` group  
**Password:** Generate a strong temporary password; the user will be prompted to change it on first login.

---

## 5. Build and Start the Stack

### 5.1 Build Docker Images

```bash
docker compose up -d --build
```

This command:
- Builds images for the `server` and `postgres` services
- Pulls pre-built image for `keycloak` (quay.io/keycloak/keycloak:26.0)
- Starts services in detached (background) mode
- The `client` service is skipped (not in the default profile)

### 5.2 Verify Services Are Running

```bash
docker compose ps
```

Expected output (after ~30 seconds):
```
NAME              IMAGE                                  STATUS
demands-server-1    demands-server:latest                  Up (healthy)
demands-postgres-1  postgres:16-alpine                     Up (healthy)
demands-keycloak-1  quay.io/keycloak/keycloak:26.0        Up
```

### 5.3 Monitor Startup Logs

Keycloak startup is slow (30-60 seconds). Monitor the logs:

```bash
docker compose logs -f keycloak | head -50
```

Wait for the message:
```
You're good to go!
```

Then check the server:

```bash
docker compose logs -f server | head -20
```

Look for:
```
Server running on port 3000
```

---

## 6. Database Initialization

### 6.1 Run Prisma Migrations

```bash
docker compose exec server npx prisma migrate deploy
```

Expected output:
```
Running migration `20240101000001_initial`
Running migration `20240102000002_add_user_roles`
```

If migrations fail, investigate with:

```bash
docker compose logs server
```

### 6.2 Seed Reference Data (Production)

```bash
docker compose exec server npm run seed:prod
```

Expected output:
```
Seeding production database with reference data only...
Created 2 project kinds
Created 4 emergency options
Created 18 services
Created 40+ resources
✓ Production seed complete. Ready for org configuration via the UI.
```

**What was seeded:**
- ProjectKinds, EmergencyOptions, Services, Resources
- **Nothing else** — no orgs, no users, no projects, no demands.

---

## 7. First Admin Bootstrap

### 7.1 Access Keycloak Admin Console

```
https://demands.your-domain.com:8080/admin
```

Log in with the `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD` from your `.env`.

Navigate to:
- **Realm:** demands
- **Users:** Verify the production admin user exists

### 7.2 First Admin Login

The first admin should log in to the Demands app at:

```
https://demands.your-domain.com
```

Click "Login" → authenticate with Keycloak using the production admin credentials.

**What happens:**
1. OIDC redirect to Keycloak
2. User enters credentials
3. Keycloak redirects back to Demands with an access token
4. `requireAuth` middleware auto-upserts the user as `REGULAR_USER` in the DB
5. But! The user is in Keycloak's `admin` group, so admin routes are accessible via OIDC fallback (no SQL needed yet)

### 7.3 Promote to Permanent ADMIN Role (Optional but Recommended)

To ensure the user has a persistent DB-backed `ADMIN` role (not just OIDC fallback), run the SQL promotion:

```bash
docker compose exec postgres psql -U postgres -d demands
```

Then execute:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'john.doe';
SELECT username, role FROM "User" WHERE username = 'john.doe';
```

Expected output:
```
 username  | role
-----------+------
 john.doe  | ADMIN
```

Exit psql:

```sql
\q
```

---

## 8. Post-Bootstrap Admin Configuration (UI)

The app now has the minimal reference data. The admin must configure the real organizational structure and resource assignments via the Settings panel.

### 8.1 Organizational Hierarchy

1. **Settings** → **Centers**
   - Create the Centers (divisions) relevant to your org
   - e.g., "IT Center", "Finance Center", "Operations"

2. **Settings** → **Branches**
   - For each Center, create Branches
   - e.g., under IT Center: "Development", "Infrastructure"

3. **Settings** → **Sections**
   - For each Branch, create Sections
   - e.g., under IT Center > Development: "Backend Team", "Frontend Team"

### 8.2 Infrastructure Locations

1. **Settings** → **Bases**
   - Create Bases (datacenters / cloud regions)
   - e.g., "Datacenter A", "AWS Region"

2. **Settings** → **Environments**
   - Create Environments (deployment tiers)
   - e.g., "Production", "Staging", "Development"

3. **Settings** → **Networks**
   - Create Networks (network segments)
   - e.g., "Internal", "DMZ", "Public"

4. **Settings** → **Clusters**
   - Create Clusters (compute clusters)
   - e.g., "Cluster-A", "Cluster-B"

5. **Settings** → **Locations**
   - Combine Base + Environment + Network + Cluster into Locations
   - e.g., "Datacenter A / Production / Internal / Cluster-A"

### 8.3 Service Moderators

1. **Settings** → **User Management**
   - Create Keycloak user accounts for moderators
   - In Demands, assign each moderator to the services they manage
   - e.g., "alice" manages VM, RUNAI; "bob" manages KAFKA, NIFI

---

## 9. Health Checks

Verify that all components are running and communicating correctly.

### 9.1 API Health Check

```bash
curl https://demands.your-domain.com:3000/auth/health
```

Expected response (HTTP 200):

```json
{
  "status": "ok",
  "oidc": {
    "discoveryUrl": "http://keycloak:8080/realms/demands/.well-known/openid-configuration",
    "issuer": "https://demands.your-domain.com:8080/realms/demands"
  },
  "database": {
    "connected": true
  }
}
```

### 9.2 Database Connectivity

```bash
docker compose exec server npx prisma db execute --stdin < <(echo "SELECT COUNT(*) FROM \"Service\";")
```

Expected output:
```
┌─────────┐
│ count   │
├─────────┤
│ 18      │
└─────────┘
```

### 9.3 Keycloak Realm Check

```bash
curl https://demands.your-domain.com:8080/realms/demands/.well-known/openid-configuration | jq '.issuer'
```

Expected output:
```json
"https://demands.your-domain.com:8080/realms/demands"
```

⚠️ If this doesn't match `AUTH_ISSUER` in your `.env`, JWT validation will fail.

### 9.4 Frontend Access

Open a browser to:

```
https://demands.your-domain.com
```

Expected behavior:
- Login button visible
- Click → redirects to Keycloak login
- Log in with any valid Keycloak user
- Dashboard loads and shows "Requests I Opened" (empty, since no projects yet)

---

## 10. Known Issues and Troubleshooting

### 10.1 JWT Token Validation Fails (401 Unauthorized)

**Symptoms:**
- API returns `401 Unauthorized` on authenticated requests
- Server logs show: "Issuer mismatch" or "JWKS fetch failed"

**Root causes:**
- `KC_HOSTNAME` does not match the external hostname
- `AUTH_ISSUER` does not match Keycloak's advertised issuer
- `OIDC_DISCOVERY_URL` is unreachable or returns 404

**Fix:**
1. Verify `KC_HOSTNAME` in `.env` matches your external domain
2. Verify `AUTH_ISSUER` matches the Keycloak realm URL
3. Restart Keycloak:
   ```bash
   docker compose restart keycloak
   ```
4. Check Keycloak startup logs:
   ```bash
   docker compose logs keycloak | tail -20
   ```
5. Test OIDC discovery:
   ```bash
   curl https://demands.your-domain.com:8080/realms/demands/.well-known/openid-configuration | jq .
   ```

### 10.2 API Unreachable or Crashes on Startup

**Symptoms:**
- `docker compose ps server` shows `Exited (1)`
- Frontend cannot connect to API

**Root causes:**
- PostgreSQL not running or not initialized
- `DATABASE_URL` is incorrect
- Prisma migrations failed

**Fix:**
1. Check postgres health:
   ```bash
   docker compose ps postgres
   ```
2. Check server logs:
   ```bash
   docker compose logs server | tail -50
   ```
3. Re-run migrations:
   ```bash
   docker compose exec server npx prisma migrate deploy
   ```
4. Verify `DATABASE_URL` in `.env` is correct

### 10.3 Keycloak Takes 60+ Seconds to Start or Is Unresponsive

**Symptoms:**
- Keycloak container running but `docker compose logs keycloak` is stuck
- Admin console returns 502 or timeout

**Root causes:**
- Keycloak is still initializing (it's slow)
- PostgreSQL isn't healthy yet
- Memory or disk space constraints

**Fix:**
1. Wait 60-90 seconds for first boot
2. Check Keycloak logs:
   ```bash
   docker compose logs keycloak | grep -E "Started|listening|ready"
   ```
3. Check PostgreSQL health:
   ```bash
   docker compose ps postgres
   docker compose exec postgres pg_isready
   ```
4. Restart the stack:
   ```bash
   docker compose restart
   ```

### 10.4 Users Can't Log In or Permission Denied

**Symptoms:**
- Login works, but "You do not have permission to view this page"
- User exists in Keycloak but not showing in User Management

**Root causes:**
- User not in the correct Keycloak group (admin, moderator, user)
- User hasn't logged in yet (DB upsert hasn't happened)

**Fix:**
1. Verify user is in the correct Keycloak group:
   ```
   Keycloak Admin Console → Realm (demands) → Users → [username] → Groups
   ```
2. Have user log in once to trigger DB upsert:
   ```bash
   docker compose exec postgres psql -U postgres -d demands
   SELECT username, role FROM "User" WHERE username = 'john.doe';
   ```

---

## 11. Deployment Checklist

Before declaring the deployment successful, verify:

- [ ] `.env` is filled with production values (no dev defaults)
- [ ] `KC_HOSTNAME` matches your external domain
- [ ] `KEYCLOAK_CLIENT_SECRET` is changed from default
- [ ] `KEYCLOAK_ADMIN_PASSWORD` is changed from default
- [ ] `POSTGRES_PASSWORD` is a strong, unique password
- [ ] Keycloak realm redirect URIs are updated for your domain
- [ ] `docker compose ps` shows all expected services healthy
- [ ] `docker compose exec server npx prisma migrate deploy` succeeds
- [ ] `docker compose exec server npm run seed:prod` completes with all counts > 0
- [ ] First admin user exists in Keycloak and is in `admin` group
- [ ] First admin can log in to the Demands app
- [ ] API health check (`/auth/health`) returns 200 OK
- [ ] Keycloak admin console is accessible and configured
- [ ] Frontend loads and shows login screen
- [ ] Post-bootstrap org configuration (Centers → Branches → Sections) started
- [ ] Post-bootstrap infrastructure (Bases → Environments → Locations) started

---

## 12. Rolling Back

If something goes wrong, rollback with:

```bash
# Stop all containers
docker compose down

# Restore .env from backup (if you have one)
git checkout .env

# Option A: Reset database (CAUTION: loses all data)
docker volume rm demands_postgres_data

# Option B: Restore from backup
docker volume ls | grep demands
# (restore from your backup tool)

# Re-deploy
docker compose up -d --build
```

To prevent data loss, **back up the PostgreSQL volume regularly**:

```bash
docker run --rm -v demands_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

Restore later:

```bash
docker volume rm demands_postgres_data
docker volume create demands_postgres_data
docker run --rm -v demands_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 13. Production Hardening Tips

Beyond this guide, consider:

1. **Reverse Proxy** — Place nginx or Traefik in front to handle TLS termination, domain routing, and request limits
2. **Secrets Management** — Use a secrets vault (HashiCorp Vault, AWS Secrets Manager) instead of `.env` files
3. **Monitoring** — Add Prometheus, Grafana, or Datadog to track API latency and database performance
4. **Logging** — Ship logs to a centralized ELK stack or cloud service for audit trails
5. **Backups** — Automate daily PostgreSQL backups to cloud storage
6. **Database Replication** — Use PostgreSQL streaming replication for high availability
7. **Keycloak HA** — Run multiple Keycloak instances behind a load balancer with PostgreSQL backing

---

**Last Updated:** 2026-07-01  
**Demands Version:** 1.0 (CM Sprint)  
**For support:** Check the WORK_LOG.md for deployment history and known issues.
