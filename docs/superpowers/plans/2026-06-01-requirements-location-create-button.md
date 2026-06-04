# Requirements: Per-Row Location & Create Button Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-row location override to inline requirements in CreateProjectModal, and fix the "Add Requirement" button in RequirementsView so the list refreshes after creation.

**Architecture:** Three targeted file changes — extend `InlineRequirement` state + UI in `CreateProjectModal`, add an `onCreated` callback to `CreateDemandModal`, then wire `RequirementsView` to use local state for new demand creation instead of the global modal context.

**Tech Stack:** React 18, TypeScript, react-icons/md, react-i18next, existing `referenceData` hook.

---

## File Map

| File | Change |
|------|--------|
| `client/src/components/projects/CreateProjectModal.tsx` | Extend `InlineRequirement` interface + `updateRequirementRow` handler; add toggle button + location sub-row per inline requirement row; update submit logic to resolve per-row `locationId` |
| `client/src/components/projects/CreateDemandModal.tsx` | Add `onCreated?: () => void` prop; call it after successful `createDemandGroup` in create mode |
| `client/src/components/main/RequirementsView.tsx` | Add `isCreatingDemand` state; replace `openModal('demand')` with `setIsCreatingDemand(true)`; render local `CreateDemandModal` that resets page on `onCreated` |

---

## Task 1: Extend `InlineRequirement` and update handlers in `CreateProjectModal`

**Files:**
- Modify: `client/src/components/projects/CreateProjectModal.tsx`

### Context

The `InlineRequirement` interface (defined inline inside the component, lines 57–62) currently has `serviceName`, `resourceName`, `value`, `type`. The `addRequirementRow` and `updateRequirementRow` helpers and the submit path all need updating before the UI is added.

- [ ] **Step 1: Add `MdLocationOn` to the existing react-icons/md import**

In `CreateProjectModal.tsx`, line 3, change:
```tsx
import { MdAdd, MdDelete } from 'react-icons/md';
```
to:
```tsx
import { MdAdd, MdDelete, MdLocationOn } from 'react-icons/md';
```

- [ ] **Step 2: Extend the `InlineRequirement` interface**

Replace the existing interface (lines 57–62):
```tsx
  interface InlineRequirement {
    serviceName: string;
    resourceName: string;
    value: number;
    type: 'New' | 'Extension';
  }
```
with:
```tsx
  interface InlineRequirement {
    serviceName: string;
    resourceName: string;
    value: number;
    type: 'New' | 'Extension';
    overrideLocation: boolean;
    network: string;
    base: string;
    environment: string;
    cluster: string;
  }
```

- [ ] **Step 3: Update `addRequirementRow` to include new fields**

Replace:
```tsx
  const addRequirementRow = () =>
    setInlineRequirements(prev => [...prev, { serviceName: '', resourceName: '', value: 0, type: 'New' }]);
```
with:
```tsx
  const addRequirementRow = () =>
    setInlineRequirements(prev => [
      ...prev,
      { serviceName: '', resourceName: '', value: 0, type: 'New',
        overrideLocation: false, network: '', base: '', environment: '', cluster: '' },
    ]);
```

- [ ] **Step 4: Update `updateRequirementRow` to handle location cascade resets**

Replace:
```tsx
  const updateRequirementRow = (idx: number, field: keyof InlineRequirement, value: string | number) =>
    setInlineRequirements(prev =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'serviceName') updated.resourceName = '';
        return updated;
      })
    );
```
with:
```tsx
  const updateRequirementRow = (idx: number, field: keyof InlineRequirement, value: string | number | boolean) =>
    setInlineRequirements(prev =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'serviceName') updated.resourceName = '';
        if (field === 'overrideLocation' && !value) {
          updated.network = '';
          updated.base = '';
          updated.environment = '';
          updated.cluster = '';
        }
        if (field === 'network') { updated.base = ''; updated.environment = ''; updated.cluster = ''; }
        if (field === 'base') { updated.environment = ''; updated.cluster = ''; }
        if (field === 'environment') { updated.cluster = ''; }
        return updated;
      })
    );
```

- [ ] **Step 5: Update the submit logic to resolve per-row `locationId`**

Inside `handleSubmit`, the `validRequirements.map(r => createDemand({...}))` block (around line 305–317) currently passes `locationId: location.id` for every row. Replace that entire `Promise.allSettled` call block with:

