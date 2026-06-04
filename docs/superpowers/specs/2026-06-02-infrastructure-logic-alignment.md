# Infrastructure Taxonomy — Full System Logic Alignment

Date: 2026-06-02

## Overview

Phase 1 replaced the seed data (services, resources) with the real 18-service production taxonomy from the Excel spec. This spec covers Phase 2: closing the logic and UX gaps that the audit uncovered. The system architecture is already well-designed — all business logic is database-driven with no hardcoded service names. Four specific gaps need fixing before the taxonomy refactor is complete.

---

## Context: What Phase 1 Already Covers

- `server/prisma/seed.ts` — 18 new services, ~40 resources, moderator assignments, capacities ✅
- `server/scripts/seed-sub-project-c.ts` — test data aligned to new taxonomy ✅
- TypeScript types — all generic strings, no enum constraints ✅
- Client dropdowns — fully dynamic via `ReferenceDataContext` ✅
- Moderator scoping — fully dynamic: `prisma.service.findMany({ where: { moderators: { has: username } } })` ✅
- Approval / rejection flows — service-agnostic ✅

---

## Gap 1 (HIGH): Transfer Validation — Server

**File:** `server/src/services/request/demand.service.ts` — `transferDemand` function (lines 559–603)

**Problem:** The function validates that the target service exists and is active, but does NOT check that the original demand's `resourceName` exists under the target service. With the new specific taxonomy (each service has distinct resources), a moderator can transfer `VM / vCPU` to `KAFKA`, which creates a `Demand` row with `serviceName: KAFKA, resourceName: vCPU` — a record that references a non-existent `(resourceName, serviceName)` composite key in the `Resource` table. This bypasses the create-controller's own resource validation.

**Fix:** Two-part change following the existing error pattern in the codebase:

In `demand.service.ts`, after the target service exists/active check, add:
```ts
const targetResource = await prisma.resource.findUnique({
  where: { name_serviceName: { name: original.resourceName, serviceName: targetServiceName } },
});
if (!targetResource || !targetResource.isActive) {
  throw new Error(
    `Service "${targetServiceName}" does not support resource "${original.resourceName}"`
  );
}
```

In `demand.controller.ts`, inside the `transferDemand` catch block (which already handles `NotFoundError` and `'Only Pending'`), add one more guard:
```ts
if (error instanceof Error && error.message.includes('does not support')) {
  return res.status(400).json({ error: error.message });
}
```

This follows the exact same pattern used for `centerManagerApprove` / `centerManagerReject` error handling (lines 743–745).

---

## Gap 2 (HIGH): Transfer Dropdown — `DecisionModal.tsx`

**File:** `client/src/components/management/DecisionModal.tsx` (lines 86–88)

**Problem:** `availableServices` filters by `isActive && name !== demand.serviceName` only. With the new taxonomy every service has a completely different resource set, so almost all services in the dropdown are incompatible — but the user can still pick them and get a server 400 after submission.

**Fix:** Use the already-loaded `referenceData.resources` to restrict to services that actually have the demand's resource:
```tsx
const { services, resources } = useReferenceData();

const availableServices = useMemo(() =>
  services.filter(s =>
    s.isActive !== false &&
    s.name !== demand.serviceName &&
    resources.some(r => r.serviceName === s.name && r.name === demand.resourceName)
  ),
  [services, resources, demand.serviceName, demand.resourceName]
);
```

Add an empty-state message when `availableServices.length === 0`:
```tsx
{availableServices.length === 0 ? (
  <p className="text-sm text-muted">No compatible services available for transfer</p>
) : (
  <select ...>...</select>
)}
```

No additional API call needed — `resources` is already in context.

---

## Gap 3 (HIGH): Group Transfer Dropdown — `ServiceDecisionModal.tsx`

**File:** `client/src/components/management/ServiceDecisionModal.tsx` (lines 121–123)

**Problem:** Same as Gap 2 but for a service group. The group may contain demands with multiple distinct resource names.

**Fix:** Collect the set of all resource names in the group, then filter services that have ALL of them:
```tsx
const { services, resources } = useReferenceData();

const groupResourceNames = useMemo(
  () => [...new Set(demands.map(d => d.resourceName))],
  [demands]
);

const availableServices = useMemo(() =>
  services.filter(s =>
    s.isActive !== false &&
    s.name !== serviceName &&
    groupResourceNames.every(rName =>
      resources.some(r => r.serviceName === s.name && r.name === rName)
    )
  ),
  [services, resources, serviceName, groupResourceNames]
);
```

