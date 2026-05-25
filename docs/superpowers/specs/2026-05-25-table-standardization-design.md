# Design: Table Standardization, Filter UX, Action Menu Fix & Checkbox Fixes

**Date:** 2026-05-25  
**Status:** Approved

---

## 1. Scope & Goals

Three independent workstreams:

| Area | Goal |
|------|------|
| A — Filter Standardization | Add unified `FilterSort` funnel to all data tables that lack it |
| B — Action Menu Positioning | Fix dropdown rendering inside overflow-clipped table containers |
| C — Checkbox Fixes | Eliminate ghost-selection bug; add Deselect All to table header |

---

## 2. Section A — Filter Standardization

### 2.1 Tables in scope

| Table | Current state | Change |
|-------|---------------|--------|
| RequirementsView | ✅ FilterSort already present | No change |
| RequestsIOpened | No filter UI | Add FilterSort |
| MyApprovalRequests | No filter UI | Add FilterSort |
| CapacityTable | No filter UI | Add FilterSort in parent page |
| WalletTable | No filter UI | Add FilterSort in parent page |
| EntityManager | Text search input | No change — generic component; filter config would need to be injected per-caller |
| ProjectsAccordion | Per-column ColumnHeader dropdowns | No change — different filter paradigm, already functional |

### 2.2 Architecture

All filtering is **client-side** — every affected table already loads its full dataset upfront. No new API endpoints are needed.

### 2.3 RequestsIOpened

**File:** `client/src/components/main/RequestsIOpened.tsx`

- Add `filters` state (`Record<string, string>`) initialized to `{}`.
- Add `FilterSort` in compact mode in a new header toolbar above the table, reusing the same header-row pattern as RequirementsView.
- Filter fields: `status`, `serviceName`, `resourceName`, `projectName`.
- Derive `filteredDemands = useMemo(...)` that applies the active filters to the loaded `demands` array before passing to `DemandsTable`.
- Wire `useReferenceData()` for dropdown options (services, resources). Project names come from `useCachedProjects()` (already imported).
- Filter configs defined as a local constant following the `FilterGroupConfig` type already in the codebase.
- Pass `filteredDemands` to both `useClientInfiniteScroll` and `DemandsTable` (replace current `demands` reference).

### 2.4 MyApprovalRequests

**File:** `client/src/components/main/MyApprovalRequests.tsx`

- Same pattern as RequestsIOpened.
- Filter fields: `serviceName`, `resourceName`, `projectName`.
- Add a header toolbar row with `FilterSort` (compact) above the existing custom `<table>`.
- `filteredDemands = useMemo(...)` filters the CM's pending demands array.
- Wire `useReferenceData()` for services/resources options.

### 2.5 CapacityTable / WalletTable

These components are pure presentational — they accept data as props and render it. The filter state lives in their **parent page/container**.

**CapacityTable parent:**
- Add `filters` state and `FilterSort` in the section header above `<CapacityTable>`.
- Filter fields: `service`, `resource`, `base`, `network`, `environment`.
- Compute `filteredCapacities = useMemo(...)` filtering the loaded `capacities` array; pass result to `<CapacityTable>`.

**WalletTable parent:**
- Same pattern.
- Filter fields: `service`, `resource`, `center`.
- Compute `filteredWallets = useMemo(...)`.

> **Implementation note:** During implementation, locate the page/component that renders `<CapacityTable>` and `<WalletTable>` (likely a management page under `pages/` or a management container). Read those files and apply the filter there.

### 2.6 Filter UI consistency rules

- Always use `compact` prop on `FilterSort` so only the funnel icon + badge shows by default.
- Active filter badge styling follows the existing pattern (`absolute -top-1 -end-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full`).
- "Clear Filters" button appears inside the expanded panel when any filter is active.
- No changes to `FilterSort` component itself.

---

## 3. Section B — Action Menu Positioning Fix

### 3.1 Root cause

`MoreActionsMenu` (`components/common/MoreActionsMenu.tsx`) renders its dropdown as `position: absolute` scoped to its local `<div class="relative">` container. Inside table rows, ancestor elements with `overflow-x-auto` or `overflow-hidden` clip this absolutely-positioned dropdown, causing it to appear at an incorrect offset or be partially hidden.

