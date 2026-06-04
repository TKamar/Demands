# Sub-Project B: 3-Level Table Accordion — Design Spec

Date: 2026-06-01

## Overview

Refactor the Projects table from a 2-level structure (Project → flat demands) to a 3-level accordion (Project → Service group → Resource rows). Actions move from the individual demand level to the Service level. Two new decision paths are added for moderators: Quick Approve and Deep Decision.

---

## Level Structure

| Level | Row type | Columns | Actions |
|-------|----------|---------|---------|
| 1 | Project | Name, Type, Center, Priority, Status | Delete, Duplicate, Edit (unchanged) |
| 2 | Service group | Service name, resource count | Edit, Delete; admin/mod also: Quick Approve, Deep Decision |
| 3 | Resource (demand) | Resource name, Value + unit, Status | None — click opens `DemandDetailSidebar` |

**Status and Priority labels at all levels:** colored text only, no background fill — consistent with existing `StatusBadge`/`PriorityBadge` convention.

---

## Section 1: DemandSubTable Refactor

### Problem

`DemandSubTable` is currently an inline component inside `ProjectsAccordion.tsx` (730 lines total) that renders a flat table of demands per project. It needs to become a 2-level grouped view (Service → Resources) and will grow significantly.

### Architecture

Extract `DemandSubTable` to its own file and refactor it in place.

**New file:** `client/src/components/main/DemandSubTable.tsx`

**Grouping logic:** `useMemo` over the loaded demands produces a `Map<string, Demand[]>` keyed by `serviceName`. Insertion order is preserved — services appear in the order their first demand was received.

```ts
const serviceGroups = useMemo(() => {
  const groups = new Map<string, Demand[]>();
  for (const demand of demands) {
    const list = groups.get(demand.serviceName) ?? [];
    groups.set(demand.serviceName, [...list, demand]);
  }
  return groups;
}, [demands]);
```

**Service expand state:** `const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())` — local to each `DemandSubTable` instance so each project's service rows are independent.

**Props (unchanged from current):**
```ts
interface DemandSubTableProps {
  projectName: string;
  canDecide: boolean;
  mode?: 'active' | 'history';
  createdBy?: string;
}
```

---

## Section 2: Service Row (Level 2)

### Columns

- Expand/collapse chevron (toggles Level 3 resource rows)
- Service name (bold, indented from project row)
- Resource count label: `(N resources)` — muted text, no background

### Actions

**All users (Edit and Delete):**

- **Edit** — opens `ManageServiceDemandsModal` for this service group
- **Delete** — `ConfirmDialog` → calls `deleteDemand(id)` for every demand in the group on confirm; shows success/error toast

**Admin and Moderator only (Quick Approve and Deep Decision):**

- **⚡ Quick Approve** — `ConfirmDialog` ("Approve all pending resources in this service?") → calls `approveDemand(id, { approvedValue: demand.value })` for every demand in the group whose status is in `ACTIVE_STATUSES`; shows toast (success or partial-failure count)
- **⚖️ Deep Decision** — opens `ServiceDecisionModal` for this service group

`canDecide` prop (already passed from `ProjectsAccordion`) gates Quick Approve and Deep Decision visibility.

---

## Section 3: Resource Row (Level 3)

### Columns

- Resource name (indented below service row)
- Value + unit (e.g. `32 Cores`, `128 GB`)
- Status — colored text only, no fill

### Behavior

- No action buttons
- Click anywhere on the row → opens `DemandDetailSidebar` for that demand (same sidebar as today)

---

## Section 4: Edit → `ManageServiceDemandsModal`

**New file:** `client/src/components/projects/ManageServiceDemandsModal.tsx`

### Props

```ts
interface ManageServiceDemandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  serviceName: string;
}
```

### Behavior

