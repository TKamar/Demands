# Sub-Project B: 3-Level Table Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Projects table from Project → flat demands to Project → Service group → Resource rows, with Edit/Delete per service group, Quick Approve, and Deep Decision for moderators.

**Architecture:** Extract `DemandSubTable` to its own file and refactor it in place. Demands are grouped client-side by `serviceName`. Two new modal components — `ManageServiceDemandsModal` and `ServiceDecisionModal` — handle the Edit and Deep Decision actions. `ServiceDecisionModal` mirrors the existing `DecisionModal` pattern extended to multiple demands.

**Tech Stack:** React 18, TypeScript, react-icons/md, react-i18next, existing `useDemands` hook, `fetchDemands` / `approveDemand` / `rejectDemand` / `deleteDemand` / `transferDemand` from `apiService.ts`.

---

## File Map

| File | Role |
|------|------|
| `client/src/components/main/ProjectsAccordion.tsx` | Remove inline `DemandSubTable`; import from new file |
| `client/src/components/main/DemandSubTable.tsx` | New — extracted + refactored to 3-level structure with all service-row logic |
| `client/src/components/projects/CreateDemandModal.tsx` | Add `defaultProjectName?` and `defaultServiceName?` props |
| `client/src/components/projects/ManageServiceDemandsModal.tsx` | New — Edit action: manage resources in a service group |
| `client/src/components/management/ServiceDecisionModal.tsx` | New — Deep Decision: per-resource approve/reject with transfer path |

---

## Task 1: Create Branch + Extract DemandSubTable

**Files:**
- Modify: `client/src/components/main/ProjectsAccordion.tsx`
- Create: `client/src/components/main/DemandSubTable.tsx`

### Context

`DemandSubTable` is an inline function component in `ProjectsAccordion.tsx` (lines 154–375). This task moves it to its own file verbatim so Task 3 can refactor it in isolation. `ProjectsAccordion.tsx` then imports the extracted component.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout dev && git pull
git checkout -b feature/sub-project-b-accordion
```

- [ ] **Step 2: Create `DemandSubTable.tsx` with all required imports**

Create `client/src/components/main/DemandSubTable.tsx` with the following content (this is the verbatim `DemandSubTable` function moved out of `ProjectsAccordion.tsx`, with its own imports):

```tsx
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { MdEdit, MdDelete, MdCancel, MdGavel } from 'react-icons/md';
import MoreActionsMenu from '../common/MoreActionsMenu';
import type { MoreAction } from '../common/MoreActionsMenu';
import { useDemands } from '../../hooks/useDemands';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import DecisionModal from '../management/DecisionModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type {
  CreateDemandPayload,
  UpdateDemandPayload,
  ApproveDemandPayload,
  RejectDemandPayload,
} from '../../api/types';

