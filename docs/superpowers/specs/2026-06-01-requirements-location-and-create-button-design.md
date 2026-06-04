# Requirements: Per-Row Location & Create Button Fix

Date: 2026-06-01

## Overview

Two targeted corrections to the Requirements section:

1. Add per-requirement location selection to the inline requirements section of the "Create New Project" form.
2. Fix the "Create Requirement" button in `RequirementsView` so that creating a requirement from the requirements table correctly refreshes the list.

---

## Change 1 — Per-Row Location Toggle in `CreateProjectModal`

### Problem

The inline requirements section in `CreateProjectModal` (create mode only) lets users add requirements while creating a project. Each requirement row has: Service, Resource, Value, Type. Location is not selectable per requirement — all inherit the project-level location at submit time.

### Solution

Add an optional per-row location override, using a toggle pattern that matches the existing `overrideLocation` behaviour in `CreateDemandModal`.

### State

Extend `InlineRequirement` (local interface in `CreateProjectModal`) with:

```ts
interface InlineRequirement {
  serviceName: string;
  resourceName: string;
  value: number;
  type: 'New' | 'Extension';
  overrideLocation: boolean;   // false by default
  network: string;
  base: string;
  environment: string;
  cluster: string;
}
```

Default value for new rows:
```ts
{ serviceName: '', resourceName: '', value: 0, type: 'New',
  overrideLocation: false, network: '', base: '', environment: '', cluster: '' }
```

### UI

- Each row keeps its current layout: Service | Resource | Value | Type | Delete.
- A small location-pin icon button (`MdLocationOn` or similar) appears after the Type select. It is dimmed/default when override is off, primary-coloured when on.
- Clicking it toggles `overrideLocation` for that row. Toggling off resets `network`, `base`, `environment`, `cluster` to `''`.
- When `overrideLocation` is true, a second sub-row renders directly below the main row (same indent), containing 4 compact cascading selects: Network → Base → Environment → Cluster.
- Cascade logic is identical to `CreateProjectModal`'s project-level location — `baseOptions` filtered by `network`, `environmentOptions` filtered by `network + base`, `clusterOptions` filtered by `network + base + environment`.

### Submit Logic

For each valid inline requirement (serviceName, resourceName, value > 0):

```
if row.overrideLocation AND all four fields filled:
    locationId = referenceData.locations.find(l =>
        l.networkName === row.network &&
        l.baseName === row.base &&
        l.environmentName === row.environment &&
        l.clusterName === row.cluster
    )?.id ?? project locationId
else:
    locationId = project locationId   (existing behaviour)
```

---

## Change 2 — Fix "Create Requirement" Button in `RequirementsView`

### Problem

The "Add Requirement" button in `RequirementsView` calls `openModal('demand')`, which opens `CreateDemandModal` via `GlobalModals`. In create mode, `CreateDemandModal` calls `createDemandGroup` from `apiService` directly and never invokes the `onSubmit` prop. As a result, `triggerRefreshDemands()` in `GlobalModals.handleCreateDemand` is never reached — the requirements table does not refresh after a new requirement is created.

### Solution

Move new-demand creation out of `GlobalModals` and into `RequirementsView` locally. Use a new `onCreated` callback on `CreateDemandModal` to trigger a list refresh.

### `CreateDemandModal` change

Add optional prop:
```ts
onCreated?: () => void;
```

In `handleSubmit`, create mode path — after `createDemandGroup` succeeds and before `handleClose()`:
```ts
onCreated?.();
```

### `RequirementsView` change

- Add state: `const [isCreatingDemand, setIsCreatingDemand] = useState(false)`
- Change button handler from `openModal('demand')` to `() => setIsCreatingDemand(true)`
- Add a local `CreateDemandModal` instance (alongside the existing `editingDemand` one):

```tsx
{isCreatingDemand && (
  <CreateDemandModal
    isOpen={true}
    onClose={() => setIsCreatingDemand(false)}
    onSubmit={handleSubmitDemand}
    onCreated={() => {
      setCurrentPage(1);
      setAccumulatedDemands([]);
    }}
  />
)}
```

### `GlobalModals` — no change needed

`GlobalModals` retains its own `CreateDemandModal` instance for any other call sites that use `openModal('demand')`. `RequirementsView` simply stops using that path.

---

## Files Affected

| File | Change |
|------|--------|
| `client/src/components/projects/CreateProjectModal.tsx` | Extend `InlineRequirement`, add toggle button + sub-row location cascade |
| `client/src/components/projects/CreateDemandModal.tsx` | Add `onCreated?: () => void` prop; call it on successful create |
| `client/src/components/main/RequirementsView.tsx` | Replace `openModal('demand')` with local `isCreatingDemand` state + local modal instance |

---

## Out of Scope

- No changes to `GlobalModals`, backend, or other views.
- No changes to `CreateDemandModal` edit-mode behaviour.
- No changes to the requirements table columns or filters.
