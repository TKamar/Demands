# Infrastructure Taxonomy — Full System Logic Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 5 logic and UX gaps discovered during the full system audit so the new 18-service taxonomy works correctly end-to-end.

**Architecture:** Phase 1 (seed data) is complete. Phase 2 fixes gaps in the transfer flow (resource compatibility validation on both server and client), adds 13 missing i18n keys that currently use inline Hebrew fallbacks, and corrects a display inconsistency in `CreateProjectModal`. No database schema changes; all fixes are in application logic.

**Tech Stack:** TypeScript/Node.js backend with Prisma ORM, React 18 frontend with i18next, Express.js HTTP layer

---

## File Map

| File | Current Responsibility | Changes |
|------|------------------------|---------|
| `server/src/services/request/demand.service.ts` | Transfer logic | Add resource compatibility check |
| `server/src/controllers/request/demand.controller.ts` | HTTP handler for transfers | Add error catch for incompatible resource |
| `client/src/components/management/DecisionModal.tsx` | Single demand transfer UI | Filter dropdown to compatible services |
| `client/src/components/management/ServiceDecisionModal.tsx` | Group transfer UI | Filter dropdown to services with all group resources |
| `client/src/i18n/locales/en/translation.json` | English UI strings | Add 13 missing keys for service actions |
| `client/src/i18n/locales/he/translation.json` | Hebrew UI strings | Add 13 missing keys (Hebrew translations) |
| `client/src/components/projects/CreateProjectModal.tsx` | Project + inline demands form | One-line label display fix |
| `WORK_LOG.md` | Project progress tracking | Add Phase 2 completion entry |

---

## Task 1: Server — `transferDemand` resource validation

**Files:**
- Modify: `server/src/services/request/demand.service.ts` (lines 559–603, add check after line 569)
- Modify: `server/src/controllers/request/demand.controller.ts` (lines 774–791, add catch at line ~786)

**Context:** Currently, `transferDemand` verifies the target service exists and is active, but does NOT check that the original demand's resource exists under that service. With the new specific taxonomy (each service has distinct resources), this creates orphaned records. The fix adds server-side validation to reject transfers to incompatible services.

- [ ] **Step 1: Open `demand.service.ts` and locate the `transferDemand` function (line 559)**

Read the function signature and find the line where `targetService` is validated as active (line ~569).

- [ ] **Step 2: Add resource compatibility check**

After the target service active check (line 569), insert:

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

This looks up the resource by its composite key and throws if not found or inactive.

- [ ] **Step 3: Open `demand.controller.ts` and locate the `transferDemand` handler (line 774)**

Find the catch block that starts around line 783 and already handles `NotFoundError` and `'Only Pending'` errors.

- [ ] **Step 4: Add the 'does not support' error handler**

Inside the catch block (after the `'Only Pending'` check, before the generic 500 error), insert:

```ts
if (error instanceof Error && error.message.includes('does not support')) {
  return res.status(400).json({ error: error.message });
}
```

This matches the pattern used in `centerManagerApprove` (line 743–745).

- [ ] **Step 5: Test the server validation manually**

Start the server: `npm run dev:server`

Create a demand with `serviceName: "VM"` and `resourceName: "vCPU"`, then test the transfer endpoint:
```bash
curl -X POST http://localhost:3000/demands/{demandId}/transfer \
  -H "Content-Type: application/json" \
  -d '{"targetServiceName": "KAFKA"}' \
  -H "Authorization: Bearer <token>"
```

