# Sub-Project A: Bug Fixes & Investigation — Design Spec

Date: 2026-06-01

## Overview

Three targeted fixes to restore missing UI functionality following recent RBAC view architecture changes:

1. **Center Filter — System-Wide**: Lift `selectedCenters` to `MainPage` so the filter applies to every panel and sub-view for Admin and Moderator users.
2. **Create + Edit + Cancel in `RequestsIOpened`**: The My Requests → Requirements view is missing create, edit, and cancel demand actions.
3. **Project Edit Form — Demands Section**: In edit mode, `CreateProjectModal` hides the inline requirements section entirely. Add a read-only demand list with Edit, Cancel, and Add Demand actions.

---

## Section 1: Center Filter — System-Wide

### Problem

`selectedCenters` state is local to `ApprovalRequestsPanel` and the `CenterFilter` component only renders for `subView === 'projects' && !isCM`. When users switch to the Requirements sub-view, or navigate to My Requests or History tabs, the center filter disappears and filtering resets.

### Rules

- **Show** for `ADMIN` and `MODERATOR` roles only (uses existing `isModeratorOrAdmin` utility).
- **Hide** for `REGULAR_USER` and `CENTER_MANAGER` — these roles are scoped to a single center server-side and do not need a center filter.
- Filter **persists across tab switches** (state lives in `MainPage`).

### Architecture

`selectedCenters: string[]` state moves to `MainPage`. A `CenterFilter` bar renders between `TopNavTabs` and the active panel content, visible only when role is admin or moderator. All three panels receive `selectedCenters` as a prop and thread it to their sub-components.

### File Changes

| File | Change |
|------|--------|
| `client/src/pages/MainPage.tsx` | Add `selectedCenters: string[]` state; use existing `isModeratorOrAdmin(role)` from `roleUtils`; render `<CenterFilter>` bar between TopNavTabs and panel (conditional on role); pass `selectedCenters` to all three panels |
| `client/src/components/main/panels/ApprovalRequestsPanel.tsx` | Remove local `selectedCenters` state and local `<CenterFilter>` render; accept `selectedCenters: string[]` as prop; `ResourceSummaryStrip` continues receiving it as before |
| `client/src/components/main/panels/MyRequestsPanel.tsx` | Accept `selectedCenters: string[]` as prop; pass to `ProjectsAccordion` and `RequestsIOpened` |
| `client/src/components/main/panels/HistoryPanel.tsx` | Accept `selectedCenters: string[]` as prop; pass to `ProjectsAccordion` (currently hardcoded `[]`) and `RequestHistory` |
| `client/src/components/main/RequestsIOpened.tsx` | Accept `selectedCenters?: string[]`; join as comma-separated string and pass as `centerName` to `useDemands` filter params |
| `client/src/components/main/RequestHistory.tsx` | Accept `selectedCenters?: string[]`; pass to `useHistoryDemands` |
| `client/src/hooks/useHistoryDemands.ts` | Accept `params?: { centerName?: string }` argument; reset and re-fetch page 1 when `centerName` changes; append `centerName` query param to `fetchDemandHistory` call |
| `client/src/api/apiService.ts` | Add `centerName?: string` to `fetchDemandHistory` params; append to query string when present |

`ProjectsAccordion` already accepts and uses `selectedCenters` — no change needed.

---

## Section 2: Create + Edit + Cancel in `RequestsIOpened`

### Problem

`RequestsIOpened` (My Requests → Requirements tab) renders `DemandsTable` with only `onRestore` wired. Users cannot create new demands, edit pending demands, or cancel demands from this view. `RequirementsView` (Approval Requests → Requirements) already has all three actions.

### Solution

Mirror the action pattern from `RequirementsView`. All changes are local to `RequestsIOpened`.

### New State

```ts
const [isCreatingDemand, setIsCreatingDemand] = useState(false);
const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);
```

### Changes to `RequestsIOpened.tsx`