```tsx
          const results = await Promise.allSettled(
            validRequirements.map(r => {
              let reqLocationId = location.id;
              if (r.overrideLocation && r.network && r.base && r.environment && r.cluster) {
                const overrideLoc = referenceData.locations.find(
                  l =>
                    l.networkName === r.network &&
                    l.baseName === r.base &&
                    l.environmentName === r.environment &&
                    l.clusterName === r.cluster
                );
                if (overrideLoc) reqLocationId = overrideLoc.id;
              }
              return createDemand({
                projectName: form.name.trim(),
                serviceName: r.serviceName,
                resourceName: r.resourceName,
                resourceService: r.serviceName,
                value: r.value,
                locationId: reqLocationId,
                type: r.type,
                centerName: form.center || undefined,
                branchName: form.branch || undefined,
                sectionName: form.section || undefined,
              });
            })
          );
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/projects/CreateProjectModal.tsx
git commit -m "feat: extend InlineRequirement with location override fields and cascade reset logic"
```

---

## Task 2: Add per-row location toggle UI to inline requirements rows

**Files:**
- Modify: `client/src/components/projects/CreateProjectModal.tsx`

### Context

The inline requirements rows are rendered inside the `{inlineRequirements.length > 0 && (...)}` block. Each row is currently a `<div className="flex items-center gap-2 flex-wrap">`. Wrap each row in a column-flex container and add the toggle button + conditional sub-row.

- [ ] **Step 1: Replace the per-row `<div>` with a column wrapper and add the location toggle**

Find the existing row render (currently `<div key={idx} className="flex items-center gap-2 flex-wrap">`). Replace the entire row JSX — from `<div key={idx}...>` through its closing `</div>` — with:

