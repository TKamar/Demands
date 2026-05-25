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
