# System Architecture — Resource Demand Management System

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Domain Model](#domain-model)
7. [Authentication & Authorization](#authentication--authorization)
8. [Data Flow](#data-flow)
9. [API Reference](#api-reference)
10. [Configuration & Environment](#configuration--environment)
11. [Docker & Deployment](#docker--deployment)
12. [Conventions & Patterns](#conventions--patterns)

---

## Overview

The Demands System replaces an Excel-based process for requesting infrastructure resources (CPU, RAM, storage, etc.). It provides a single source of truth with a dense, table-driven UI supporting bulk actions, filtering, and an approval workflow.

**Core workflow:**

1. A **user** creates a **Project** (a group of related resource requests) and adds **Demands** (individual resource requests) to it.
2. A **moderator** reviews Demands and approves, partially approves, approves with conditions, or rejects them.
3. On approval, the system tracks how much of a location's **Capacity** has been allocated.
4. **Admins** manage the reference data that drives every form: locations, organization hierarchy, services, resources, and capacities.

---

## Repository Structure

```
demands/
├── client/                     # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/                # Axios instance, API functions, payload types
│   │   ├── components/         # UI components (organized by domain)
│   │   ├── context/            # React contexts (ReferenceData, Modal, Refresh)
│   │   ├── hooks/              # Custom hooks (useProjects, useDemands, …)
│   │   ├── i18n/               # i18next setup + locale JSON files (en, he)
│   │   ├── pages/              # Page-level components (one per route)
│   │   └── types/              # TypeScript domain types
│   ├── index.html
│   └── vite.config.ts
│
├── server/                     # Express + Prisma + TypeScript API
│   ├── src/
│   │   ├── controllers/        # Request handlers (organized by domain)
│   │   │   ├── auth/
│   │   │   ├── location/
│   │   │   ├── organization/
│   │   │   ├── request/        # Projects and Demands
│   │   │   └── service/
│   │   ├── services/           # Business logic + Prisma queries
│   │   │   ├── location/
│   │   │   ├── organization/
│   │   │   ├── request/
│   │   │   └── service/
│   │   ├── routes/             # Express router definitions
│   │   ├── middleware/         # Auth (OIDC), authorization (RBAC)
│   │   ├── models/             # TypeScript models (User)
│   │   └── lib/                # Shared utilities (Prisma client, errors, settings)
│   ├── prisma/
│   │   ├── schema.prisma       # Full DB schema
│   │   └── seed.ts             # Development seed data
│   └── entrypoint.sh           # Docker startup script
│
├── docker/
│   ├── keycloak/               # Keycloak realm JSON (pre-configured users & clients)
│   └── postgres/               # PostgreSQL init scripts
│
├── docs/                       # Documentation (specs, plans, architecture)
├── docker-compose.yml
└── package.json                # Root npm workspace
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v7 |
| **State / Auth (client)** | react-oidc-context, React Context API |
| **HTTP client** | Axios |
| **i18n** | i18next + react-i18next |
| **Backend** | Node.js, Express.js, TypeScript |
| **ORM** | Prisma |
| **Database** | PostgreSQL 16 |
| **Auth provider** | Keycloak 26 (OIDC / OAuth 2.0) |
| **Security middleware** | helmet, cors, morgan |
| **Containerization** | Docker + Docker Compose |

---

## Backend Architecture

### Entry Point

`server/src/index.ts` — Creates the Express app, registers global middleware, mounts all routers under `/api`, and starts listening on `PORT` (default: `3000`).

**Middleware stack (in order):**

1. `express.json()` — JSON body parsing
2. `express.urlencoded({ extended: true })` — Form data parsing
3. `cors()` — Cross-origin requests
4. `helmet({ contentSecurityPolicy: false })` — Security headers
5. `morgan('dev')` — HTTP request logging
6. `authenticate` — OIDC/JWT validation (see [Authentication](#authentication--authorization))

### Layered Architecture

Every domain follows the same three-layer pattern:

```
Route  →  Controller  →  Service  →  Prisma  →  PostgreSQL
```

- **Route** — declares HTTP method + path, applies auth/authorization middleware, calls the controller.
- **Controller** — validates request parameters and body, extracts the user context, delegates to the service, sends the HTTP response.
- **Service** — owns all business logic and database queries. Returns plain objects; never touches `req`/`res`.

### Controllers

| Domain | File | Responsibilities |
|---|---|---|
| Auth | `auth/auth.controller.ts` | OAuth token relay to Keycloak, current-user endpoint, OIDC health check |
| Center | `organization/center.controller.ts` | CRUD for the top-level org entity |
| Branch | `organization/branch.controller.ts` | CRUD for branches (child of Center) |
| Section | `organization/section.controller.ts` | CRUD for sections (child of Branch) |
| Base | `location/base.controller.ts` | CRUD for physical datacenter bases |
| Environment | `location/environment.controller.ts` | CRUD for environments (prod/staging/dev) |
| Network | `location/network.controller.ts` | CRUD for network segments |
| Cluster | `location/cluster.controller.ts` | CRUD for clusters |
| Location | `location/location.controller.ts` | CRUD + composite lookup for full Location objects |
| Service | `service/service.controller.ts` | CRUD for services; manages moderator list |
| Resource | `service/resource.controller.ts` | CRUD for resources (child of Service) |
| Capacity | `service/capacity.controller.ts` | CRUD for available capacity at a location |
| Wallet | `service/wallet.controller.ts` | CRUD for per-center budget allocations |
| Project | `request/project.controller.ts` | CRUD + filter + duplicate project with demands |
| Demand | `request/demand.controller.ts` | CRUD + filter + approve/reject/cancel + bulk approve/reject |
| ProjectKind | `request/projectKind.controller.ts` | CRUD for project classification options |
| EmergencyOption | `request/emergencyOption.controller.ts` | CRUD for emergency project options |
| UsersGroups | `usersGroups.controller.ts` | Keycloak user/group search |

**User context** is extracted in every controller via:

```typescript
const { username, isPrivileged } = getUserContext(req);
```

Non-privileged users automatically get a `createdBy = username` filter applied, restricting them to their own records.

### Services

Services mirror controllers one-to-one. Key behaviors:

- **`project.service.ts`** — `duplicate()` runs inside a `prisma.$transaction` to atomically create the new project and all selected demands. Any failure rolls back everything.
- **`demand.service.ts`** — `approve()` increments `Capacity.allocated` and decrements `Capacity.available` in the same transaction as the demand status update.
- **`location.service.ts`** — `findByComposite()` looks up a location by all four component names in a single query.

### Shared Utilities (`server/src/lib/`)

| File | Purpose |
|---|---|
| `prisma.ts` | Singleton `PrismaClient` instance shared across all services |
| `errors.ts` | `NotFoundError` — thrown by services, caught by controllers to return 404 |
| `settings.ts` | Loads all environment variables with defaults; single import for config |
| `oidcDiscoveryService.ts` | Fetches and caches OIDC discovery metadata and JWKS URI |

---

## Frontend Architecture

### Pages & Routing

React Router v7 manages client-side navigation. All pages are wrapped in a shared `Layout` component (sidebar + header).

| Route | Page | Access |
|---|---|---|
| `/projects` | `ProjectsPage` | All authenticated users |
| `/demands` | `DemandsPage` | All authenticated users |
| `/management` | `ManagementPage` | Moderator + Admin |
| `/settings` | `SettingsPage` | Admin only |
| `/*` | `NotFoundPage` | — |

The sidebar renders navigation links conditionally based on the user's roles.

### Component Organization

```
client/src/components/
├── common/                 # Reusable primitives
│   ├── EntityManager       # Generic CRUD table + modal wrapper
│   ├── Modal               # Base modal shell
│   ├── Pagination          # Page controls
│   ├── Select / SearchableSelect
│   ├── Toast               # Notification system
│   ├── ArrayInput          # Multi-value input (used for moderators)
│   ├── ColumnSettingsDropdown
│   └── filters/            # FilterField, FilterGroup, FilterSort, SortControl
│
├── layout/                 # App shell
│   ├── Layout, Sidebar, PageHeader, PageTabs
│   └── GlobalModals        # Mounts create-project/create-demand modals from nav
│
├── projects/               # Project & demand UI
│   ├── ProjectsTable       # Dense table with sorting, filtering, bulk select
│   ├── CreateProjectModal  # Project creation form
│   ├── DuplicateProjectModal # Copy project + carry-forward demands
│   ├── ProjectDetailSidebar
│   ├── DemandsTable        # Demand list within a project
│   ├── CreateDemandModal
│   └── StatusBadge, PriorityBadge
│
├── demands/
│   └── DemandDetailSidebar
│
└── management/             # Moderator / admin UI
    ├── DecisionModal       # Single demand approve/reject
    ├── BulkDecisionModal   # Batch approve/reject
    ├── CapacityManagement + CapacityModal + CapacityTable
    └── WalletManagement + WalletModal + WalletTable
```

### Custom Hooks

Custom hooks are the primary unit of reusable logic. Each hook owns its own data-fetching, loading state, and mutation callbacks.

| Hook | What it manages |
|---|---|
| `useProjects()` | Project list, pagination, create / update / delete / duplicate |
| `useDemands()` | Demand list, pagination, filtering, create / update / delete / cancel / approve / reject / bulk approve / bulk reject |
| `useCapacities()` | Capacity records |
| `useWallets()` | Wallet records |
| `useReferenceData()` | All reference entities (bases, centers, services, etc.) — cached in context |
| `useFilterSort()` | UI filter and sort parameter state |
| `useTableColumns()` | Per-table column visibility (persisted to localStorage) |
| `useAuthToken()` | JWT extraction from OIDC context |
| `useDebounce()` | Debounces search inputs |
| `useDelayedLoading()` | Prevents flicker on fast loads |

**Mutation pattern** (same in every hook):

```typescript
const createProject = useCallback(async (payload) => {
  await apiCreateProject(payload);
  triggerRefreshProjects();          // signals all useProjects consumers to refetch
}, [triggerRefreshProjects]);
```

### API Service Layer

`client/src/api/apiService.ts` exports one function per backend endpoint. All functions use a shared Axios instance (`axiosInstance.ts`) configured with the base URL from `VITE_API_URL`.

Auth token is injected via `setAuthToken(token)` called after OIDC login.

Response mappers (`mapProject`, `mapDemand`) flatten the nested location object returned by the API into a flat `{ base, environment, network, cluster }` shape used throughout the frontend.

### State Management

The app uses React Context for global state — no external state manager.

| Context | Purpose |
|---|---|
| `ReferenceDataContext` | Loads all lookup data once after login; all forms read from here |
| `ModalContext` | Controls the global create-project / create-demand modals triggered from the nav |
| `RefreshContext` | Publishes refresh signals (`triggerRefreshProjects`, `triggerRefreshDemands`) that hooks subscribe to |
| `ToastProvider` | Queues and renders toast notifications |

**Provider nesting order** (`App.tsx`):

```
ToastProvider
  RefreshProvider
    ReferenceDataProvider
      ModalProvider
        BrowserRouter (pages & routes)
```

### Internationalization

- Framework: `i18next` + `react-i18next`
- Languages: **Hebrew (`he`)** (default + fallback) and **English (`en`)**
- Locale files: `client/src/i18n/locales/{he,en}/translation.json`
- Language stored in `localStorage`; detected automatically on first visit
- RTL/LTR: `App.tsx` sets `document.dir` based on active language
- All user-visible strings go through `t('key.path')` — no hardcoded text in components

---

## Domain Model

### Entity Relationships

```
Center
  └── Branch (centerName FK)
        └── Section (branchName + branchCenter FKs)

Base + Environment + Network + Cluster
  └── Location (composite unique constraint)
        └── Capacity (locationId + resourceName + resourceService)
              └── Wallet (centerName + capacityId)

Service
  └── Resource (serviceName FK, has unit of measurement)
        └── Capacity (resourceName + resourceService FKs)

ProjectKind          EmergencyOption
Project (name PK)
  - type: Semiannual | Emergency
  - kind (→ ProjectKind)
  - locationId (→ Location)
  - year, median: H1 | H2    (Semiannual only)
  - emergencyOptionName       (Emergency only)
  - priority: P1 | P2 | P3
  - centerName, branchName, sectionName (org hierarchy)
  - createdBy, createdByName
  └── Demand (id PK, projectName FK)
        - serviceName, resourceName, resourceService (→ Resource)
        - locationId (→ Location)
        - type: New | Extension
        - value (requested)
        - status: Pending | Approved | PartiallyApproved |
                  ApprovedWithCondition | Rejected | Cancelled
        - approvedValue, approvedDate, reason  (set on approval)
        - centerName, branchName, sectionName
        - createdBy, createdByName
```

### Demand Status State Machine

```
                 ┌─────────────────────┐
                 │        Pending      │ ← initial state
                 └─────────────────────┘
                   │      │      │     │
           ┌───────┘  ┌───┘  ┌──┘  ┌──┘
           ▼          ▼      ▼     ▼
       Approved  Partially  Approved  Rejected
                 Approved   With
                            Condition
                                         Cancelled  ← user-initiated
```

Transitions are one-way. Only moderators can approve/reject; only the owner (or moderator) can cancel a Pending demand.

### Capacity & Wallet Accounting

- **Capacity**: represents total resource available at a location for a service/resource type. Fields: `value` (total), `allocated`, `available`.
- On demand **approval**: `allocated += approvedValue`, `available -= approvedValue`.
- **Wallet**: represents how much of a capacity's budget a specific Center is allocated. Used by moderators to track per-org spending.

---

## Authentication & Authorization

### Authentication Flow

```
[Browser]  →  Keycloak login page
Keycloak   →  Redirects back with authorization code
[Browser]  →  POST /api/auth/token  (exchanges code for JWT)
Keycloak   →  Returns access token (JWT, RS256-signed)
[Browser]  →  Stores token via react-oidc-context
[Browser]  →  Sends Authorization: Bearer <token> on every API call
[Server]   →  authenticate middleware validates JWT signature (JWKS)
[Server]   →  Attaches User model to req; downstream middleware checks roles
```

### Roles

Roles are read from the `groups` claim in the JWT (configurable via `AUTH_GROUP_CLAIM_PATH`).

| Role | What they can do |
|---|---|
| **user** (default) | Create projects/demands; view and manage their own records |
| **moderator** | Everything a user can do; approve/reject demands; manage capacities and wallets |
| **admin** | Everything a moderator can do; manage all reference data (centers, bases, services, etc.) |

### Row-Level Ownership

Non-privileged users (users who are not admin or moderator) are automatically scoped to records where `createdBy = username`. This means they get 404 (not 403) for resources they don't own — consistent with the pattern of not leaking existence.

### Authorization Middleware

```typescript
requireAuth              // any authenticated user
requireRoles('admin', 'moderator')  // admin OR moderator
requireAdmin             // admin only
```

---

## Data Flow

### Typical Read (e.g., load project list)

```
ProjectsPage mounts
  → useProjects({ page: 1, limit: 20 }) hook
    → fetchProjects(params, abortSignal)  [apiService.ts]
      → GET /api/projects?page=1&limit=20
        → authenticate middleware (JWT check)
        → projectController.getAll()
          → getUserContext(req)  → { username, isPrivileged }
          → projectService.findAll(isPrivileged ? undefined : username, { page, limit })
            → prisma.project.findMany({ where, include, skip, take })
            → returns { data: Project[], meta: { total, page, ... } }
          → res.json(result)
      → mapProject() applied to each item
    → setState({ projects, meta })
  → ProjectsTable renders with data
```

### Typical Mutation (e.g., approve a demand)

```
Moderator clicks "Approve" in DecisionModal
  → onSubmit({ status: 'Approved', approvedValue: 8 })
    → useDemands().approveDemand(id, payload)
      → approveDemand(id, payload)  [apiService.ts]
        → PATCH /api/demands/:id/approve
          → requireRoles('admin', 'moderator') middleware
          → demandController.approve()
            → demandService.approve(id, payload)
              → prisma.$transaction([
                  demand.update({ status, approvedValue, approvedDate }),
                  capacity.update({ allocated: { increment }, available: { decrement } })
                ])
            → res.json(updatedDemand)
      → triggerRefreshDemands()
    → useDemands() refetches; table updates; modal closes; success toast shown
```

### Project Duplication Flow

```
User clicks Duplicate on a project row
  → setDuplicatingProject(project) in ProjectsPage
    → DuplicateProjectModal opens
      → fetchDemands({ projectName, limit: 1000 })
      → Pre-fills form: next median/year, suggested name
      → Approved demands pre-checked with approvedValue
      → Other demands unchecked with original value
User edits fields, checks/unchecks demands
  → Submit
    → duplicateProject(sourceName, { ...projectFields, demands: selectedIdValuePairs })
      → POST /api/projects/:sourceName/duplicate
        → projectController.duplicate()
          → validates: source exists + ownership, new name unique, location active, org active
          → projectService.duplicate(sourceName, newProjectData, demands)
            → prisma.$transaction(async tx => {
                fetch source demand records (to copy structural fields)
                tx.project.create(newProjectData)
                tx.demand.createMany(demands mapped to new project, status = Pending)
              })
          → res.status(201).json(newProject)
      → triggerRefreshProjects()
    → Success toast; modal closes
```

---

## API Reference

All endpoints are prefixed with `/api`. Authentication is required on all routes except `/api/auth/token` and `/api/health`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/token` | Public | Exchange Keycloak authorization code for JWT |
| GET | `/auth/me` | Required | Return current user's claims |
| GET | `/auth/health` | Public | OIDC connectivity check |

### Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Required | List projects (paginated, filterable) |
| POST | `/projects` | Required | Create project |
| GET | `/projects/filter` | Required | Advanced filter endpoint |
| GET | `/projects/:name` | Required | Get project by name |
| PUT | `/projects/:name` | Required | Update project |
| DELETE | `/projects/:name` | Required | Delete project (must have no demands) |
| POST | `/projects/:name/duplicate` | Required | Duplicate project with selected demands |

### Demands

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/demands` | Required | List demands (paginated, filterable) |
| POST | `/demands` | Required | Create demand |
| GET | `/demands/filter` | Required | Advanced filter endpoint |
| GET | `/demands/:id` | Required | Get demand by ID |
| PATCH | `/demands/:id` | Required | Update demand |
| DELETE | `/demands/:id` | Required | Delete demand |
| PATCH | `/demands/:id/cancel` | Required | Cancel demand (owner or moderator) |
| PATCH | `/demands/:id/approve` | Moderator | Approve demand |
| PATCH | `/demands/:id/reject` | Moderator | Reject demand |
| PATCH | `/demands/bulk/approve` | Moderator | Bulk approve demands |
| PATCH | `/demands/bulk/reject` | Moderator | Bulk reject demands |

### Organization

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/centers` | GET: Required; Write: Admin | Centers |
| GET/POST/PUT/DELETE | `/branches` | GET: Required; Write: Admin | Branches |
| GET/POST/PUT/DELETE | `/sections` | GET: Required; Write: Admin | Sections |

### Location

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/bases` | GET: Required; Write: Admin | Bases |
| GET/POST/PUT/DELETE | `/environments` | GET: Required; Write: Admin | Environments |
| GET/POST/PUT/DELETE | `/networks` | GET: Required; Write: Admin | Networks |
| GET/POST/PUT/DELETE | `/clusters` | GET: Required; Write: Admin | Clusters |
| GET/POST/PUT/DELETE | `/locations` | GET: Required; Write: Admin | Composite locations |
| GET | `/locations/composite/:base/:env/:net/:cluster` | Required | Lookup location by components |

### Services & Capacity

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/services` | GET: Required; Write: Moderator | Services |
| GET | `/services/mine` | Required | Services where current user is moderator |
| GET/POST/PUT/DELETE | `/resources` | GET: Required; Write: Moderator | Resources |
| GET/POST/PUT/DELETE | `/capacities` | GET: Required; Write: Moderator | Capacities |
| GET/POST/PUT/DELETE | `/wallets` | GET: Required; Write: Moderator | Wallets |

### Pagination & Filtering

All list endpoints accept:

```
?page=1&limit=20
```

Filter endpoints additionally accept domain-specific query parameters (e.g., `projectName`, `status`, `centerName`, `year`, `median`).

### Response Shape

**Success (list):**
```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

**Error:**
```json
{ "error": "Descriptive message" }
```

---

## Configuration & Environment

### Server (`server/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Express listen port |
| `NODE_ENV` | `development` | Runtime environment |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `OIDC_DISCOVERY_URL` | `http://localhost:8080/realms/demands/.well-known/openid-configuration` | OIDC discovery endpoint |
| `AUTH_AUDIENCE` | `demands-api` | Expected JWT `aud` claim |
| `AUTH_GROUP_CLAIM_PATH` | `groups` | JWT claim path for roles |
| `AUTH_ADMIN_GROUP` | `admin` | Role name mapped to admin |
| `AUTH_MODERATOR_GROUP` | `moderator` | Role name mapped to moderator |
| `AUTH_CLIENT_TYPE` | `keycloak` | Auth provider (`keycloak` or `custom`) |
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak base URL |
| `KEYCLOAK_REALM` | `demands` | Keycloak realm |
| `KEYCLOAK_CLIENT_ID` | `demands-api` | Backend client ID |
| `KEYCLOAK_CLIENT_SECRET` | — | Backend client secret |

### Client (`client/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:3000`) |
| `VITE_OIDC_AUTHORITY` | Keycloak realm URL |
| `VITE_OIDC_CLIENT_ID` | Frontend Keycloak client ID |
| `VITE_OIDC_REDIRECT_URI` | Post-login redirect URL |

---

## Docker & Deployment

### Services (`docker-compose.yml`)

| Service | Image | Port | Profile |
|---|---|---|---|
| `server` | Built from `server/` | 3000 | default |
| `client` | Built from `client/` | 5173 | `dev` |
| `postgres` | `postgres:16-alpine` | 5432 | `dev` |
| `keycloak` | `quay.io/keycloak/keycloak:26.0` | 8080 | `dev` |

**Start full dev stack:**
```bash
NODE_ENV=development docker compose --profile dev up --build
```

**Start server only** (external DB):
```bash
docker compose up --build
```

### Keycloak Pre-configuration

The realm is auto-imported from `docker/keycloak/demands-realm.json`. It includes:

- **Realm**: `demands`
- **Clients**: `demands-api` (backend), `demands-web` (frontend)
- **Seeded users** for local development:

| Username | Password | Role |
|---|---|---|
| `admin1`, `admin2` | `admin123` | admin |
| `mod1`, `mod2` | `mod123` | moderator |
| `user1`, `user2`, `user3` | `user123` | user |

### Build Scripts

```bash
# Development
npm run dev            # server only (nodemon)
npm run dev:server     # same
npm run dev:client     # Vite dev server (HMR)

# Production
npm run build          # builds both server and client
npm run build:server   # tsc output → server/dist/
npm run build:client   # vite build → client/dist/

# Database
cd server && npx prisma migrate dev    # apply migrations
cd server && npm run seed              # seed reference data + test users
```

---

## Conventions & Patterns

### Error Handling

- Services throw `NotFoundError` for missing records.
- Controllers catch errors and map them to HTTP status codes (400, 404, 500).
- Frontend hooks expose `{ error: string | null }` — displayed inline or as a toast.
- Axios request cancellation via `AbortSignal` prevents state updates on unmounted components.

### Cascade Rules

| Delete | Cascades to |
|---|---|
| Center | Branches → Sections → Projects → Demands, Wallets |
| Location | Capacities → Wallets |
| Service | Resources → Capacities → Demands |
| Project | Blocked if Demands exist (explicit service-level check) |

### Naming Conventions

- **DB models**: PascalCase (`Project`, `Demand`)
- **DB fields**: camelCase (`projectName`, `approvedValue`)
- **API routes**: plural nouns (`/projects`, `/demands`)
- **Controller methods**: `getAll`, `getByName`, `getByFilters`, `create`, `update`, `delete`
- **React components**: PascalCase (`ProjectsTable`, `DuplicateProjectModal`)
- **Hooks**: `use` prefix (`useProjects`, `useDemands`)
- **API functions**: verb + noun (`fetchProjects`, `createDemand`, `duplicateProject`)

### Bulk Operations

Bulk approve/reject accept:

```typescript
{
  selectAll?: boolean        // apply to all records matching filters
  ids?: number[]             // specific demand IDs
  filters?: DemandFilterParams  // used with selectAll
  excludedIds?: number[]     // exclusions when using selectAll
  status: DemandStatus
  approvedValue?: number
  reason?: string
}
```

### Atomic Transactions

Operations that touch multiple tables use `prisma.$transaction` with a typed `Prisma.TransactionClient` callback:

- **Project duplication** — creates project + all selected demands atomically
- **Demand approval** — updates demand status + adjusts capacity counters atomically

### Column Visibility

Table column visibility is user-configurable and persisted to `localStorage` via `useTableColumns()`. Each table has a "Columns" dropdown that toggles visibility per column.