```tsx
                  <div key={idx} className="flex flex-col gap-1">
                    {/* Main row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Service select */}
                      <select
                        value={req.serviceName}
                        onChange={e => updateRequirementRow(idx, 'serviceName', e.target.value)}
                        className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      >
                        <option value="">{t('demand.service', 'שירות')}</option>
                        {referenceData.services.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>

                      {/* Resource select (filtered by service) */}
                      <select
                        value={req.resourceName}
                        onChange={e => updateRequirementRow(idx, 'resourceName', e.target.value)}
                        className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                        disabled={!req.serviceName}
                      >
                        <option value="">{t('demand.resource', 'משאב')}</option>
                        {referenceData.resources
                          .filter(r => r.serviceName === req.serviceName)
                          .map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                      </select>

                      {/* Value input */}
                      <input
                        type="number"
                        min={1}
                        value={req.value || ''}
                        onChange={e => updateRequirementRow(idx, 'value', Number(e.target.value))}
                        placeholder={t('demand.value', 'כמות')}
                        className="w-20 px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      />

                      {/* Type select */}
                      <select
                        value={req.type}
                        onChange={e => updateRequirementRow(idx, 'type', e.target.value as 'New' | 'Extension')}
                        className="w-28 px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      >
                        <option value="New">{t('demand.type.new', 'חדש')}</option>
                        <option value="Extension">{t('demand.type.extension', 'הרחבה')}</option>
                      </select>

                      {/* Location override toggle */}
                      <button
                        type="button"
                        onClick={() => updateRequirementRow(idx, 'overrideLocation', !req.overrideLocation)}
                        title={req.overrideLocation
                          ? t('project.inlineRequirements.locationCustom', 'מיקום מותאם')
                          : t('project.inlineRequirements.locationFromProject', 'מיקום מהפרויקט')}
                        className={`transition-colors cursor-pointer bg-transparent border-none p-1 ${
                          req.overrideLocation ? 'text-primary' : 'text-text-secondary hover:text-primary'
                        }`}
                      >
                        <MdLocationOn size={16} />
                      </button>

                      {/* Delete row button */}
                      <button
                        type="button"
                        onClick={() => removeRequirementRow(idx)}
                        className="text-text-secondary hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-1"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>

                    {/* Location sub-row — visible only when override is active */}
                    {req.overrideLocation && (
                      <div className="flex items-center gap-2 flex-wrap ps-2">
                        {/* Network */}
                        <select
                          value={req.network}
                          onChange={e => updateRequirementRow(idx, 'network', e.target.value)}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default"
                        >
                          <option value="">{t('projects.createProject.network', 'רשת')}</option>
                          {referenceData.networks
                            .filter(v => v.isActive !== false)
                            .map(v => (
                              <option key={v.name} value={v.name}>{v.displayName || v.name}</option>
                            ))}
                        </select>

                        {/* Base */}
                        <select
                          value={req.base}
                          onChange={e => updateRequirementRow(idx, 'base', e.target.value)}
                          disabled={!req.network}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default disabled:opacity-50"
                        >
                          <option value="">{t('projects.createProject.base', 'בסיס')}</option>
                          {referenceData.locations
                            .filter(l => l.networkName === req.network)
                            .reduce<string[]>((acc, l) => acc.includes(l.baseName) ? acc : [...acc, l.baseName], [])
                            .map(name => {
                              const ref = referenceData.bases.find(b => b.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>

                        {/* Environment */}
                        <select
                          value={req.environment}
                          onChange={e => updateRequirementRow(idx, 'environment', e.target.value)}
                          disabled={!req.base}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default disabled:opacity-50"
                        >
                          <option value="">{t('projects.createProject.environment', 'סביבה')}</option>
                          {referenceData.locations
                            .filter(l => l.networkName === req.network && l.baseName === req.base)
                            .reduce<string[]>((acc, l) => acc.includes(l.environmentName) ? acc : [...acc, l.environmentName], [])
                            .map(name => {
                              const ref = referenceData.environments.find(e => e.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>

                        {/* Cluster */}
                        <select
                          value={req.cluster}
                          onChange={e => updateRequirementRow(idx, 'cluster', e.target.value)}
                          disabled={!req.environment}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default disabled:opacity-50"
                        >
                          <option value="">{t('projects.createProject.cluster', 'אשכול')}</option>
                          {referenceData.locations
                            .filter(l =>
                              l.networkName === req.network &&
                              l.baseName === req.base &&
                              l.environmentName === req.environment
                            )
                            .reduce<string[]>((acc, l) => acc.includes(l.clusterName) ? acc : [...acc, l.clusterName], [])
                            .map(name => {
                              const ref = referenceData.clusters.find(c => c.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>
                      </div>
                    )}
                  </div>
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors related to `CreateProjectModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/projects/CreateProjectModal.tsx
git commit -m "feat: add per-row location override toggle to inline requirements in CreateProjectModal"
```

---

## Task 3: Add `onCreated` callback to `CreateDemandModal`

**Files:**
- Modify: `client/src/components/projects/CreateDemandModal.tsx`

### Context

`CreateDemandModal` takes props `{ isOpen, onClose, onSubmit, editingDemand? }`. In create mode `handleSubmit` calls `createDemandGroup` directly and never calls `onSubmit`. A new optional `onCreated` prop signals successful creation to the caller.

- [ ] **Step 1: Add `onCreated` to the props interface**

Find the `CreateDemandModalProps` interface (lines 19–24):
```tsx
interface CreateDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) => Promise<void>;
  editingDemand?: Demand | null;
}
```
Replace with:
```tsx
interface CreateDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) => Promise<void>;
  editingDemand?: Demand | null;
  onCreated?: () => void;
}
```

- [ ] **Step 2: Destructure `onCreated` in the component signature**

Find:
```tsx
export default function CreateDemandModal({
  isOpen,
  onClose,
  onSubmit,
  editingDemand,
}: CreateDemandModalProps) {
```
Replace with:
```tsx
export default function CreateDemandModal({
  isOpen,
  onClose,
  onSubmit,
  editingDemand,
  onCreated,
}: CreateDemandModalProps) {
```

- [ ] **Step 3: Call `onCreated` after successful group creation**

In `handleSubmit`, find the create-mode success path (the `else` branch, around line 358–382). Find:
```tsx
        showToast(t('common.toast.demandCreated'), 'success');
      }
      handleClose();
```
Replace with:
```tsx
        showToast(t('common.toast.demandCreated'), 'success');
        onCreated?.();
      }
      handleClose();
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors related to `CreateDemandModal.tsx`.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/projects/CreateDemandModal.tsx
git commit -m "feat: add onCreated callback to CreateDemandModal for post-creation refresh signalling"
```

---

## Task 4: Fix "Add Requirement" button in `RequirementsView`

**Files:**
- Modify: `client/src/components/main/RequirementsView.tsx`

### Context

The button at line 428 currently calls `openModal('demand')` (global modal context). This opens `CreateDemandModal` via `GlobalModals`, but the list never refreshes because `onCreated` is not wired there. We add local `isCreatingDemand` state, wire the button to it, and render a local `CreateDemandModal` instance that resets the list on `onCreated`.

- [ ] **Step 1: Add `isCreatingDemand` state**

Find the existing sidebar/modal state block (around lines 79–83, near `selectedDemand`, `editingDemand`, `decisionDemand`):
```tsx
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
```
Add one line after it:
```tsx
  const [isCreatingDemand, setIsCreatingDemand] = useState(false);
