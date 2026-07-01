# Demands Deployment Guide

This guide provides step-by-step instructions for deploying the Demands application to a production environment using Docker and Docker Compose.

---

## 0. Prerequisites

Before deploying, ensure the following are installed on the host machine:

- **Docker** — version 20.10+  
  Install from: https://docs.docker.com/engine/install/
- **Docker Compose** — version 2.0+ (installed with Docker Desktop, or standalone)  
  Verify: `docker compose --version`
- **Git** — for cloning the repository
- **PostgreSQL client (optional)** — for manual database inspection  
  Install: `apt-get install postgresql-client` (Linux) or `brew install postgresql` (macOS)

---

## 1. Environment Setup

### 1.1 Clone the Repository

```bash
git clone <repository-url>
cd Demands
```

### 1.2 Copy Environment Template and Fill In Values

```bash
cp .env.example .env
# Edit .env with your actual production values
nano .env  # or your preferred editor
```

### 1.3 Critical Environment Variables for Production

Before starting containers, ensure these are set correctly:

#### Database Credentials
- `POSTGRES_USER` — PostgreSQL superuser (e.g., `postgres`)
- `POSTGRES_PASSWORD` — **Must be a strong, unique password** (not `password`)
- `DATABASE_URL` — Connection string pointing to the correct host and database

#### Keycloak Configuration
- `KC_HOSTNAME` — Must match the external hostname (e.g., `demands.your-domain.com`)  
  ⚠️ **Critical:** If this doesn't match your actual external URL, JWT token validation will fail.
- `KEYCLOAK_URL` — Must be accessible from the container (inside Docker: `http://keycloak:8080`)
- `KEYCLOAK_CLIENT_SECRET` — **Must be changed** from the default dev value
- `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD` — **Must be changed**

