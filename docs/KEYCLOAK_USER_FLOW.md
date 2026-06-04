# Keycloak → Backend → DB User Identity Flow

## Overview
User identity flows through three systems: Keycloak (OIDC), Backend (Express + JWT), and Database (Prisma User records). This document explains how role/center assignment works.

## User Identity Sources

### 1. Keycloak (Realm: `demands`)
- **Source of truth for authentication** (login credentials, 2FA, etc.)
- Contains user groups: `admin`, `moderator`, `user`
- Issues JWT tokens with `groups` claim (e.g., `"groups": ["admin"]`)

**Test users in realm:**
| Username | Password | Keycloak Group |
|----------|----------|---|
| admin1 | admin123 | admin |
| admin2 | admin123 | admin |
| mod1 | mod123 | moderator |
| user1 | user123 | user |
| user2 | user123 | user |
| user3 | user123 | user |

### 2. Backend (Express Middleware: `requireAuth`)
- **Middleware location:** `server/src/middleware/authorization.ts`
- **Function:** Upserts a `User` record in the DB on every login
- **Token validation:** Verifies JWT via JWKS at Keycloak's discovery endpoint

**Flow:**
1. Frontend sends Authorization header with JWT token
2. `authenticate()` middleware verifies token signature & issuer
3. `requireAuth()` middleware:
   - Extracts `username`, `fullName`, `oidcRoles` (groups) from token
   - Queries DB for existing User record
   - If not found: creates User with default role `REGULAR_USER`
   - If found: upserts to keep `fullName` in sync
   - **Replaces token user with DB-backed User object** (role & centerName from DB, not Keycloak)
   - Attaches to `req.auth.user`

### 3. Database (Prisma User Model)
- **Source of truth for roles & center assignment**
- Schema: `User { username, fullName, role, centerName }`
- Roles: `ADMIN`, `MODERATOR`, `CENTER_MANAGER`, `REGULAR_USER`

**Key insight:** DB role **overrides** Keycloak group. A user in Keycloak's `user` group can be promoted to `CENTER_MANAGER` in the DB, and the backend will respect the DB role.

## Role Assignment Examples

### Example 1: Regular User (user1)
- Keycloak: group = `user`, password = `user123`
- DB: role = `REGULAR_USER`, centerName = `IT Center`
- Backend behavior: Can only see own demands; cannot approve; no admin access

### Example 2: Center Manager (user2)
- Keycloak: group = `user`, password = `user123` (same as user1)
- DB: role = `CENTER_MANAGER`, centerName = `IT Center`
- Backend behavior: Can approve demands for IT Center; can see PendingCenterManager queue
- Note: DB role is different from Keycloak group — this is intentional and supported

### Example 3: Admin (admin1)
- Keycloak: group = `admin`, password = `admin123`
- DB: role = `ADMIN`, centerName = null
- Backend behavior: Can see all demands; can manage users, centers, services

## Endpoint Authorization Examples

### GET /demands (My Requests tab)
- **User1:** Returns demands where `createdBy = 'user1'` (all statuses)
- **User2:** Returns demands where `createdBy = 'user2'` (all statuses, same as user1)
- **Admin1:** Returns all demands (no `createdBy` filter)

### GET /demands/center/pending (CM Approval Queue)
- **User1:** 403 Forbidden (not a CENTER_MANAGER)
- **User2:** Returns demands where `centerName = 'IT Center'` + `status = 'PendingCenterManager'`
- **Admin1:** Returns all demands with status = `PendingCenterManager`

### GET /demands/filter?managed=true (Moderator Approval Queue)
- **Mod1:** Returns demands where `serviceName IN [Openshift, VM, RUNAI, LLM]` + `status = 'Pending'`
- **User1:** 403 Forbidden (not a MODERATOR)
- **Admin1:** Returns all `Pending` demands (no service filter)

## Future Extensibility

To assign a new role or change a user's center:
1. Update the User record in the DB (via Admin UI or direct SQL)
2. No Keycloak changes needed
3. User's next login will reflect the new role immediately

Example:
```sql
UPDATE "User" SET role = 'CENTER_MANAGER', centerName = 'Operations Center' WHERE username = 'user3';
```

## Test Verification

Use these test scenarios to verify the flow:

**Scenario A: PendingCenterManager queue**
1. Log in as user1 → "Requests I Opened" shows E2E - Awaiting CM Approval (3 VM demands)
2. Log in as user2 → "My Approval Requests" shows E2E - Awaiting CM Approval (3 VM demands)
3. Log in as mod1 → "My Approval Requests" does NOT show Scenario A (status is PendingCenterManager, not Pending)

**Scenario B: Pending moderator queue**
1. Log in as user1 → "Requests I Opened" shows E2E - Pending Moderator Review (3 Openshift demands)
2. Log in as user2 → "My Approval Requests" does NOT show Scenario B (status is Pending, not PendingCenterManager)
3. Log in as mod1 → "My Approval Requests" shows E2E - Pending Moderator Review (3 Openshift demands, mod1 manages Openshift)

**Scenario C: History/resolved**
1. Log in as user1 → "Request History" shows E2E - Resolved History (3 terminal-status demands)
2. Log in as user2 → Cannot see Scenario C (not the creator)
3. Log in as admin1 → Can see all demands including Scenario C (admin sees all)