- **Destructure** `createDemand`, `updateDemand`, `cancelDemand` from `useDemands` (currently only `restoreDemand` is used).
- **Header toolbar**: Add an "Add Requirement" (`+ הוסף דרישה`) button that sets `isCreatingDemand(true)`, matching the button style in `RequirementsView`.
- **DemandsTable**: Add `onEdit={setEditingDemand}` and `onCancel={setDemandToCancel}` props.
- **Create modal**: `{isCreatingDemand && <CreateDemandModal isOpen onClose={() => setIsCreatingDemand(false)} onSubmit={handleSubmitDemand} onCreated={refreshDemands} />}`
- **Edit modal**: `{editingDemand && <CreateDemandModal isOpen onClose={() => setEditingDemand(null)} onSubmit={handleSubmitDemand} editingDemand={editingDemand} />}`
- **Cancel confirm**: Reuse existing `ConfirmDialog` pattern; `demandToCancel` triggers dialog; confirm calls `cancelDemand(demandToCancel.id)`.
- **`handleSubmitDemand`**: Calls `createDemand` or `updateDemand` based on whether `demandId` is provided; clears `editingDemand` on success.
- **`refreshDemands`**: Resets accumulated demands list (same pattern as `RequirementsView`'s `onCreated` — reset page to 1).

Note: `RequestsIOpened` currently uses client-side infinite scroll (`useClientInfiniteScroll`). After creation, the `useDemands` fetch auto-updates through its existing `limit: 500` call.

---

## Section 3: Project Edit Form — Demands Section (Option B)

### Problem

`CreateProjectModal` wraps the entire inline requirements section in `{!editingProject && ...}`, so edit mode shows no way to add, edit, or remove demands from a project. The only workaround is closing the modal and using the accordion's expanded sub-table.

### Solution

In edit mode, render a **Demands section** below the project fields showing the project's existing demands as read-only rows, each with Edit and Cancel action buttons, plus an Add Demand button.

### New State in `CreateProjectModal`

```ts
const [projectDemands, setProjectDemands] = useState<Demand[]>([]);
const [isAddingDemand, setIsAddingDemand] = useState(false);
const [editingDemandInProject, setEditingDemandInProject] = useState<Demand | null>(null);
const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);
const [isDemandSectionLoading, setIsDemandSectionLoading] = useState(false);
```

### Data Fetching

A `useEffect` fires when `isOpen && isEditMode && editingProject`:

```ts
useEffect(() => {
  if (!isOpen || !isEditMode || !editingProject) return;
  setIsDemandSectionLoading(true);
  fetchDemands({ projectName: editingProject.name, page: 1, limit: 200 })
    .then(res => setProjectDemands(res.data))
    .finally(() => setIsDemandSectionLoading(false));
}, [isOpen, isEditMode, editingProject?.name]);
```

`refreshProjectDemands()` repeats this fetch and is called after any demand create, edit, or cancel.

### UI

Section header: "דרישות" with demand count badge + "הוסף דרישה" button (right-aligned, `dir="rtl"`).

Each demand row displays inline:
- Service name | Resource name | Value + unit | Type badge | Location (network/base compact)
- **Edit** button: sets `editingDemandInProject`; opens `CreateDemandModal` above the project modal
- **Cancel** button: sets `demandToCancel`; opens `ConfirmDialog`

Demands with a terminal status (`Approved`, `PartiallyApproved`, `ApprovedWithCondition`, `Rejected`, `CenterManagerRejected`, `Cancelled`) show Edit/Cancel buttons as disabled with a muted style. Active statuses (`PendingCenterManager`, `Pending`, `WaitingOnPrerequisite`) show enabled buttons.

### Stacked Modals

`CreateDemandModal` (when opened from within `CreateProjectModal`) renders via the existing `<Modal>` portal with `z-50`. `CreateProjectModal` uses `z-40` (or equivalent). Verify z-index ordering after implementation; add a `className` override if needed.

### New Imports in `CreateProjectModal`

- `import CreateDemandModal from './CreateDemandModal'`
- `import ConfirmDialog from '../common/ConfirmDialog'`
- A direct API fetch function for demands filtered by `projectName` — implementer should verify the correct function name in `apiService.ts` (e.g., the `getDemands` or equivalent that `useDemands` wraps internally)

---

## Files Affected Summary

| File | Section |
|------|---------|
| `client/src/pages/MainPage.tsx` | 1 |
| `client/src/components/main/panels/ApprovalRequestsPanel.tsx` | 1 |
| `client/src/components/main/panels/MyRequestsPanel.tsx` | 1 |
| `client/src/components/main/panels/HistoryPanel.tsx` | 1 |
| `client/src/components/main/RequestsIOpened.tsx` | 1, 2 |
| `client/src/components/main/RequestHistory.tsx` | 1 |
| `client/src/hooks/useHistoryDemands.ts` | 1 |
| `client/src/api/apiService.ts` | 1 |
| `client/src/components/projects/CreateProjectModal.tsx` | 3 |

---

## Out of Scope

- No backend changes for Section 2 or 3 (all existing endpoints used).
- No changes to `DemandsTable` column config.
- No changes to `GlobalModals`.
- Sub-project B (3-level accordion) and Sub-project C (mock data) are separate specs.
