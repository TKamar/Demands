# UI Redesign — Unified Main Screen: Design Spec
**Date:** 2026-05-06 | **Branch:** `feat/ui-redesign`

## Context

The system currently uses a sidebar-based layout with two separate pages: Projects (`/projects`) and Demands (`/demands`), plus a Management page (`/management`) for moderators. The goal is to unify these into a single main page with two tab views, remove the sidebar entirely, and replace it with a minimal top bar. The Management page is removed — its functionality is absorbed by the Requirements tab (decisions) and the Settings page (capacity/wallet management). A placeholder Dashboard screen is noted for future work (resource cards for moderators/admins).

## Layout

- **Sidebar removed.** Replaced by a slim top bar.
- **Top bar:** Logo on one side · Role icon + username dropdown on the other.
  - Admin → 👑 crown icon (links to Settings)
  - Moderator → ⚙ cog icon (links to Settings)
  - Regular user → no icon
  - Dropdown (all roles): Profile settings, Logout
- **Full-width content area** below the top bar.

## Main Page — two tab views

Route: `/projects` (default). `/demands` redirects to `/projects?tab=requirements`. `/management` redirects to `/projects`.

### Tab 1: "Projects & Requirements"

- **Center filter** (multiselect, persists across tabs): filter projects by center(s); "All" by default.
- **Resource summary strip** (collapsible ▶/▼): compact chips per resource type showing `Total · Allocated · Remaining`. Updates when center selection changes. Collapsed by default.
- **Search bar** (placeholder — future implementation).
- **Create buttons** inline with search: `+ New Project` (primary) · `+ New Requirement` (secondary).
- **Accordion table**: project rows that expand to show demands inline.
  - Project row columns: Toggle arrow · Name · Type · Center · Priority · Demand Count · Actions (Edit, Delete, Duplicate)
  - Column-visibility toggle on project header row.
  - Expanded sub-table columns (compact): Service · Resource · Value · Status · Actions
  - Sub-table has its own column-visibility toggle.
  - Clicking a demand row → opens existing `DemandDetailSidebar` (split view).
  - Clicking the project name text → opens existing `ProjectDetailSidebar`.
  - Role-based actions in sub-table:
    - Regular user: Edit, Cancel
    - Moderator / Admin: Edit, Cancel, Make Decision

### Tab 2: "Requirements"

- Same center filter + resource summary strip (shared state, persists from Tab 1).
- Same search bar placeholder + Create buttons.
- **Full demands table**: identical to the current `DemandsPage` — same columns, filters, sort, column-visibility toggle.
- Clicking a row → opens existing `DemandDetailSidebar`.
- Moderator/Admin extras:
  - "Make Decision" action in Actions column for eligible demands.
  - Checkbox column for row selection.
  - Bulk action bar (appears on selection): Bulk Approve · Bulk Reject.

## Settings Changes

- Settings page is now accessible to **Admin** (crown) and **Moderator** (cog).
- Two new tabs added: **Capacity** and **Wallets** (moved from Management page).
- Tab visibility by role:
  - Admin: Infrastructure · Organization · Options · Services · Capacity · Wallets
  - Moderator: Services · Capacity · Wallets

## Removed

- `Sidebar.tsx` and sidebar-based `Layout.tsx` → replaced by `TopBar.tsx` + new `Layout.tsx`.
- `ProjectsPage.tsx` → replaced by `MainPage.tsx`.
- `DemandsPage.tsx` → replaced by `MainPage.tsx` Requirements tab.
- `ManagementPage.tsx` → functionality split to Requirements tab + Settings.

## Future Scope (not in this branch)

- Search bar implementation.
- Dashboard page (`/dashboard`): resource cards with progress bars for moderators/admins.
