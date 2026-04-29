# Duplicate Project Feature — Design Spec

**Date:** 2026-04-29
**Status:** Approved

---

## Overview

Users need to duplicate a project from one half-year period to the next to avoid re-entering all project details and demands from scratch. The feature adds a "Duplicate" action to each row in the Projects table. It opens a full modal where the user can adjust project fields and choose which demands to carry forward.

---

## Behavior Summary

- Approved demands (`Approved`, `PartiallyApproved`, `ApprovedWithCondition`) are automatically included in the duplicate, using `approvedValue` as the new requested `value`.
- Non-approved demands (`Pending`, `Rejected`, `Cancelled`) are shown as optional — unchecked by default. When the user checks one, its value is editable before submission.
- The entire operation is **atomic**: the new project and all selected demands are created in a single database transaction. Partial failures are not possible.
- Authorization mirrors the existing pattern: non-privileged users can only duplicate their own projects; admin/moderators can duplicate any project.

---

## Backend

### New Route

```
POST /api/projects/:name/duplicate
```

`:name` is the source project name.

### Request Body

```ts
{
  name: string;                    // new project name (required, must be unique)
  purpose: string;
  relatedTo?: string;
  type: 'Semiannual' | 'Emergency';
  kind: string;
  locationId: number;
  year?: number;                   // required when type = Semiannual
  median?: 'H1' | 'H2';           // required when type = Semiannual
  priority?: 'P1' | 'P2' | 'P3';
  emergencyOption?: string;        // required when type = Emergency
  centerName: string;
  branchName: string;
  sectionName: string;
  demands: { id: number; value: number }[];  // selected demands with their new values
}
```

### Controller (`projectController.duplicate`)

1. Extracts `username`, `isPrivileged` from the auth token (same `getUserContext` helper).
2. Validates the source project exists and, if non-privileged, that the caller owns it.
3. Validates the new `name` is not already in use.
4. Runs the same location + org active-status checks as `projectController.create`.
5. Delegates to `projectService.duplicate(...)`.
6. Returns `201` with the new project on success.

### Service (`projectService.duplicate`)

```ts
duplicate(
  sourceName: string,
  newProjectData: { name, purpose, relatedTo, type, kindName, locationId,
                    year, median, priority, emergencyOptionName,
                    centerName, branchName, sectionName,
                    createdBy, createdByName },
  demands: { id: number; value: number }[]
)
```

Steps (inside a single `prisma.$transaction`):

1. Fetch the original demand records by the provided IDs to read their structural fields (`serviceName`, `resourceName`, `resourceService`, `locationId`, `type`, `clusterName`, `centerName`, `branchName`, `sectionName`).
2. `prisma.project.create(newProjectData)`
3. `prisma.demand.createMany(...)` — one entry per selected demand:
   - `projectName` = new project name
   - `value` = provided value from the request
   - `status` = `Pending`
   - All structural fields copied from the original demand record
   - `createdBy` / `createdByName` set to the current user
   - `approvedValue`, `approvedDate`, `reason` are **not** copied

Returns the newly created project (with location, kind, emergencyOption includes).

---

## Frontend

### API Layer (`apiService.ts`)

New function:

```ts
duplicateProject(sourceName: string, payload: DuplicateProjectPayload): Promise<Project>
// POST /api/projects/:sourceName/duplicate
```

New type `DuplicateProjectPayload` in `api/types.ts` — same shape as the request body above.

### Hook (`useProjects.ts`)

New callback:

```ts
duplicateProject: (name: string, payload: DuplicateProjectPayload) => Promise<void>
```

Calls `apiDuplicateProject`, then `triggerRefreshProjects()`.

### `ProjectsTable` changes

- Add `onDuplicate: (project: Project) => void` to `ProjectsTableProps`.
- In the `actions` cell, add a `MdContentCopy` icon button between Edit and Delete.

### `DuplicateProjectModal` (new component)

**Props:**
```ts
{
  isOpen: boolean;
  onClose: () => void;
  sourceProject: Project;
  onSuccess: () => void;
}
```

**On open:**
- Fetches all demands for the source project via `GET /api/demands?projectName=...&limit=1000`.
- Pre-fills the project form (see Pre-fill logic below).

**Pre-fill logic:**

| Field | Value |
|---|---|
| `name` | `"{sourceName} - {nextMedian} {nextYear}"` for Semiannual; `"{sourceName} - copy"` for Emergency |
| `year` | Auto-advanced: H1 YYYY → same YYYY; H2 YYYY → YYYY+1 |
| `median` | Auto-advanced: H1 → H2; H2 → H1 |
| All other project fields | Copied verbatim from source |

**Project form section:** Full set of fields identical to `CreateProjectModal` (name, purpose, relatedTo, type, kind, priority, center/branch/section, network/base/environment/cluster, year/median or emergencyOption). All fields are editable. The name field is not locked (unlike edit mode).

**Demands section** (below a visual divider):

Displayed as a compact table: Service / Resource / Location / Type / Status / Value.

- **Auto-included** (statuses: `Approved`, `PartiallyApproved`, `ApprovedWithCondition`):
  - Checkbox pre-checked by default, but the user **can uncheck** to exclude the demand.
  - Value input pre-filled with `approvedValue`, editable when the row is checked.

- **Optional** (statuses: `Pending`, `Rejected`, `Cancelled`):
  - Checkbox unchecked by default.
  - Value input pre-filled with original `value`; active and editable only when the row is checked.

If the source project has no demands, the demands section shows a short empty-state message and the user can proceed with just the project.

**Submit:**
Sends the project form fields + the array of selected `{ id, value }` pairs to `POST /api/projects/:sourceName/duplicate`. On success: success toast, close modal. On error: inline error message inside the modal.

### `ProjectsPage` changes

- Add `duplicatingProject: Project | null` state.
- Pass `onDuplicate={(p) => setDuplicatingProject(p)}` to `ProjectsTable`.
- Render `<DuplicateProjectModal>` when `duplicatingProject !== null`.

---

## Next-half Calculation (utility function)

```ts
function getNextHalf(median: 'H1' | 'H2', year: number): { median: 'H1' | 'H2'; year: number } {
  return median === 'H1'
    ? { median: 'H2', year }
    : { median: 'H1', year: year + 1 };
}
```

---

## Error Cases

| Condition | Response |
|---|---|
| Source project not found | `404` |
| Caller doesn't own source project (non-privileged) | `404` (same as other endpoints) |
| New name already in use | `400` with descriptive message |
| Location / org entity inactive | `400` with descriptive message |
| Any demand ID not found | `400` — transaction rolls back, nothing is created |

---

## Out of Scope

- Bulk-duplicate (selecting multiple projects at once).
- Duplicating Emergency projects to a specific next period (no auto-advance for Emergency type).
- Copying demand approval history or comments.
