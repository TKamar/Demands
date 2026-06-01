# UX/UI Refinement Sprint — Work Log

Branch: `feature/ux-ui-refinement-sprint`
Started: 2026-05-21

---

## Progress

| Step | Area | Status |
|------|------|--------|
| 0 | Git branch + WORK_LOG setup | ✅ Done |
| 1 | MainPage: button, search, tab restructuring | ✅ Done |
| 2 | StatusBadge & PriorityBadge: remove bg fill | ✅ Done |
| 3 | ProjectsTable: action order, tooltips, chevrons | ✅ Done |
| 4 | Pagination → Infinite Scroll | ✅ Done |
| 5 | RequirementsView: toolbar cleanup + funnel + sort | ✅ Done |
| 6 | RequestsIOpened: standardize with DemandsTable | ✅ Done |
| 7 | NotificationPanel: RTL fixes | ✅ Done |

---

## Log

### 2026-05-21

**Step 0 — Git setup**
- Created branch `feature/ux-ui-refinement-sprint` from `dev` (SHA: a69f615)
- Created this WORK_LOG.md

**Step 1 — MainPage restructuring** (branch: `feature/ux-ui-refinement-sprint`)
- Removed "New Requirement" button; kept only "New Project"
- Shortened search bar to `w-56`, English fallback placeholder
- Moved TopNavTabs above Projects/Requirements toggle
- Added `role="tablist"`, `role="tab"`, `aria-selected` throughout

**Step 2 — Badge cleanup** (branch: `feature/ux-ui-refinement-sprint`)
- StatusBadge: removed all `bg-*-100` pill fills; text-only colored labels
- PriorityBadge: same pattern (P1=red, P2=yellow, P3=green)

**Step 3 — ProjectsTable polish** (branch: `feature/ux-ui-refinement-sprint`)
- Reordered actions: Delete → Duplicate → Edit
- Added CSS hover tooltips to all action icons
- Flipped chevron to `MdChevronLeft` for RTL
- Stripped `bg-purple-100`/`bg-green-100` from Type/Status cells

**Step 4 — Infinite scroll** (branch: `feature/ux-ui-refinement-sprint`)
- Created `useClientInfiniteScroll` hook (IntersectionObserver, chunk reveal)
- Created `InfiniteScrollSentinel` component
- ProjectsAccordion: replaced Pagination with client-side infinite scroll
- RequirementsView: accumulation-based infinite scroll (server-side pages)

**Step 5 — RequirementsView cleanup** (branch: `feature/ux-step5-requirements-view`)
- Removed bulk selection bar + all related state/imports
- Removed ColumnSettingsDropdown
- FilterSort moved into table card with compact (icon-only) mode
- Added column sort support in DemandsTable (6 sortable columns)

**Step 6 — RequestsIOpened standardization** (branch: `feature/ux-step6-requests-i-opened`)
- Added full-stack restore endpoint (service, controller, route)
- Added `restoreDemand` to apiService and useDemands hook
- Added `MdRestore` action to DemandsTable for Rejected/CenterManagerRejected items
- Rewrote RequestsIOpened to use DemandsTable + useClientInfiniteScroll

**Step 7 — NotificationPanel RTL** (branch: `feature/ux-step7-notifications-rtl`)
- Replaced hardcoded colors with design tokens (bg-bg-paper, border-divider, text-primary)
- Mark-all-read wrapper: `justify-start` → button appears on right in RTL
- Scrollbar on left side via inherited `dir="rtl"` from `<html>`

---

## Resource Assignment Feature

Branch: `feat/resource-assignment`
Started: 2026-05-24

| Area | Status |
|------|--------|
| Prisma schema — `assignedValue` field | ✅ Done |
| Migration SQL file | ✅ Done |
| `demand.service.ts` — `centerName` filter | ✅ Done |
| `demand.controller.ts` — `centerName` query param + `assign` handler | ✅ Done |
| `demand.routes.ts` — `PATCH /:id/assign` route | ✅ Done |
| `domain.ts` — `assignedValue` on `Demand` type | ✅ Done |
| `apiService.ts` — `centerName` query param + `assignDemand` function | ✅ Done |
| `ResourcesForAssignment.tsx` — full implementation | ✅ Done |
| i18n keys (`resourceAssignment.*`) — he + en | ✅ Done |

### 2026-05-24