#### Frontend & Backend Connectivity
- `VITE_API_URL` — External API endpoint (e.g., `https://demands.your-domain.com:3000`)
- `VITE_OIDC_AUTHORITY` — External Keycloak realm URL (e.g., `https://demands.your-domain.com:8080/realms/demands`)
- `VITE_OIDC_REDIRECT_URI` — Must match exactly in Keycloak client config
- `AUTH_ISSUER` — JWT issuer validation (must match Keycloak's configured issuer)

**⚠️ Warning:** Mismatched hostnames between `KC_HOSTNAME`, `AUTH_ISSUER`, and client-side OIDC configs are the most common cause of authentication failures.

---

## 2. Keycloak Configuration

### 2.1 Realm Import

The realm configuration is defined in `docker/keycloak/demands-realm.json`. This file is auto-imported when Keycloak starts via the `--import-realm` flag in `docker-compose.yml`.

The realm includes:
- **Realm name:** `demands`
- **Two OIDC clients:**
  - `demands-api` (confidential/backend service account)
  - `demands-web` (public/frontend)
- **Default groups:** `admin`, `moderator`, `user`

### 2.2 Update Redirect URIs for Production

The realm export (`docker/keycloak/demands-realm.json`) currently contains localhost redirect URIs. If your production domain differs from `localhost`, you must update the redirect URIs in the realm JSON before deploying:

```json
"clients": [
  {
    "clientId": "demands-api",
    "redirectUris": [
      "https://demands.your-domain.com:3000/*",
      "https://demands.your-domain.com:5173/*"
    ],
    "webOrigins": [
      "https://demands.your-domain.com:3000",
      "https://demands.your-domain.com:5173"
    ]
  },
  {
    "clientId": "demands-web",
    "redirectUris": [
      "https://demands.your-domain.com/*"
    ],
    "webOrigins": [
      "https://demands.your-domain.com"
    ]
  }
]
```

Then commit the updated realm file:

```bash
git add docker/keycloak/demands-realm.json
git commit -m "Update Keycloak redirect URIs for production domain"
```

### 2.3 Keycloak Admin Console Access

After the stack starts, the Keycloak admin console is available at:

```
http://<your-keycloak-host>:8080/admin
```

Log in with the credentials set in `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD`.

From here you can:
- Manage users and groups
- Update client configurations
- Change realm settings
- Regenerate client secrets

---

## 3. Building and Starting the Stack

### 3.1 Build and Start Containers (Detached Mode)

```bash
docker compose up --build -d
```

This command:
- Builds Docker images for `server` and `client` services
- Starts all services (server, client, postgres, keycloak) as background containers
- Uses the `dev` profile for dev services (client, postgres, keycloak)
- Mounts volumes for development-mode database persistence

### 3.2 Verify Containers Are Running

```bash
docker compose ps
```

Expected output:
```
NAME        IMAGE                              STATUS
demands-keycloak-1    quay.io/keycloak/keycloak:26.0   Up (health: starting)
demands-postgres-1    postgres:latest                  Up (healthy)
demands-server-1      demands-server:latest            Up
demands-client-1      demands-client:latest            Up
```

### 3.3 Monitor Container Logs

```bash
# View all service logs
docker compose logs -f

# View specific service logs
docker compose logs -f server
docker compose logs -f keycloak
docker compose logs -f postgres
```

Monitor the server logs for any startup errors, especially JWT discovery failures or database connection issues.

---

## 4. Database Initialization

### 4.1 Run Prisma Migrations

This applies all pending database schema migrations:

```bash
docker compose exec server npx prisma migrate deploy
```

Expected output:
```
2 migrations found in prisma/migrations

Running migration `20240101000001_initial`
Running migration `20240102000002_add_user_roles`
```

### 4.2 Seed Initial Data (Optional)

⚠️ **Note:** In `production` mode (`NODE_ENV=production`), automatic seeding is disabled. You must run the seed command manually if you want to populate initial test data.

To seed the database with sample data (centers, branches, services, etc.):

```bash
docker compose exec server npx prisma db seed
```

This seeds:
- 5 Centers, 5 Branches, 5 Sections (organizational hierarchy)
- 18 Services (HDFS, NAS, S3, Postgres, Keycloak, etc.) with moderator assignments
- ~40 Resources and 5 Capacity/Wallet records
- 15 Sample Projects with 50 Demands in various states

**For production environments**, you may want to skip the seed and instead:
- Manage data via the web UI after deployment
- Use `npx prisma db push` for schema-only updates
- Create a custom seed script specific to your organization

---

## 5. First Admin Bootstrap

After the initial Keycloak import and first user login, the user account must be promoted to `ADMIN` role in the database. This cannot be done via the UI; it requires direct SQL.

### 5.1 Connect to the Database

```bash
docker compose exec postgres psql -U postgres -d demands
```

Or, from your local machine (if PostgreSQL client is installed):

```bash
psql -h localhost -U postgres -d demands
```

### 5.2 Promote First Admin

Replace `username` with the actual username of your first admin user (as it appears in Keycloak):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = 'your-username-here';
```

Verify the update:

```sql
SELECT username, role FROM "User" WHERE username = 'your-username-here';
```

Expected output:
```
  username   | role
 your-username | ADMIN
```

Then exit psql:

```sql
\q
```

---

## 6. Health Checks

Verify that all components are working correctly before declaring the deployment successful.

### 6.1 API Health Check

Test the backend API health endpoint:

```bash
curl http://localhost:3000/auth/health
```

Expected response (HTTP 200):

```json
{
  "status": "ok",
  "oidc": {
    "discoveryUrl": "http://keycloak:8080/realms/demands/.well-known/openid-configuration",
    "issuer": "http://localhost:8080/realms/demands"
  },
  "database": {
    "connected": true
  }
}
```

### 6.2 Database Connectivity

Verify the server can connect to and query the database:

```bash
docker compose exec server npx prisma db execute --stdin < <(echo "SELECT 1;")
```

Or manually:

```bash
docker compose exec postgres psql -U postgres -d demands -c "SELECT COUNT(*) FROM \"User\";"
```

### 6.3 Keycloak Admin Console

Access the Keycloak admin console to verify the realm and initial users are present:

```
http://localhost:8080/admin
```

Log in with the `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD` credentials.

Navigate to:
- **Realm settings** → Verify realm name is `demands`
- **Users** → Verify test users (admin, moderator, etc.) are present
- **Clients** → Verify `demands-api` and `demands-web` clients exist
- **Clients** → `demands-api` → **Credentials** → Verify the client secret

### 6.4 Frontend Application

Open the frontend in a browser:

```
http://localhost:5173
```

Verify:
- The login button appears
- Clicking "Login" redirects to the Keycloak login page
- Logging in with a test user (e.g., `user1:user123`) redirects back to the app
- The user's dashboard displays with "My Approval Requests" or "Requests I Opened" tabs

### 6.5 OIDC Token Validation

Test the token flow manually (optional):

```bash
# Request an access token from Keycloak
curl -X POST http://localhost:8080/realms/demands/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=demands-api" \
  -d "client_secret=demands-api-secret" \
  -d "grant_type=client_credentials"
```

This returns a JWT. Decode it (e.g., at https://jwt.io) to verify:
- `iss` (issuer) matches `AUTH_ISSUER` from your `.env`
- `aud` (audience) includes `demands-api`
- `groups` claim contains group memberships

---

## 7. Known Issues and Troubleshooting

### 7.1 JWT Token Validation Fails

**Symptom:** API returns 401 Unauthorized; server logs show "Issuer mismatch" or "JWKS fetch failed"

**Root causes:**
- `AUTH_ISSUER` in `.env` does not match the `iss` claim in the JWT
- `OIDC_DISCOVERY_URL` is unreachable or returns 404
- `KC_HOSTNAME` in Keycloak does not match the external hostname

**Fix:**
1. Verify `KC_HOSTNAME` matches your external domain
2. Confirm `AUTH_ISSUER` is set to the external Keycloak realm URL
3. Check that `OIDC_DISCOVERY_URL` points to a resolvable URL
4. Restart Keycloak: `docker compose restart keycloak`
5. Check logs: `docker compose logs keycloak`

### 7.2 Client Cannot Reach Backend API

**Symptom:** Frontend console shows CORS error or "Failed to fetch from API"

**Root causes:**
- `VITE_API_URL` is incorrect or unreachable
- API server is not listening or has crashed
- Firewall is blocking the port

**Fix:**
1. Verify `VITE_API_URL` in `.env` is correct and accessible
2. Check that the server is running: `docker compose ps server`
3. View server logs: `docker compose logs server`
4. Test API directly: `curl http://localhost:3000/auth/health`

### 7.3 Database Migrations Fail

**Symptom:** `docker compose exec server npx prisma migrate deploy` fails with "migration not found" or "connection refused"

**Root causes:**
- PostgreSQL is not running or not initialized
- `DATABASE_URL` is incorrect
- Prisma migrations directory is missing or corrupted

**Fix:**
1. Verify postgres container is healthy: `docker compose ps postgres`
2. Check database exists: `docker compose exec postgres psql -U postgres -l`
3. View migration history: `docker compose exec server npx prisma migrate status`
4. Restart postgres and retry: `docker compose restart postgres && docker compose exec server npx prisma migrate deploy`

### 7.4 Keycloak Admin Console Inaccessible

**Symptom:** Keycloak admin console returns 404 or blank page

**Root causes:**
- Keycloak container is still starting (wait a few seconds)
- Port 8080 is blocked or not exposed
- `KC_HOSTNAME_STRICT` is enabled (should be `false` in dev)

**Fix:**
1. Wait 10-15 seconds and retry (Keycloak startup is slow)
2. Check container health: `docker compose ps keycloak`
3. View logs: `docker compose logs keycloak | tail -50`
4. Verify port is exposed: `docker compose ps keycloak | grep 8080`

---

## 8. Production Client Build (Optional)

**⚠️ Current Limitation:** The client `Dockerfile` currently runs the Vite dev server (`npm run dev --host`), which is not suitable for production. For a production deployment, consider replacing it with a multi-stage build using nginx:

```dockerfile
# client/Dockerfile.prod (sample multi-stage build)
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

With an accompanying `nginx.conf`:

```nginx
server {
  listen 80;
  server_name _;
  
  root /usr/share/nginx/html;
  index index.html;
  
  location / {
    try_files $uri /index.html;
  }
}
```

Build with:

```bash
docker build -f client/Dockerfile.prod -t demands-client:prod .
```

Then update `docker-compose.yml` to use `demands-client:prod` instead of the dev image.

---

## 9. Deployment Checklist

Before going live, verify:

- [ ] `.env` is filled with production values (not dev defaults)
- [ ] `KC_HOSTNAME` matches your external domain
- [ ] `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD` are changed from defaults
- [ ] `KEYCLOAK_CLIENT_SECRET` is changed from defaults
- [ ] `POSTGRES_PASSWORD` is a strong, unique password
- [ ] `docker/keycloak/demands-realm.json` redirect URIs are updated for production domain
- [ ] Containers start without errors: `docker compose up --build -d`
- [ ] Database migrations run successfully: `docker compose exec server npx prisma migrate deploy`
- [ ] API health check passes: `curl http://localhost:3000/auth/health`
- [ ] Keycloak admin console is accessible and configured
- [ ] Frontend can log in with a test user
- [ ] First admin user is promoted to ADMIN role
- [ ] WORK_LOG.md is updated with deployment notes

---

## 10. Rolling Back

If something goes wrong, rollback with:

```bash
# Stop all containers
docker compose down

# Restore the .env file from backup or git
git checkout .env

# Remove database volumes to reset (WARNING: data loss)
docker volume rm demands_postgres_data

# Re-deploy
docker compose up --build -d
```

To restore database from a backup:

```bash
# Dump the database before changing code
docker compose exec postgres pg_dump -U postgres demands > backup.sql

# Restore later
docker compose exec postgres psql -U postgres demands < backup.sql
```

---

## 11. Support and Troubleshooting

For additional help:

- **Server logs:** `docker compose logs -f server`
- **Keycloak logs:** `docker compose logs -f keycloak`
- **Database logs:** `docker compose logs -f postgres`
- **Client dev server:** Accessible at `http://localhost:5173` (dev only)
- **WORK_LOG.md:** Contains deployment history and known issues from past deployments

---

**Last Updated:** 2026-07-01  
**Demands Version:** 1.0 (CM Sprint)