export const ACTIVE_STATUSES = new Set(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite']);
export const TERMINAL_STATUSES = new Set(['Approved', 'PartiallyApproved', 'ApprovedWithCondition', 'Rejected', 'CenterManagerRejected', 'Cancelled']);

export interface DemandSubTableProps {
  projectName: string;
  canDecide: boolean;
  mode?: 'active' | 'history';
  createdBy?: string;
}

export default function DemandSubTable({
  projectName,
  canDecide,
  mode = 'active',
  createdBy,
}: DemandSubTableProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const currentUsername = auth.user?.profile.preferred_username ?? '';

  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decidingDemand, setDecidingDemand] = useState<Demand | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);

  const { demands: allDemands, isLoading, updateDemand, deleteDemand, cancelDemand, approveDemand, rejectDemand } = useDemands(
    { projectName, createdBy },
    { page: 1, limit: 100 }
  );

  const demands = useMemo(
    () => allDemands.filter(d => mode === 'history' ? TERMINAL_STATUSES.has(d.status) : ACTIVE_STATUSES.has(d.status)),
    [allDemands, mode]
  );

  async function handleSubmitDemand(payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) {
    if (demandId) {
      await updateDemand(demandId, payload as UpdateDemandPayload);
      setEditingDemand(null);
    }
  }

  async function handleDeleteDemand(demand: Demand) {
    if (!window.confirm(t('demand.deleteConfirm', 'Delete this requirement?'))) return;
    try {
      await deleteDemand(demand.id);
      showToast(t('demand.deleted', 'Requirement deleted'), 'success');
    } catch {
      showToast(t('demand.deleteError', 'Failed to delete requirement'), 'error');
    }
  }

  async function handleCancelDemand(demand: Demand) {
    if (!window.confirm(t('demand.cancelConfirm', 'Cancel this requirement?'))) return;
    try {
      await cancelDemand(demand.id);
      showToast(t('demand.cancelled', 'Requirement cancelled'), 'success');
    } catch {
      showToast(t('demand.cancelError', 'Failed to cancel requirement'), 'error');
    }
  }

  async function handleApprove(payload: ApproveDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await approveDemand(decidingDemand.id, payload);
      showToast(t('management.success.approved'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  async function handleReject(payload: RejectDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await rejectDemand(decidingDemand.id, payload);
      showToast(t('management.success.rejected'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  function buildActions(demand: Demand): MoreAction[] {
    const isPending = demand.status === 'Pending';
    const isOwner = demand.createdBy === currentUsername;
    if (canDecide) {
      if (!isPending) return [];
      return [
        { label: t('management.decide', 'Decide'), icon: <MdGavel size={12} />, onClick: () => setDecidingDemand(demand) },
        { label: t('common.delete', 'Delete'), icon: <MdDelete size={12} />, danger: true, onClick: () => handleDeleteDemand(demand) },
      ];
    }
    if (!isPending || !isOwner) return [];
    return [
      { label: t('common.edit', 'Edit'), icon: <MdEdit size={12} />, onClick: () => setEditingDemand(demand) },
      { label: t('common.cancel', 'Cancel'), icon: <MdCancel size={12} />, danger: true, onClick: () => handleCancelDemand(demand) },
    ];
  }

  if (isLoading) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary border-t border-dashed border-primary/30">
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  if (demands.length === 0) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary italic border-t border-dashed border-primary/30">
        {t('demands.empty', 'No requirements')}
      </div>
    );
  }

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/[0.02]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-primary/5 text-text-secondary">
            <th className="ps-12 pe-3 py-2 text-start font-semibold">{t('demand.service', 'Service')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.resource', 'Resource')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.value', 'Value')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.status', 'Status')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('common.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {demands.map((demand) => {
            const rowActions = buildActions(demand);
            return (
              <tr
                key={demand.id}
                className="border-t border-divider/50 hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => setSelectedDemand(demand)}
              >
                <td className="ps-12 pe-3 py-2 text-text-primary">{demand.serviceName}</td>
                <td className="px-3 py-2 text-text-secondary">{demand.resourceName}</td>
                <td className="px-3 py-2 font-medium">{demand.value.toLocaleString()}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <span className={`text-[10px] font-medium ${
                    demand.status === 'Approved' ? 'text-green-700'
                    : demand.status === 'Pending' ? 'text-amber-600'
                    : demand.status === 'Rejected' ? 'text-red-600'
                    : demand.status === 'PartiallyApproved' ? 'text-blue-600'
                    : 'text-gray-500'
                  }`}>
                    {demand.status}
                  </span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <MoreActionsMenu actions={rowActions} size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        onEdit={(d) => { setEditingDemand(d); setSelectedDemand(null); }}
        isModerator={canDecide}
        onMakeDecision={canDecide ? (d) => { setDecidingDemand(d); setSelectedDemand(null); } : undefined}
      />

      {editingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <DecisionModal
        open={decidingDemand !== null}
        onClose={() => setDecidingDemand(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        demand={decidingDemand}
        isLoading={isDecisionLoading}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update `ProjectsAccordion.tsx` to import from the new file**

In `ProjectsAccordion.tsx`:

1. Delete the `ACTIVE_STATUSES` and `TERMINAL_STATUSES` constant lines (lines 150–151).
2. Delete the entire `DemandSubTable` function (lines 154–375).
3. Add this import near the top (after the existing imports):
```tsx
import DemandSubTable from './DemandSubTable';
```

The `<DemandSubTable ... />` JSX at line 689 stays unchanged.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. `ProjectsAccordion` renders identically to before.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/main/DemandSubTable.tsx \
  client/src/components/main/ProjectsAccordion.tsx
git commit -m "refactor: extract DemandSubTable to its own file"
```

---

## Task 2: Add Default Props to `CreateDemandModal`

**Files:**
- Modify: `client/src/components/projects/CreateDemandModal.tsx`

### Context

`ManageServiceDemandsModal` (Task 4) opens `CreateDemandModal` in create mode with the project and service pre-filled. This requires two new optional props on `CreateDemandModal`: `defaultProjectName` and `defaultServiceName`. They pre-populate the form when the modal opens in create mode.

- [ ] **Step 1: Add props to `CreateDemandModalProps`**

Find the `CreateDemandModalProps` interface. Add two optional props:
```tsx
interface CreateDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) => Promise<void>;
  editingDemand?: Demand | null;
  onCreated?: () => void;
  defaultProjectName?: string;
  defaultServiceName?: string;
}
```

- [ ] **Step 2: Destructure new props**

Find the component signature:
```tsx
export default function CreateDemandModal({
  isOpen,
  onClose,
  onSubmit,
  editingDemand,
  onCreated,
}: CreateDemandModalProps) {
```
Add the two new props:
```tsx
export default function CreateDemandModal({
  isOpen,
  onClose,
  onSubmit,
  editingDemand,
  onCreated,
  defaultProjectName,
  defaultServiceName,
}: CreateDemandModalProps) {
```

- [ ] **Step 3: Apply defaults in the create-mode reset branch**

Find the `useEffect` that resets the form when not in edit mode:
```tsx
    } else if (!editingDemand && isOpen) {
      setForm(initialForm);
      setResourceRows([{ id: newRowId(), resourceName: '', value: '', unit: '' }]);
    }
```
Replace with:
```tsx
    } else if (!editingDemand && isOpen) {
      setForm({
        ...initialForm,
        project: defaultProjectName ?? '',
        service: defaultServiceName ?? '',
      });
      setResourceRows([{ id: newRowId(), resourceName: '', value: '', unit: '' }]);
    }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/projects/CreateDemandModal.tsx
git commit -m "feat: add defaultProjectName and defaultServiceName props to CreateDemandModal"
```

---

## Task 3: Refactor `DemandSubTable` to 3-Level Structure

**Files:**
- Modify: `client/src/components/main/DemandSubTable.tsx`

### Context

Replace the flat demand table with a grouped 2-level view (Service rows → Resource rows). Service rows have Edit / Delete / Quick Approve / Deep Decision actions. Resource rows are click-to-sidebar only. `ManageServiceDemandsModal` and `ServiceDecisionModal` are stubs at this stage (wired in Tasks 4 and 5).

- [ ] **Step 1: Replace the entire contents of `DemandSubTable.tsx`**

```tsx
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore, MdChevronLeft, MdEdit, MdDelete, MdGavel } from 'react-icons/md';
import ConfirmDialog from '../common/ConfirmDialog';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import { useDemands } from '../../hooks/useDemands';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload } from '../../api/types';

export const ACTIVE_STATUSES = new Set(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite']);
export const TERMINAL_STATUSES = new Set(['Approved', 'PartiallyApproved', 'ApprovedWithCondition', 'Rejected', 'CenterManagerRejected', 'Cancelled']);

function statusColor(status: string): string {
  if (['Approved', 'PartiallyApproved', 'ApprovedWithCondition'].includes(status)) return 'text-green-700';
  if (['Rejected', 'CenterManagerRejected'].includes(status)) return 'text-red-600';
  if (['Pending', 'PendingCenterManager', 'WaitingOnPrerequisite'].includes(status)) return 'text-amber-600';
  if (status === 'Cancelled') return 'text-gray-400';
  return 'text-text-secondary';
}

export interface DemandSubTableProps {
  projectName: string;
  canDecide: boolean;
  mode?: 'active' | 'history';
  createdBy?: string;
}

export default function DemandSubTable({
  projectName,
  canDecide,
  mode = 'active',
  createdBy,
}: DemandSubTableProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { demands: allDemands, isLoading, deleteDemand, approveDemand, rejectDemand } = useDemands(
    { projectName, createdBy },
    { page: 1, limit: 100 }
  );

  const demands = useMemo(
    () => allDemands.filter(d =>
      mode === 'history' ? TERMINAL_STATUSES.has(d.status) : ACTIVE_STATUSES.has(d.status)
    ),
    [allDemands, mode]
  );

  // Group demands by serviceName
  const serviceGroups = useMemo(() => {
    const groups = new Map<string, Demand[]>();
    for (const demand of demands) {
      const list = groups.get(demand.serviceName) ?? [];
      groups.set(demand.serviceName, [...list, demand]);
    }
    return groups;
  }, [demands]);

  // Service row expand state
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const toggleService = useCallback((name: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  // Resource row sidebar
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  // Delete group confirm
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<string | null>(null);
  const handleConfirmDeleteGroup = useCallback(async () => {
    if (!deleteServiceTarget) return;
    const group = serviceGroups.get(deleteServiceTarget) ?? [];
    setDeleteServiceTarget(null);
    const results = await Promise.allSettled(group.map(d => deleteDemand(d.id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`${results.length - failed} נמחקו, ${failed} נכשלו`, 'error');
    } else {
      showToast(t('service.deleteGroupSuccess', 'כל הדרישות נמחקו'), 'success');
    }
  }, [deleteServiceTarget, serviceGroups, deleteDemand, showToast, t]);

  // Quick approve confirm
  const [quickApproveTarget, setQuickApproveTarget] = useState<string | null>(null);
  const handleConfirmQuickApprove = useCallback(async () => {
    if (!quickApproveTarget) return;
    const group = serviceGroups.get(quickApproveTarget) ?? [];
    const pending = group.filter(d => ACTIVE_STATUSES.has(d.status));
    setQuickApproveTarget(null);
    const results = await Promise.allSettled(
      pending.map(d =>
        approveDemand(d.id, { status: 'Approved', approvedValue: d.value } as ApproveDemandPayload)
      )
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`${pending.length - failed} אושרו, ${failed} נכשלו`, 'error');
    } else {
      showToast(t('service.quickApproveSuccess', 'כל הדרישות אושרו'), 'success');
    }
  }, [quickApproveTarget, serviceGroups, approveDemand, showToast, t]);

  // Edit (Manage) modal target — wired in Task 4
  const [managingServiceName, setManagingServiceName] = useState<string | null>(null);

  // Deep Decision modal target — wired in Task 5
  const [decidingServiceName, setDecidingServiceName] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary border-t border-dashed border-primary/30">
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  if (serviceGroups.size === 0) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary italic border-t border-dashed border-primary/30">
        {t('demands.empty', 'No requirements')}
      </div>
    );
  }

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/[0.02]">
      {Array.from(serviceGroups.entries()).map(([svcName, svcDemands]) => {
        const isExpanded = expandedServices.has(svcName);
        return (
          <div key={svcName} className="border-b border-divider/30 last:border-0">
            {/* ── Service row (Level 2) ── */}
            <div className="flex items-center gap-2 px-4 py-2 ps-8 bg-primary/[0.04] hover:bg-primary/[0.07] transition-colors">
              <button
                onClick={() => toggleService(svcName)}
                className="w-5 shrink-0 flex items-center justify-center text-primary bg-transparent border-none cursor-pointer p-0"
              >
                {isExpanded ? <MdExpandMore size={16} /> : <MdChevronLeft size={16} />}
              </button>
              <span className="flex-1 text-sm font-semibold text-text-primary">{svcName}</span>
              <span className="text-xs text-text-secondary me-2">
                ({svcDemands.length} {t('service.resources', 'resources')})
              </span>
              {/* Actions */}
              <div className="flex items-center gap-1">
                <span className="relative group">
                  <button
                    onClick={() => setManagingServiceName(svcName)}
                    className="p-1 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer rounded"
                  >
                    <MdEdit size={14} />
                  </button>
                  <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                    {t('common.edit', 'Edit')}
                  </span>
                </span>
                <span className="relative group">
                  <button
                    onClick={() => setDeleteServiceTarget(svcName)}
                    className="p-1 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer rounded"
                  >
                    <MdDelete size={14} />
                  </button>
                  <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                    {t('common.delete', 'Delete')}
                  </span>
                </span>
                {canDecide && (
                  <>
                    <span className="relative group">
                      <button
                        onClick={() => setQuickApproveTarget(svcName)}
                        className="px-2 py-0.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded border-none cursor-pointer transition-colors"
                      >
                        ⚡
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('service.quickApprove', 'Quick Approve')}
                      </span>
                    </span>
                    <span className="relative group">
                      <button
                        onClick={() => setDecidingServiceName(svcName)}
                        className="px-2 py-0.5 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-950 rounded border-none cursor-pointer transition-colors flex items-center"
                      >
                        <MdGavel size={12} />
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('service.deepDecision', 'Deep Decision')}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* ── Resource rows (Level 3) ── */}
            {isExpanded && svcDemands.map(demand => (
              <div
                key={demand.id}
                onClick={() => setSelectedDemand(demand)}
                className="flex items-center gap-3 px-4 py-1.5 ps-16 border-t border-divider/20 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <span className="flex-1 text-xs text-text-primary">{demand.resourceName}</span>
                <span className="w-24 text-xs text-text-secondary">
                  {demand.value.toLocaleString()} {demand.unit}
                </span>
                <span className={`text-[10px] font-medium w-28 ${statusColor(demand.status)}`}>
                  {demand.status}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        isModerator={canDecide}
      />

      <ConfirmDialog
        isOpen={deleteServiceTarget !== null}
        title={t('service.deleteGroupTitle', 'מחיקת שירות')}
        message={t('service.deleteGroupMessage', 'מחיקת כל הדרישות בשירות זה היא בלתי הפיכה. להמשיך?')}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setDeleteServiceTarget(null)}
        danger
      />

      <ConfirmDialog
        isOpen={quickApproveTarget !== null}
        title={t('service.quickApproveTitle', 'אישור מהיר')}
        message={t('service.quickApproveMessage', 'לאשר את כל הדרישות הממתינות בשירות זה בכמות המבוקשת?')}
        onConfirm={handleConfirmQuickApprove}
        onCancel={() => setQuickApproveTarget(null)}
      />

      {/* ManageServiceDemandsModal placeholder — wired in Task 4 */}
      {managingServiceName !== null && (
        <div style={{ display: 'none' }} />
      )}

      {/* ServiceDecisionModal placeholder — wired in Task 5 */}
      {decidingServiceName !== null && (
        <div style={{ display: 'none' }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. `rejectDemand` is destructured but unused at this stage — TypeScript does not error on unused destructured variables.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/main/DemandSubTable.tsx
git commit -m "feat: refactor DemandSubTable to 3-level service/resource accordion"
```

---

## Task 4: Create `ManageServiceDemandsModal` + Wire into `DemandSubTable`

**Files:**
- Create: `client/src/components/projects/ManageServiceDemandsModal.tsx`
- Modify: `client/src/components/main/DemandSubTable.tsx`

### Context

`ManageServiceDemandsModal` lets users manage the resources (demands) within a single service group of a project. It fetches demands filtered by `projectName + serviceName`, lists them with per-row Edit and Delete, and has an "Add Resource" button that opens `CreateDemandModal` with project and service pre-filled.

Uses the same abort-guarded fetch pattern as `CreateProjectModal`'s edit-mode demands section: `useRef<AbortController | null>` + refresh callback.

- [ ] **Step 1: Create `ManageServiceDemandsModal.tsx`**

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import CreateDemandModal from './CreateDemandModal';
import { fetchDemands, deleteDemand as apiDeleteDemand, updateDemand as apiUpdateDemand } from '../../api/apiService';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type { CreateDemandPayload, UpdateDemandPayload } from '../../api/types';

const TERMINAL_STATUSES = new Set([
  'Approved', 'PartiallyApproved', 'ApprovedWithCondition',
  'Rejected', 'CenterManagerRejected', 'Cancelled',
]);

interface ManageServiceDemandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  serviceName: string;
}

export default function ManageServiceDemandsModal({
  isOpen,
  onClose,
  projectName,
  serviceName,
}: ManageServiceDemandsModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [isAddingDemand, setIsAddingDemand] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<Demand | null>(null);

  const refreshControllerRef = useRef<AbortController | null>(null);

  const refreshDemands = useCallback(async () => {
    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    setIsLoading(true);
    try {
      const res = await fetchDemands({ projectName, serviceName, page: 1, limit: 200 }, controller.signal);
      if (!controller.signal.aborted) setDemands(res.data);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [projectName, serviceName]);

  useEffect(() => {
    if (!isOpen) { setDemands([]); return; }
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    setIsLoading(true);
    fetchDemands({ projectName, serviceName, page: 1, limit: 200 }, controller.signal)
      .then(res => { if (!controller.signal.aborted) setDemands(res.data); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [isOpen, projectName, serviceName]);

  useEffect(() => {
    return () => { refreshControllerRef.current?.abort(); };
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!demandToDelete) return;
    const target = demandToDelete;
    setDemandToDelete(null);
    try {
      await apiDeleteDemand(target.id);
      await refreshDemands();
      showToast(t('demand.deleted', 'Requirement deleted'), 'success');
    } catch {
      showToast(t('demand.deleteError', 'Failed to delete requirement'), 'error');
    }
  }, [demandToDelete, refreshDemands, showToast, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('service.manage', 'ניהול דרישות')} — ${serviceName}`}
    >
      <div className="flex flex-col gap-4" dir="rtl">
        {isLoading && (
          <p className="text-sm text-text-secondary">{t('common.loading', 'טוען...')}</p>
        )}

        {!isLoading && demands.length === 0 && (
          <p className="text-sm text-text-secondary italic">{t('demands.empty', 'אין דרישות')}</p>
        )}

        {demands.length > 0 && (
          <div className="space-y-2">
            {demands.map(demand => {
              const isTerminal = TERMINAL_STATUSES.has(demand.status);
              return (
                <div key={demand.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium text-text-primary truncate">{demand.resourceName}</span>
                  <span className="w-20 text-text-secondary">{demand.value} {demand.unit}</span>
                  <span className="w-24 text-xs text-text-secondary">{demand.type}</span>
                  <span className={`w-28 text-xs font-medium ${
                    demand.status === 'Approved' ? 'text-green-700'
                    : demand.status === 'Rejected' ? 'text-red-600'
                    : 'text-amber-600'
                  }`}>{demand.status}</span>
                  <button
                    type="button"
                    onClick={() => { if (!isTerminal) setEditingDemand(demand); }}
                    disabled={isTerminal}
                    className="p-1 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded"
                  >
                    <MdEdit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!isTerminal) setDemandToDelete(demand); }}
                    disabled={isTerminal}
                    className="p-1 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded"
                  >
                    <MdDelete size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsAddingDemand(true)}
          className="flex items-center gap-1 self-start text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
        >
          <MdAdd size={15} />
          {t('service.addResource', 'הוסף משאב')}
        </button>
      </div>

      {isAddingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setIsAddingDemand(false)}
          onSubmit={async () => {}}
          onCreated={async () => {
            await refreshDemands();
            setIsAddingDemand(false);
          }}
          defaultProjectName={projectName}
          defaultServiceName={serviceName}
        />
      )}

      {editingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setEditingDemand(null)}
          onSubmit={async (payload, demandId) => {
            if (!demandId) return;
            await apiUpdateDemand(demandId, payload as UpdateDemandPayload);
            await refreshDemands();
            setEditingDemand(null);
          }}
          editingDemand={editingDemand}
        />
      )}

      <ConfirmDialog
        isOpen={demandToDelete !== null}
        title={t('demand.deleteTitle', 'מחיקת דרישה')}
        message={t('demand.deleteMessage', 'למחוק דרישה זו לצמיתות?')}
        onConfirm={confirmDelete}
        onCancel={() => setDemandToDelete(null)}
        danger
      />
    </Modal>
  );
}
```

- [ ] **Step 2: Wire `ManageServiceDemandsModal` into `DemandSubTable`**

In `DemandSubTable.tsx`:

Add import:
```tsx
import ManageServiceDemandsModal from '../projects/ManageServiceDemandsModal';
```

Replace the manage placeholder:
```tsx
      {/* ManageServiceDemandsModal placeholder — wired in Task 4 */}
      {managingServiceName !== null && (
        <div style={{ display: 'none' }} />
      )}
```
with:
```tsx
      {managingServiceName !== null && (
        <ManageServiceDemandsModal
          isOpen={true}
          onClose={() => setManagingServiceName(null)}
          projectName={projectName}
          serviceName={managingServiceName}
        />
      )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/projects/ManageServiceDemandsModal.tsx \
  client/src/components/main/DemandSubTable.tsx
git commit -m "feat: add ManageServiceDemandsModal and wire into DemandSubTable"
```

---

## Task 5: Create `ServiceDecisionModal` + Wire into `DemandSubTable`

**Files:**
- Create: `client/src/components/management/ServiceDecisionModal.tsx`
- Modify: `client/src/components/main/DemandSubTable.tsx`

### Context

`ServiceDecisionModal` mirrors `DecisionModal`'s UX (select → manual | transfer path) extended to multiple demands simultaneously. Manual path shows one decision row per demand (resource). Transfer path calls `transferDemand` for all demands in the group. Follows the exact same state machine (`select | manual | transfer`) as `DecisionModal`.

- [ ] **Step 1: Create `ServiceDecisionModal.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { useReferenceData } from '../../hooks/useReferenceData';
import { transferDemand } from '../../api/apiService';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

type DecisionPath = 'select' | 'manual' | 'transfer';
type DemandAction = '' | 'Approved' | 'Rejected' | 'ApprovedWithCondition';

interface DemandDecision {
  action: DemandAction;
  approvedValue?: number;
  reason?: string;
}

interface ServiceDecisionModalProps {
  open: boolean;
  onClose: () => void;
  demands: Demand[];
  serviceName: string;
  projectName: string;
  onApprove: (id: number, payload: ApproveDemandPayload) => Promise<void>;
  onReject: (id: number, payload: RejectDemandPayload) => Promise<void>;
  onSuccess?: () => void;
}

export default function ServiceDecisionModal({
  open,
  onClose,
  demands,
  serviceName,
  projectName,
  onApprove,
  onReject,
  onSuccess,
}: ServiceDecisionModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { services } = useReferenceData();

  const [path, setPath] = useState<DecisionPath>('select');
  const [decisions, setDecisions] = useState<Record<number, DemandDecision>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer path state
  const [targetService, setTargetService] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => {
    if (open) {
      setPath('select');
      setDecisions({});
      setTargetService('');
      setTransferNotes('');
    }
    setIsSubmitting(false);
  }, [open, demands]);

  const setDecisionField = (
    demandId: number,
    field: keyof DemandDecision,
    value: string | number | undefined
  ) => {
    setDecisions(prev => ({
      ...prev,
      [demandId]: { ...((prev[demandId] ?? { action: '' }) as DemandDecision), [field]: value },
    }));
  };

  const actionableCount = demands.filter(d => decisions[d.id]?.action && decisions[d.id]?.action !== '').length;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionableCount === 0) return;
    setIsSubmitting(true);
    try {
      const actionable = demands.filter(d => decisions[d.id]?.action && decisions[d.id]?.action !== '');
      await Promise.allSettled(
        actionable.map(d => {
          const dec = decisions[d.id];
          if (dec.action === 'Rejected') {
            return onReject(d.id, { reason: dec.reason ?? '' });
          }
          return onApprove(d.id, {
            status: dec.action as 'Approved' | 'ApprovedWithCondition',
            approvedValue: dec.approvedValue,
            reason: dec.reason,
          });
        })
      );
      showToast(t('management.success.decided', 'החלטות נשמרו'), 'success');
      onSuccess?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetService) return;
    setIsSubmitting(true);
    try {
      await Promise.allSettled(demands.map(d => transferDemand(d.id, targetService)));
      showToast(t('management.success.transferred', 'הדרישות הועברו בהצלחה'), 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.transferFailed', 'העברה נכשלה'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableServices = services.filter(
    s => s.isActive !== false && s.name !== serviceName
  );

  const serviceInfo = (
    <div className="bg-gray-50 rounded-xl p-4 mb-5">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-text-secondary">{t('projects.columns.project')}:</span>{' '}
          <span className="font-medium">{projectName}</span>
        </div>
        <div>
          <span className="text-text-secondary">{t('projects.columns.service')}:</span>{' '}
          <span className="font-medium">{serviceName}</span>
        </div>
        <div>
          <span className="text-text-secondary">{t('service.resources', 'Resources')}:</span>{' '}
          <span className="font-medium">{demands.length}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('management.decisionModal.title', 'קבלת החלטה')}
    >
      {serviceInfo}

      {path === 'select' && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setPath('manual')}
            className="w-full p-4 text-start border-2 border-divider rounded-xl hover:border-primary hover:bg-primary-light/20 transition-colors cursor-pointer bg-bg-paper"
          >
            <div className="font-medium text-text-primary">
              {t('management.decisionModal.manualDecision', 'קבלת החלטה ידנית')}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {t('management.decisionModal.manualDecisionDesc', 'אשר, דחה, או אשר באופן מותנה')}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPath('transfer')}
            className="w-full p-4 text-start border-2 border-divider rounded-xl hover:border-primary hover:bg-primary-light/20 transition-colors cursor-pointer bg-bg-paper"
          >
            <div className="font-medium text-text-primary">
              {t('management.decisionModal.transfer', 'העברה למנהל שירות אחר')}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {t('management.decisionModal.transferDesc', 'העבר את הדרישות לטיפול שירות אחר')}
            </div>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-100 text-text-primary rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {path === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3" dir="rtl">
            {demands.map(demand => {
              const dec = decisions[demand.id] ?? { action: '' as DemandAction };
              const showValueInput = dec.action === 'Approved' || dec.action === 'ApprovedWithCondition';
              const showReasonInput = dec.action !== '';
              return (
                <div key={demand.id} className="border border-divider rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-text-primary flex-1">{demand.resourceName}</span>
                    <span className="text-text-secondary">{demand.value} {demand.unit}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={dec.action}
                      onChange={e => setDecisionField(demand.id, 'action', e.target.value as DemandAction)}
                      className="flex-1 px-3 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      dir="rtl"
                    >
                      <option value="">{t('decision.selectPlaceholder', 'בחר החלטה')}</option>
                      <option value="Approved">{t('decision.approve', 'אישור')}</option>
                      <option value="Rejected">{t('decision.reject', 'דחיה')}</option>
                      <option value="ApprovedWithCondition">{t('decision.conditionalApproval', 'אישור מותנה')}</option>
                    </select>
                    {showValueInput && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={dec.approvedValue ?? ''}
                          onChange={e => setDecisionField(demand.id, 'approvedValue', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder={String(demand.value)}
                          className="w-24 px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                        />
                        <span className="text-xs text-text-secondary">{demand.unit}</span>
                      </div>
                    )}
                  </div>
                  {showReasonInput && (
                    <textarea
                      value={dec.reason ?? ''}
                      onChange={e => setDecisionField(demand.id, 'reason', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-divider rounded-lg bg-bg-default resize-none"
                      dir="rtl"
                      placeholder={t('decision.reasonPlaceholder', 'הזן סיבה...')}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-secondary" dir="rtl">
            {demands.length - actionableCount > 0 &&
              `${demands.length - actionableCount} ${t('service.noDecisionNote', 'דרישות ללא החלטה יישארו בסטטוס הנוכחי')}`
            }
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPath('select')}
              className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
            >
              {t('common.back', 'חזור')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || actionableCount === 0}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block me-2" />
              ) : null}
              {t('management.decisionModal.submit', 'שמור החלטות')} ({actionableCount})
            </button>
          </div>
        </form>
      )}

      {path === 'transfer' && (
        <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('management.decisionModal.targetService', 'שירות יעד')} <span className="text-danger">*</span>
            </label>
            <select
              value={targetService}
              onChange={e => setTargetService(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
              dir="rtl"
            >
              <option value="">{t('management.decisionModal.selectService', 'בחר שירות')}</option>
              {availableServices.map(s => (
                <option key={s.name} value={s.name}>{s.displayName ?? s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('management.decisionModal.transferNotes', 'הערות')}
            </label>
            <textarea
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default resize-none"
              dir="rtl"
              placeholder={t('management.decisionModal.transferNotesPlaceholder', 'הערות להעברה (אופציונלי)...')}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPath('select')}
              className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
            >
              {t('common.back', 'חזור')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetService}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : t('management.decisionModal.transferSubmit', 'העבר')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Wire `ServiceDecisionModal` into `DemandSubTable`**

In `DemandSubTable.tsx`:

Add import:
```tsx
import ServiceDecisionModal from '../management/ServiceDecisionModal';
```

Replace the decision placeholder:
```tsx
      {/* ServiceDecisionModal placeholder — wired in Task 5 */}
      {decidingServiceName !== null && (
        <div style={{ display: 'none' }} />
      )}
```
with:
```tsx
      {decidingServiceName !== null && (() => {
        const svcDemands = serviceGroups.get(decidingServiceName) ?? [];
        return (
          <ServiceDecisionModal
            open={true}
            onClose={() => setDecidingServiceName(null)}
            demands={svcDemands}
            serviceName={decidingServiceName}
            projectName={projectName}
            onApprove={(id, payload) => approveDemand(id, payload)}
            onReject={(id, payload) => rejectDemand(id, payload)}
            onSuccess={() => setDecidingServiceName(null)}
          />
        );
      })()}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/management/ServiceDecisionModal.tsx \
  client/src/components/main/DemandSubTable.tsx
git commit -m "feat: add ServiceDecisionModal (deep decision) and wire into DemandSubTable"
```

---

## Task 6: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify 3-level accordion structure**

1. Log in as any user.
2. Navigate to a panel showing the Projects table.
3. Expand a project that has demands — confirm service rows appear (not flat demands).
4. Confirm each service row shows: service name, `(N resources)`, Edit/Delete buttons.
5. Expand a service row — confirm resource rows appear: Resource name | Value | Status (colored text, no background fill).
6. Click a resource row — confirm `DemandDetailSidebar` opens.

- [ ] **Step 3: Verify service row actions**

1. Click **Edit** on a service row — confirm `ManageServiceDemandsModal` opens with the correct service's resources listed.
2. In the modal: click Edit on a resource → `CreateDemandModal` opens pre-filled. Close it.
3. Click **Add Resource** → `CreateDemandModal` opens with project and service pre-filled.
4. Click **Delete** on a service row → `ConfirmDialog` appears. Cancel it.

- [ ] **Step 4: Verify admin/moderator actions**

1. Log in as `admin1` or `mod1`.
2. Navigate to Approval Requests → Projects, expand a project with pending demands.
3. Confirm ⚡ Quick Approve and ⚖️ Deep Decision buttons appear on service rows.
4. Click **Quick Approve** → confirm dialog appears; cancel.
5. Click **Deep Decision** → confirm `ServiceDecisionModal` opens with "select" path shown.
6. Click "Manual Decision" → confirm one row per resource with decision dropdowns.
7. Select Approved for one resource, set an approved quantity, click Submit — confirm toast and modal closes.
8. Click **Deep Decision** again → click "Transfer" → confirm target service selector appears.

- [ ] **Step 5: Verify regular user does NOT see Quick Approve or Deep Decision**

1. Log in as `user1`.
2. Navigate to My Requests → Projects.
3. Expand a project — confirm service rows show only Edit and Delete, no ⚡ or ⚖️ buttons.

---

## Task 7: WORK_LOG Update

**Files:**
- Modify: `WORK_LOG.md`

- [ ] **Step 1: Append sprint entry to `WORK_LOG.md`**

```markdown
---

## Sub-Project B: 3-Level Table Accordion

Branch: `feature/sub-project-b-accordion`
Started: 2026-06-01

| Task | Area | Status |
|------|------|--------|
| 1 | Extract DemandSubTable to own file | ✅ Done |
| 2 | CreateDemandModal default props | ✅ Done |
| 3 | DemandSubTable 3-level refactor | ✅ Done |
| 4 | ManageServiceDemandsModal | ✅ Done |
| 5 | ServiceDecisionModal (Deep Decision) | ✅ Done |

### 2026-06-01

**feature/sub-project-b-accordion**
- `DemandSubTable.tsx`: extracted from `ProjectsAccordion.tsx`; refactored to group demands by `serviceName`; Level 2 service rows with Edit/Delete/Quick Approve/Deep Decision; Level 3 resource rows (click-only, sidebar); status labels text-only no background fill
- `CreateDemandModal.tsx`: added `defaultProjectName?` and `defaultServiceName?` props to pre-fill create mode
- `ManageServiceDemandsModal.tsx`: new modal for managing resources in a service group (add/edit/delete demands); abort-guarded fetch with `useRef<AbortController>`
- `ServiceDecisionModal.tsx`: new modal mirroring `DecisionModal` UX extended to multiple demands; manual path with per-resource approve/partial/reject controls; transfer path calls `transferDemand` for all group demands
```

- [ ] **Step 2: Commit**

```bash
git add WORK_LOG.md
git commit -m "docs: update work log for Sub-project B accordion refactor"
```