**feat/resource-assignment**
- Schema: added `assignedValue Float?` to `Demand` model; manual migration SQL at `server/prisma/migrations/20260524_add_assigned_value/migration.sql`
- Service: added `centerName` to `findByFilters` filter type and where clause
- Controller: wired `center` query param → `centerName` filter in `getByFilters`; added `assign` handler using `prisma.demand.update as any` to bypass stale generated client types
- Routes: added `PATCH /:id/assign` guarded by `requireCenterManager`
- Frontend `Demand` type: added `assignedValue?: number`
- `apiService`: maps `assignedValue` in `mapDemand`; sends `center` query param when `centerName` filter present; added `assignDemand` function
- `ResourcesForAssignment`: replaced "Coming Soon" stub with full grouped accordion UI — fetches approved demands for center, groups by resourceName, allows per-demand quantity input with save button
- i18n: expanded `resourceAssignment` namespace in both `he` and `en` locales

---

## RBAC / Multi-Resource / Decision-Dialog Sprint

Branch base: `dev` (SHA at sprint start: varies per phase)
Started: 2026-05-25

| Phase | Area | Status |
|-------|------|--------|
| 1 | DB schema: requirementGroupId, prerequisiteDemandId, isInternalTicket, WaitingOnPrerequisite | ✅ Done |
| 2 | Backend: CM endpoints, history, group creation, transfer, atomic approve/reject | ✅ Done |
| 3 | RBAC view architecture: role-aware tabs, sub-views, RequestHistory | ✅ Done |
| 4 | Multi-resource demand form: ResourceRow, createDemandGroup, group indicator | ✅ Done |
| 5 | Decision dialog refactor: CmDecisionModal, Moderator two-path (Manual/Transfer) | ✅ Done |
| 6 | Work log update + push | ✅ Done |

### 2026-05-25

**Phase 1 — DB Schema** (branch: `feat/db-schema-sprint4`)
- Added to `Demand` model: `requirementGroupId Int?`, `prerequisiteDemandId Int?`, `isInternalTicket Boolean @default(false)`, self-relation `"PrerequisiteChain"`
- Added `WaitingOnPrerequisite` to `DemandStatus` enum
- Migration SQL at `server/prisma/migrations/20260525164536_sprint4_schema/migration.sql`
- `prisma generate` ran successfully (no DB available for `migrate dev`)

**Phase 2 — Backend Plumbing** (branch: `feat/backend-history-transfer`)
- `demand.service.ts`: default status `Pending` → `PendingCenterManager` on create
- New methods: `getHistoryDemands`, `createDemandGroup`, `centerManagerApprove`, `centerManagerReject`, `transferDemand`
- `approve` and `reject` now wrap demand update + prerequisite unblock in `prisma.$transaction`
- `transferDemand` validates target service exists and is active before creating internal demand
- `demand.routes.ts`: `GET /history`, `POST /group`, `PATCH /:id/cm-approve`, `PATCH /:id/cm-reject`, `POST /:id/transfer`
- `client/src/types/domain.ts`: `WaitingOnPrerequisite` status + `requirementGroupId`, `prerequisiteDemandId`, `isInternalTicket` fields
- `client/src/api/apiService.ts`: `fetchDemandHistory`, `createDemandGroup`, `centerManagerApproveDemand`, `centerManagerRejectDemand`, `transferDemand`

**Phase 3 — RBAC View Architecture** (branch: `feat/rbac-view-architecture`)
- `client/src/utils/roleUtils.ts`: `getDefaultTab`, `getAvailableTabs`, `isModeratorOrAdmin`, `isCenterManagerOrAdmin`
- `TopNavTabs.tsx`: accepts `role: UserRole`, derives tabs from `getAvailableTabs`; no toggle-to-deselect
- `MainPage.tsx`: no null topNavTab state; `subViewByTab` persists sub-view per tab; renders `ApprovalRequestsPanel`, `MyRequestsPanel`, `HistoryPanel`
- `panels/ApprovalRequestsPanel.tsx`: CM → MyApprovalRequests; Moderator → RequirementsView; includes CenterFilter
- `panels/MyRequestsPanel.tsx`: Projects sub-view + RequestsIOpened requirements sub-view
- `panels/HistoryPanel.tsx`: Projects sub-view + RequestHistory requirements sub-view
- `RequestHistory.tsx`: read-only DemandsTable with server-side infinite scroll via `useHistoryDemands`
- `useHistoryDemands.ts`: accumulates pages via IntersectionObserver sentinel