### 3.2 Fix — Portal + Fixed Positioning

**File:** `client/src/components/common/MoreActionsMenu.tsx`

1. Add a `triggerRef: React.RefObject<HTMLButtonElement>` to the trigger `<button>`.
2. Add `menuPosition: { top: number; right: number } | null` state, initialized to `null`.
3. On menu open, call `triggerRef.current.getBoundingClientRect()` to compute coordinates:
   ```ts
   const rect = triggerRef.current.getBoundingClientRect();
   setMenuPosition({
     top: rect.bottom + window.scrollY + 4,   // 4px gap
     right: window.innerWidth - rect.right,    // RTL-safe: anchor to the right edge of trigger
   });
   ```
4. Render the dropdown via `ReactDOM.createPortal(...)` targeting `document.body`, with inline style `{ position: 'fixed', top, right }` and `z-index: 400`.
5. Remove the `absolute end-0 top-full mt-1` classes from the dropdown (replaced by the fixed portal styles).
6. The existing `containerRef` click-outside handler continues to work — the portal dropdown is still logically inside the component.

**Result:** The dropdown escapes all overflow contexts and aligns exactly below the trigger button at any scroll position.

---

## 4. Section C — Checkbox Fixes

### 4.1 Ghost-selection bug

**File:** `client/src/components/main/RequirementsView.tsx`

**Root cause:** The infinite-scroll accumulation in `setAccumulatedDemands` can produce duplicate `demand.id` values if the API returns the same demand on multiple pages (possible when server-side data changes between page fetches). Two rows render with the same `demand.id`; `selectedIds.has(id)` returns `true` for both, making one click appear to select multiple rows.

**Fix 1 — Deduplicate during accumulation:**
```ts
useEffect(() => {
  if (isLoading) return;
  setAccumulatedDemands(prev => {
    if (currentPage === 1) return demands;
    const existing = new Set(prev.map(d => d.id));
    return [...prev, ...demands.filter(d => !existing.has(d.id))];
  });
}, [demands, currentPage, isLoading]);
```

**Fix 2 — Clear selection on filter change:**
Add `clearSelection()` call inside `handleFilterChange` and `handleClearAllFilters`. Currently, changing filters resets `accumulatedDemands` but leaves `selectedDemandIds` populated — previously-selected IDs can match IDs of demands in the new filtered view, causing spurious pre-checked rows.

### 4.2 Deselect All

**File:** `client/src/components/projects/DemandsTable.tsx`

- Add new optional prop: `onDeselectAll?: () => void`.
- In `<thead>`, replace the `—` placeholder cell (shown when `showBulkSelect` is true) with:
  - If `selectedIds.size === 0`: render `—` (unchanged)
  - If `selectedIds.size > 0`: render a small "deselect all" button (or indeterminate checkbox) that calls `onDeselectAll()`
- The button uses an indeterminate checkbox (`ref.indeterminate = true`) to signal a partial/active selection state.

**File:** `client/src/components/main/RequirementsView.tsx`

- Pass `onDeselectAll={clearSelection}` to `<DemandsTable>`.

---

## 5. Execution Steps (Git branches)

| Step | Branch | Files |
|------|--------|-------|
| A1 | `feat/filter-requests-opened` | `RequestsIOpened.tsx` |
| A2 | `feat/filter-approval-requests` | `MyApprovalRequests.tsx` |
| A3 | `feat/filter-admin-tables` | Parent pages of CapacityTable + WalletTable |
| B | `fix/action-menu-portal` | `MoreActionsMenu.tsx` |
| C | `fix/checkbox-selection` | `DemandsTable.tsx`, `RequirementsView.tsx` |

Each branch merges into `dev`. No pushes to `main`.

---

## 6. Out of Scope

- Server-side filter API changes (all filtering is client-side)
- EntityManager filter upgrade (generic component; per-caller config injection not warranted)
- ProjectsAccordion per-column filter replacement (already functional)
- Any changes to `FilterSort` component internals