Same empty-state handling as Gap 2.

---

## Gap 4 (MEDIUM): Missing i18n Keys — 13 keys across 2 components

**Files:** `client/src/i18n/locales/en/translation.json` and `client/src/i18n/locales/he/translation.json`

**Problem:** `DemandSubTable.tsx` and `ServiceDecisionModal.tsx` use `t('service.*')` and `t('management.success.transferred')` etc., but these keys are absent from both translation files. The code falls back to hardcoded Hebrew strings, making the keys permanently non-overridable via i18n.

### New top-level `service` section (add to both files):

| Key | English | Hebrew |
|-----|---------|--------|
| `service.resources` | Resources | משאבים |
| `service.deleteGroupTitle` | Delete Service Group | מחיקת קבוצת שירות |
| `service.deleteGroupMessage` | Delete all demands in this service group? | האם למחוק את כל הדרישות בקבוצת שירות זו? |
| `service.deleteGroupSuccess` | Service group deleted | קבוצת השירות נמחקה |
| `service.quickApprove` | Quick Approve | אישור מהיר |
| `service.quickApproveTitle` | Quick Approve | אישור מהיר |
| `service.quickApproveMessage` | Approve all pending resources in this service? | לאשר את כל המשאבים הממתינים בשירות זה? |
| `service.quickApproveSuccess` | Approved successfully | אושר בהצלחה |
| `service.deepDecision` | Deep Decision | החלטה מעמיקה |
| `service.noDecisionNote` | No decision | ללא החלטה |

### New entries under `management.success` and `management.error`:

| Key | English | Hebrew |
|-----|---------|--------|
| `management.success.transferred` | Demand transferred successfully | הדרישה הועברה בהצלחה |
| `management.error.transferFailed` | Transfer failed | ההעברה נכשלה |
| `management.success.decided` | Decision saved | ההחלטה נשמרה |

---

## Gap 5 (LOW): Service Display Inconsistency — `CreateProjectModal.tsx`

**File:** `client/src/components/projects/CreateProjectModal.tsx` — inline requirements section, service select option (~line 797)

**Problem:** The service option label uses `s.name` directly. Every other service dropdown in the system uses `s.displayName || s.name`. While no services currently have a `displayName` (the column exists in the client type but is not present in the DB schema), this inconsistency will cause a divergence if display names are ever added.

**Fix:** One-line change:
```tsx
// Before:
<option key={s.name} value={s.name}>{s.name}</option>
// After:
<option key={s.name} value={s.name}>{s.displayName || s.name}</option>
```

---

## File Map

| File | Change |
|------|--------|
| `server/src/services/request/demand.service.ts` | Add resource compatibility check in `transferDemand` |
| `server/src/controllers/request/demand.controller.ts` | Add `'does not support'` catch → 400 in `transferDemand` handler |
| `client/src/components/management/DecisionModal.tsx` | Filter transfer dropdown by resource compatibility |
| `client/src/components/management/ServiceDecisionModal.tsx` | Filter group transfer dropdown by all resource names |
| `client/src/i18n/locales/en/translation.json` | Add 13 missing keys |
| `client/src/i18n/locales/he/translation.json` | Add 13 missing keys (Hebrew values) |
| `client/src/components/projects/CreateProjectModal.tsx` | One-line display fix |

---

## Out of Scope

- Per-resource input type enhancements (e.g., dropdown for `GPU type` enum values) — requires schema changes, separate sprint
- `openapi.yaml` DemandStatus completeness — documentation only, no runtime impact
- Renaming existing demand records — database is fresh-start, no migration needed

---

## Verification

After implementation:
1. Run seed: `npm run dev:server` → verify 18 services, 40 resources in Prisma Studio
2. Create a demand using `VM / vCPU` → attempt to transfer to `KAFKA` → server rejects with 400
3. `DecisionModal` transfer tab → only services with the same resource appear in the dropdown
4. `ServiceDecisionModal` group transfer → only services sharing all group resource names appear
5. `DemandSubTable` group actions show correct translated labels (no Hebrew strings in EN build)
6. `CreateProjectModal` service dropdown in requirements section uses `displayName || name`