```

- [ ] **Step 1b: Remove the now-unused `openModal` call and its import**

`openModal` is the only symbol used from `useModal` in this file. Remove both:

Line ~18 — delete the import:
```tsx
import { useModal } from '../../contexts/ModalContext';
```

Line ~46 — delete the hook call:
```tsx
  const { openModal } = useModal();
```

- [ ] **Step 2: Replace `openModal('demand')` with local state**

Find (line 428–434):
```tsx
          <button
            onClick={() => openModal('demand')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
          >
            <MdAdd size={15} />
            {t('requirements.addRequirement', '+ הוסף דרישה')}
          </button>
```
Replace with:
```tsx
          <button
            onClick={() => setIsCreatingDemand(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
          >
            <MdAdd size={15} />
            {t('requirements.addRequirement', '+ הוסף דרישה')}
          </button>
```

- [ ] **Step 3: Add the local `CreateDemandModal` for new demand creation**

Find the existing `editingDemand` modal block (around lines 520–527):
```tsx
      {editingDemand && (
        <CreateDemandModal
          isOpen={editingDemand !== null}
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}
```
Add the following block **directly after** it:
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

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors related to `RequirementsView.tsx`.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/main/RequirementsView.tsx
git commit -m "fix: wire Add Requirement button to local state so list refreshes after creation"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify inline requirements location toggle (CreateProjectModal)**

1. Open the app → navigate to Projects view → click "New Project".
2. Fill in required project fields (Name, Center, Branch, Section, Request Type, Priority, Network, Base, Environment, Cluster).
3. Scroll to "דרישות (אופציונלי)" section → click "הוסף דרישה" to add a row.
4. Confirm the row shows: Service | Resource | Value | Type | location-pin icon | delete icon.
5. Click the location-pin icon — confirm it turns primary-coloured and a sub-row appears with 4 selects (Network, Base, Environment, Cluster — Base/Env/Cluster disabled until previous is chosen).
6. Select a Network in the sub-row — confirm Base becomes enabled.
7. Select Base — confirm Environment becomes enabled.
8. Select Environment — confirm Cluster becomes enabled.
9. Click the location-pin icon again — confirm sub-row disappears and icon reverts to muted.
10. Add a second row, leave its location on default (no override).
11. Fill both rows fully, submit the project — confirm both requirements are created (check requirements table or server logs).

- [ ] **Step 3: Verify "Add Requirement" button refreshes list (RequirementsView)**

1. Navigate to the Requirements tab.
2. Note the current number of visible requirements.
3. Click "+ הוסף דרישה".
4. Confirm a `CreateDemandModal` opens (Project selector visible, not pre-filled with an editing demand).
5. Fill in: Project, Service, Resource/Value, Type → submit.
6. Confirm a success toast appears.
7. Confirm the requirements list reloads from page 1 and the new requirement is visible.

- [ ] **Step 4: Commit verification notes (no code change needed)**

If all checks pass, no additional commit required. The feature branch is ready to merge to `dev`.

---

## Task 6: Update WORK_LOG

**Files:**
- Modify: `WORK_LOG.md`

- [ ] **Step 1: Append a new sprint entry to `WORK_LOG.md`**

Add the following at the end of the file:

```markdown
---

## Requirements Location & Create Button Fix

Branch: `feature/requirements-location-create-button`
Started: 2026-06-01

| Task | Area | Status |
|------|------|--------|
| 1 | InlineRequirement state + submit logic | ✅ Done |
| 2 | Per-row location toggle UI | ✅ Done |
| 3 | CreateDemandModal onCreated prop | ✅ Done |
| 4 | RequirementsView button fix | ✅ Done |

### 2026-06-01

**feature/requirements-location-create-button**
- `CreateProjectModal`: extended `InlineRequirement` with `overrideLocation`, `network`, `base`, `environment`, `cluster`; `updateRequirementRow` now cascades resets on location field changes; each row gains a location-pin toggle button revealing a 4-level cascade sub-row; submit resolves per-row `locationId` (falls back to project location if override is off or incomplete)
- `CreateDemandModal`: added optional `onCreated?: () => void` prop; called after successful `createDemandGroup` in create mode
- `RequirementsView`: replaced `openModal('demand')` with local `isCreatingDemand` state; local `CreateDemandModal` instance resets page + accumulated demands via `onCreated` callback
```

- [ ] **Step 2: Commit**

```bash
git add WORK_LOG.md
git commit -m "docs: update work log for requirements location and create button fix"
```