- On open: fetches all demands for `{ projectName, serviceName }` via `fetchDemands` with an `AbortController` (same pattern as `CreateProjectModal`'s edit-mode demands section).
- Displays a list of demands. Each row: Resource name | Value + unit | Type | Status | **Edit** button | **Delete** button.
  - **Edit** — opens `CreateDemandModal` with `editingDemand` pre-filled
  - **Delete** — `ConfirmDialog` → `deleteDemand(id)` → refreshes list
- Terminal statuses (`Approved`, `PartiallyApproved`, `ApprovedWithCondition`, `Rejected`, `CenterManagerRejected`, `Cancelled`) disable Edit and Delete buttons.
- **Add Resource** button at the bottom — opens `CreateDemandModal` in create mode with `projectName` and `serviceName` pre-filled. This requires adding two optional props to `CreateDemandModal`: `defaultProjectName?: string` and `defaultServiceName?: string`, which pre-populate the form's initial state when provided. `onCreated` refreshes the list.
- `refreshDemands` callback is abort-guarded (same `useRef<AbortController>` pattern).

---

## Section 5: Quick Approve

Implemented inline in `DemandSubTable` — no new component needed.

**Flow:**
1. Moderator/admin clicks Quick Approve on a service row
2. `ConfirmDialog` appears: "Approve all pending resources in [Service name]?"
3. On confirm: calls `approveDemand(id, { approvedValue: demand.value })` via `Promise.allSettled` for each demand in the service group with `ACTIVE_STATUSES`
4. Toast: success if all resolved, or "X approved, Y failed" on partial failure

---

## Section 6: Deep Decision → `ServiceDecisionModal`

**New file:** `client/src/components/management/ServiceDecisionModal.tsx`

### Props

```ts
interface ServiceDecisionModalProps {
  open: boolean;
  onClose: () => void;
  demands: Demand[];        // all demands in the service group
  serviceName: string;
  projectName: string;
  isLoading?: boolean;
  onSuccess?: () => void;
}
```

### Structure

Based on the existing `DecisionModal` UX pattern (the decision dialog characterization image). Same two-path toggle at the top:

**Path A — Manual Decision:**
- Shows one row per demand in the group
- Each row: Resource name | Requested value | Decision type dropdown | Conditional inputs
- Decision types (same as existing `DecisionModal`): Approve / Partial quantity / Reject / Conditional / Waiting
- Selecting "Partial quantity" shows an approved-value input (defaults to `demand.value`)
- Selecting "Reject" or "Conditional" shows a reason/notes input
- Demands with no decision selected are left unchanged (not submitted)
- Submit button label: "Submit Decisions (N)" where N = count of rows with a selection
- On submit: calls `approveDemand` or `rejectDemand` for each demand that has a decision selected; calls `onSuccess` after all settle

**Path B — Transfer:**
- Same as existing `DecisionModal` transfer path: select a target service (excluding the current service), add notes, calls `transferDemand` for **every** demand in the group (all are transferred together, no per-demand selection)

### State

```ts
type PerDemandDecision = {
  action: 'none' | 'approve' | 'reject' | 'partial' | 'conditional' | 'waiting';
  approvedValue?: number;
  reason?: string;
};
```
One `PerDemandDecision` entry per demand, keyed by `demand.id`.

---

## File Map

| File | Change |
|------|--------|
| `client/src/components/main/ProjectsAccordion.tsx` | Remove inline `DemandSubTable`; import from new file |
| `client/src/components/projects/CreateDemandModal.tsx` | Add `defaultProjectName?: string` and `defaultServiceName?: string` props for pre-filling create mode |
| `client/src/components/main/DemandSubTable.tsx` | New — extracted + refactored to 3-level structure |
| `client/src/components/projects/ManageServiceDemandsModal.tsx` | New — Edit action modal |
| `client/src/components/management/ServiceDecisionModal.tsx` | New — Deep Decision modal |

---

## Out of Scope

- No changes to the backend or data model — demands are grouped client-side by `serviceName`
- No changes to `RequirementsView`, `RequestsIOpened`, or `RequestHistory`
- Sub-project C (mock data) is a separate spec