**Phase 4 — Multi-Resource Form** (branch: `feat/multi-resource-form`)
- `ResourceRow.tsx`: isolated resource+value+unit row component with remove button
- `CreateDemandModal.tsx` create mode: multiple ResourceRows + "Add Resource" button → calls `createDemandGroup` API directly
- Edit mode: unchanged single-row form calling `onSubmit`
- `DemandsTable.tsx`: `border-s-2 border-s-indigo-400` indicator on rows with `requirementGroupId`

**Phase 5 — Decision Dialog Refactor** (branch: `feat/decision-dialog-refactor`)
- `CmDecisionModal.tsx`: two-step modal for Center Manager — choice step (Approve/Reject buttons) and reject step (textarea + submit); calls `centerManagerApproveDemand` or `centerManagerRejectDemand` from apiService; shows toasts on success/error
- `MyApprovalRequests.tsx`: removed `onApprove`/`onReject` props; added `selectedDemand` state; single "קבל החלטה" button opens `CmDecisionModal`; `onSuccess` calls `reload()`
- `DecisionModal.tsx`: added `DecisionPath` state machine (`select | manual | transfer`); `select` view shows two clickable card buttons; `manual` view is existing form with Back button; `transfer` view has active-service selector (excluding demand's current service) + notes textarea + calls `transferDemand` API; added optional `onSuccess` prop
- `DemandsTable.tsx`: `WaitingOnPrerequisite` demands show disabled `MdGavel` button with RTL tooltip explaining the prerequisite lock
- `ApprovalRequestsPanel.tsx` + `MainPage.tsx`: removed `onApprove`/`onReject` props (no longer needed; CM decision is internal to `MyApprovalRequests`)

---

## RBAC Data Filtering, Mock Data & Admin Management Sprint

Started: 2026-05-27

| Branch | Area | Status |
|--------|------|--------|
| `feature/rbac-data-filtering` | Backend: GET /me + createdBy scoping; Frontend: user prop threading, component filters | ✅ Done |
| `feature/mock-data-overhaul` | seed.ts: 13 User records + E2E test scenario | ✅ Done |
| `feature/admin-moderator-resource-assignment` | Backend: Service.moderators PATCH + GET /users; Frontend: UserManagement service multi-select | ✅ Done |

### 2026-05-27

**feature/rbac-data-filtering**
- Server `GET /me`: extended to return `managedServices: string[]` (queries `Service.moderators` array)
- `demand.service.ts` `getHistoryDemands`: all roles now see only their own created demands in History tab
- `demand.controller.ts` `getByFilters`: `createdBy` query param only honoured for privileged users (admin/moderator); non-privileged users always scoped to own username — prevents cross-user data exposure
- `project.controller.ts` `getByFilters`: same `createdBy` scoping pattern
- `client/src/types/domain.ts`: `AppUser.managedServices: string[]` added
- `client/src/api/types.ts`: `DemandFilterParams.createdBy?`, `ProjectFilterParams.createdBy?` added
- `client/src/api/apiService.ts`: `createdBy` forwarded in demand and project fetch calls
- `MainPage.tsx`: threads `currentUser` to `MyRequestsPanel` and `HistoryPanel`
- `MyRequestsPanel.tsx`: accepts `currentUser`, passes `createdBy` to `RequestsIOpened` and `ProjectsAccordion`
- `HistoryPanel.tsx`: accepts `currentUser`, passes `createdBy` to `ProjectsAccordion`
- `ApprovalRequestsPanel.tsx`: passes `managed={true}` to `RequirementsView` (no currentUser needed)
- `RequestsIOpened.tsx`: accepts `createdBy: string` prop, passes to `useDemands`
- `ProjectsAccordion.tsx`: accepts `createdBy?: string`, passes to `useProjects` and `DemandSubTable`
- `RequirementsView.tsx`: accepts `managed?: boolean`, includes in `demandFilterParams`

**feature/mock-data-overhaul**
- `server/prisma/seed.ts`: added `UserRole` import; Keycloak prerequisites comment block; 13 User upserts (admin1, admin2, cm1, mod1–mod7, user1, user2, user3) with correct roles/centerNames; `update: { fullName }` only (safe — OIDC login won't overwrite roles); Service.moderators set for all 5 services; E2E test scenario: project "E2E Test Project" + Demand A (CPU, PendingCenterManager, user1→cm1 flow) + Demand B (RAM, Pending, cm1→mod1 flow)

**feature/admin-moderator-resource-assignment**
- `server/src/services/admin/user.service.ts`: `getAll()` returns `managedServices: string[]` per user via parallel user+service fetch and Map join; `updateRoleAndCenter()` wraps user update + Service.moderators changes in `prisma.$transaction`; raw SQL `array_remove` for bulk clear, individual `push` per service for additions; clearing all assignments when role changes away from MODERATOR
- `server/src/controllers/admin/user.controller.ts`: destructures and validates `managedServices?: string[]` from request body; passes to service layer
- `client/src/api/types.ts`: `UpdateUserPayload.managedServices?: string[]` added
- `client/src/components/settings/UserManagement.tsx`: fetches services alongside users/centers; new "Managed Services" table column; `<select multiple>` appears when role is MODERATOR; role change clears services selection; `changed` includes array comparison; Save payload includes `managedServices` for MODERATOR role

---

## Table Standardization & Filter UX Sprint

Started: 2026-05-25

| Task | Area | Status |
|------|------|--------|
| A1 | FilterSort for RequestsIOpened | ✅ Done |
| A2 | FilterSort for MyApprovalRequests | ✅ Done |
| A3 | FilterSort for CapacityManagement & WalletManagement | ✅ Done |
| B  | MoreActionsMenu — portal positioning fix | ✅ Done |
| C  | Checkbox ghost-selection dedup + Deselect All | ✅ Done |

### 2026-05-25

**Task A1 — RequestsIOpened filter panel**
- Added `FilterSort` (compact) in header above table
- Filter fields: status, serviceName, resourceName
- Options derived from loaded demands via useMemo
- `filteredDemands` piped through `useClientInfiniteScroll` before table render
- All handlers in `useCallback`; stable module-level `noop` for `onSortChange`

**Task A2 — MyApprovalRequests filter panel**
- Same pattern as A1
- Filter fields: serviceName, resourceName, projectName
- `filteredDemands` replaces raw demands in table render

**Task A3 — CapacityManagement & WalletManagement filter panels**
- `FilterSort` added in section header of both parent management components
- Capacity fields: service, resource, base, network, environment
- Wallet fields: service, resource, center
- Options derived from loaded capacities/wallets; all handlers memoized

**Task B — MoreActionsMenu portal fix**
- Replaced `absolute end-0 top-full mt-1` dropdown with `ReactDOM.createPortal` + `position: fixed`
- Position computed via `getBoundingClientRect()` on trigger ref on each open
- Click-outside handler checks both `containerRef` and `menuRef`
- Added Escape key handler and `aria-haspopup`/`aria-expanded` on trigger

**Task C — Checkbox fixes**
- `RequirementsView`: deduplicates accumulated demands by `id` when appending pages
- Filter/sort changes now clear selected demand IDs and locked center/resource
- `DemandsTable`: new `onDeselectAll` prop; `IndeterminateCheckbox` helper renders in thead when `selectedIds.size > 0`
- Branch: `fix/checkbox-selection` → merged to `dev`

---

## Requirements Location & Create Button Fix

Branch: `feature/requirements-location-create-button`
Started: 2026-06-01

| Task | Area | Status |
|------|------|--------|
| 1 | InlineRequirement state + submit logic | ✅ Done |
| 2 | Per-row location toggle UI | ✅ Done |
| 3 | CreateDemandModal onCreated prop | ✅ Done |
| 4 | RequirementsView button fix | ✅ Done |

### 2026-06-01

**feature/requirements-location-create-button**
- `CreateProjectModal`: extended `InlineRequirement` with `overrideLocation`, `network`, `base`, `environment`, `cluster`; `updateRequirementRow` now cascades resets on location field changes; each row gains a location-pin toggle button revealing a 4-level cascade sub-row; submit resolves per-row `locationId` (falls back to project location if override is off or incomplete)
- `CreateDemandModal`: added optional `onCreated?: () => void` prop; called after successful `createDemandGroup` in create mode
- `RequirementsView`: replaced `openModal('demand')` with local `isCreatingDemand` state; local `CreateDemandModal` instance resets page + accumulated demands via `onCreated` callback
