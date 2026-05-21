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