Expected: 400 response with message containing "does not support" (because KAFKA doesn't have "vCPU").

If the demand is not actually in Pending status, you'll get "Only Pending" error instead — that's OK; the test still validates the error handler is wired.

- [ ] **Step 6: Commit**

```bash
cd C:\Projects\Demands\Demands
git add server/src/services/request/demand.service.ts server/src/controllers/request/demand.controller.ts
git commit -m "fix: validate resource compatibility in transferDemand"
```

---

## Task 2: Client — `DecisionModal.tsx` transfer dropdown filter

**Files:**
- Modify: `client/src/components/management/DecisionModal.tsx` (lines 86–88, and around line 107 where the dropdown is rendered)

**Context:** The `DecisionModal` modal allows transferring a single demand to another service. Currently, it shows all active services in the dropdown regardless of whether the target service has the demand's resource. With the new specific taxonomy, most services are incompatible. This task filters the dropdown to only services that actually have the resource, preventing users from selecting incompatible transfers.

- [ ] **Step 1: Open `DecisionModal.tsx` and locate the `availableServices` variable**

Find line ~86 where `availableServices` is computed. Currently it filters by `s.isActive !== false && s.name !== demand.serviceName`.

- [ ] **Step 2: Replace the `availableServices` computation**

Replace the current computation with:

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

This filters to services that:
1. Are active
2. Are not the current service
3. Have a resource matching the demand's resource name

**Key insight:** `resources` is already loaded in `ReferenceDataContext` — no extra API call needed.

- [ ] **Step 3: Find the `<select>` element that renders the transfer service options**

Look for the form control that displays `availableServices` (likely around line 105–110).

- [ ] **Step 4: Add empty-state handling**

Replace the `<select>` rendering block with:

```tsx
{availableServices.length === 0 ? (
  <p className="text-sm text-muted">
    {t('service.noCompatibleTransfer', 'No compatible services available')}
  </p>
) : (
  <select value={targetService} onChange={e => setTargetService(e.target.value)}>
    <option value="">Select a service...</option>
    {availableServices.map(s => (
      <option key={s.name} value={s.name}>
        {s.displayName || s.name}
      </option>
    ))}
  </select>
)}
```

This shows a message when no compatible services exist, instead of showing an empty dropdown.

- [ ] **Step 5: Test in the browser**

Start the app: `npm run dev`

1. Create a demand with `serviceName: "VM"` and `resourceName: "vCPU"`
2. Open the DecisionModal for that demand
3. Click the "Transfer" tab
4. Verify the dropdown shows ZERO services OR the message "No compatible services available" (because no other service has vCPU)
5. Create a demand with `serviceName: "HDFS"` and `resourceName: "Storage"`
6. Open DecisionModal for that demand
7. Click "Transfer" → dropdown should show services that have "Storage" (NAS, S3, MongoK, MongoVM, Postgres, etc.)

- [ ] **Step 6: Commit**

```bash
git add client/src/components/management/DecisionModal.tsx
git commit -m "fix: filter transfer dropdown to resource-compatible services"
```

---

## Task 3: Client — `ServiceDecisionModal.tsx` group transfer dropdown filter

**Files:**
- Modify: `client/src/components/management/ServiceDecisionModal.tsx` (lines 121–123, and around line 140 where the dropdown is rendered)

**Context:** The `ServiceDecisionModal` allows transferring a SERVICE GROUP (multiple demands in the same service) to another service. If the group contains demands with different resource names, the target service must support ALL of them. This task filters the dropdown accordingly.

- [ ] **Step 1: Open `ServiceDecisionModal.tsx` and locate the `availableServices` variable**

Find line ~121 where `availableServices` is currently computed.

- [ ] **Step 2: Replace the `availableServices` computation**

Replace with:

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

This:
1. Collects all distinct resource names in the group
2. Filters to services that have ALL those resource names
3. Ensures the group can transfer as a unit to the target service

- [ ] **Step 3: Find the `<select>` element for the transfer service**

Locate around line 135–145.

- [ ] **Step 4: Add empty-state handling**

Replace the `<select>` rendering with:

```tsx
{availableServices.length === 0 ? (
  <p className="text-sm text-muted">
    {t('service.noCompatibleTransfer', 'No compatible services available')}
  </p>
) : (
  <select value={targetService} onChange={e => setTargetService(e.target.value)}>
    <option value="">Select a service...</option>
    {availableServices.map(s => (
      <option key={s.name} value={s.name}>
        {s.displayName || s.name}
      </option>
    ))}
  </select>
)}
```

- [ ] **Step 5: Test in the browser**

1. Create demands with both `resourceName: "vCPU"` (only in VM) and `resourceName: "Memory"` (in VM, Spark, RUNAI, Openshift, etc.) in the same service group
2. Open ServiceDecisionModal for the group
3. Click "Transfer" → dropdown should show only services that have BOTH vCPU AND Memory (should be only VM and maybe others with both)
4. Create a group with mixed resources that no single service has → should show "No compatible services"

- [ ] **Step 6: Commit**

```bash
git add client/src/components/management/ServiceDecisionModal.tsx
git commit -m "fix: filter group transfer dropdown to resource-compatible services"
```

---

## Task 4: i18n — Add 13 missing keys to both translation files

**Files:**
- Modify: `client/src/i18n/locales/en/translation.json` (add new `"service"` section + 3 keys under `management`)
- Modify: `client/src/i18n/locales/he/translation.json` (same structure, Hebrew values)

**Context:** `DemandSubTable.tsx` and `ServiceDecisionModal.tsx` use 13 i18n keys that don't exist in the translation files. The code falls back to hardcoded Hebrew strings, making the keys permanently non-overridable. This task adds all 13 keys to both language files.

- [ ] **Step 1: Open `client/src/i18n/locales/en/translation.json`**

Locate the top-level structure. After the existing top-level sections (e.g., after `"settings"`), add a new `"service"` section.

- [ ] **Step 2: Add the new `"service"` section to English file**

Insert (at the end of the top-level object, before the closing `}`):

```json
"service": {
  "resources": "Resources",
  "deleteGroupTitle": "Delete Service Group",
  "deleteGroupMessage": "Delete all demands in this service group?",
  "deleteGroupSuccess": "Service group deleted",
  "quickApprove": "Quick Approve",
  "quickApproveTitle": "Quick Approve",
  "quickApproveMessage": "Approve all pending resources in this service?",
  "quickApproveSuccess": "Approved successfully",
  "deepDecision": "Deep Decision",
  "noDecisionNote": "No decision",
  "noCompatibleTransfer": "No compatible services available"
}
```

- [ ] **Step 3: Add keys under `management.success`**

Find the `"management"` → `"success"` object (currently has `"approved"` and `"rejected"`). Add:

```json
"transferred": "Demand transferred successfully",
"decided": "Decision saved"
```

- [ ] **Step 4: Add keys under `management.error`**

Find the `"management"` → `"error"` object (currently has `"approveFailed"` and `"rejectFailed"`). Add:

```json
"transferFailed": "Transfer failed"
```

- [ ] **Step 5: Verify JSON syntax is valid**

Save the file and check: `npx ts-node -e "console.log(JSON.parse(require('fs').readFileSync('./client/src/i18n/locales/en/translation.json', 'utf8')))"`

Expected: JSON is printed without errors.

- [ ] **Step 6: Open `client/src/i18n/locales/he/translation.json`**

Make identical structure changes with Hebrew translations.

- [ ] **Step 7: Add the `"service"` section to Hebrew file**

Insert:

```json
"service": {
  "resources": "משאבים",
  "deleteGroupTitle": "מחיקת קבוצת שירות",
  "deleteGroupMessage": "האם למחוק את כל הדרישות בקבוצת שירות זו?",
  "deleteGroupSuccess": "קבוצת השירות נמחקה",
  "quickApprove": "אישור מהיר",
  "quickApproveTitle": "אישור מהיר",
  "quickApproveMessage": "לאשר את כל המשאבים הממתינים בשירות זה?",
  "quickApproveSuccess": "אושר בהצלחה",
  "deepDecision": "החלטה מעמיקה",
  "noDecisionNote": "ללא החלטה",
  "noCompatibleTransfer": "אין שירותים תואמים להעברה"
}
```

- [ ] **Step 8: Add keys under `management.success` (Hebrew)**

Under `"management"` → `"success"`:

```json
"transferred": "הדרישה הועברה בהצלחה",
"decided": "ההחלטה נשמרה"
```

- [ ] **Step 9: Add keys under `management.error` (Hebrew)**

Under `"management"` → `"error"`:

```json
"transferFailed": "ההעברה נכשלה"
```

- [ ] **Step 10: Verify Hebrew file JSON is valid**

Save and run: `npx ts-node -e "console.log(JSON.parse(require('fs').readFileSync('./client/src/i18n/locales/he/translation.json', 'utf8')))"`

Expected: JSON is printed without errors.

- [ ] **Step 11: Test in the browser**

Start the app: `npm run dev`

1. Open DemandSubTable (in Projects view)
2. Hover over "Quick Approve" button → tooltip should appear in English (not Hebrew) if language is EN
3. Hover over "Deep Decision" button → same test
4. Switch to Hebrew language → buttons should show Hebrew text

- [ ] **Step 12: Commit**

```bash
git add client/src/i18n/locales/en/translation.json client/src/i18n/locales/he/translation.json
git commit -m "fix: add missing i18n keys for service group actions and transfer feedback"
```

---

## Task 5: `CreateProjectModal.tsx` — display consistency fix

**Files:**
- Modify: `client/src/components/projects/CreateProjectModal.tsx` (one-line in the inline requirements section)

**Context:** The inline requirements section in `CreateProjectModal` uses `s.name` as the service option label, while every other service dropdown in the system uses `s.displayName || s.name`. This is inconsistent and will cause divergence if display names are ever added to the Service model.

- [ ] **Step 1: Open `CreateProjectModal.tsx` and search for the inline requirements section**

Look for the part where services are rendered as `<option>` elements. This is typically in the "add requirements" form or accordion.

- [ ] **Step 2: Find the line that renders service options**

Search for a pattern like: `<option key={s.name} value={s.name}>{s.name}</option>`

- [ ] **Step 3: Update to use displayName fallback**

Change:

```tsx
<option key={s.name} value={s.name}>{s.name}</option>
```

to:

```tsx
<option key={s.name} value={s.name}>{s.displayName || s.name}</option>
```

- [ ] **Step 4: Test in the browser**

1. Start the app: `npm run dev`
2. Open CreateProjectModal → create mode → scroll to "Add Requirements" section
3. Click "Add Requirement" → service dropdown should open
4. Verify it looks identical to the service dropdown in CreateDemandModal (both now use displayName fallback)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/projects/CreateProjectModal.tsx
git commit -m "fix: use displayName fallback for service options in CreateProjectModal"
```

---

## Task 6: Update WORK_LOG.md with Phase 2 completion

**Files:**
- Modify: `WORK_LOG.md` (append new section at the end)

**Context:** Document the completion of Phase 2 for the infrastructure taxonomy refactor.

- [ ] **Step 1: Open `WORK_LOG.md` and go to the end of the file**

- [ ] **Step 2: Add the Phase 2 completion section**

Append:

```markdown
---

## Infrastructure Taxonomy — Full System Logic Alignment (Phase 2)

Branch: `feature/infrastructure-mapping-refactor`
Completed: 2026-06-02

| Task | Component | Status |
|------|-----------|--------|
| 1 | transferDemand resource validation (server) | ✅ Done |
| 2 | DecisionModal transfer filter (client) | ✅ Done |
| 3 | ServiceDecisionModal group transfer filter (client) | ✅ Done |
| 4 | 13 missing i18n keys (en + he) | ✅ Done |
| 5 | CreateProjectModal display fix | ✅ Done |
| 6 | WORK_LOG update | ✅ Done |

### 2026-06-02

**Phase 2: Logic Alignment for Real Infrastructure Taxonomy**

- **Server validation:** `transferDemand` now validates that the target service owns the demand's resource before allowing the transfer. Rejects with 400 "Service X does not support resource Y" if incompatible.

- **Client filtering:** `DecisionModal` and `ServiceDecisionModal` transfer dropdowns now filter to only compatible services. Empty state shows "No compatible services available" when applicable.

- **i18n completeness:** Added 13 missing keys to both English and Hebrew translation files that were previously using hardcoded Hebrew fallbacks. Keys added:
  - `service.*` (11 keys for service group actions)
  - `management.success.transferred`, `management.success.decided`
  - `management.error.transferFailed`

- **Display consistency:** Fixed `CreateProjectModal` inline requirements to use `s.displayName || s.name` like all other service dropdowns.

### Verification Checklist

- ✅ Transfer to incompatible service returns 400 with clear error message
- ✅ Transfer dropdown shows only compatible services
- ✅ Group transfer filters by ALL resource names in group
- ✅ All i18n keys now appear in translation files (no more fallbacks)
- ✅ CreateProjectModal service dropdown matches CreateDemandModal styling

### Commits

1. `fix: validate resource compatibility in transferDemand`
2. `fix: filter transfer dropdown to resource-compatible services`
3. `fix: filter group transfer dropdown to resource-compatible services`
4. `fix: add missing i18n keys for service group actions and transfer feedback`
5. `fix: use displayName fallback for service options in CreateProjectModal`
6. `docs: log infrastructure logic alignment (phase 2)`

---
```

- [ ] **Step 3: Commit the WORK_LOG update**

```bash
git add WORK_LOG.md
git commit -m "docs: log infrastructure logic alignment (phase 2)"
```

---

## Verification & Testing Summary

### Before starting implementation:
- Branch `feature/infrastructure-mapping-refactor` is active and clean
- Server and client are set up locally (able to run `npm run dev`)

### During implementation:
- Each commit should be independent and testable
- Run tests after each fix to verify no regressions: `npm run test:server` and `npm run test:client`

### End-to-end verification:
1. **Transfer validation:** Try to transfer a VM/vCPU demand to KAFKA via API → should 400
2. **DecisionModal filtering:** Open DecisionModal for a VM/vCPU demand → transfer dropdown empty
3. **ServiceDecisionModal filtering:** Open group transfer for mixed-resource group → shows only compatible services
4. **i18n keys:** Switch languages in browser → no hardcoded Hebrew fallbacks visible
5. **Display consistency:** CreateProjectModal inline requirements dropdown looks identical to CreateDemandModal

