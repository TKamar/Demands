# Table Standardization, Filter UX, Action Menu & Checkbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `FilterSort` to all user-facing data tables, fix the `MoreActionsMenu` portal positioning, and resolve checkbox ghost-selection and deselect-all in `DemandsTable`.

**Architecture:** All filtering is client-side (no new API calls). `FilterSort` is an existing generic component — each table owner maintains its own filter state and derives filtered data via `useMemo`. The `MoreActionsMenu` dropdown is moved from `absolute` (clipped by overflow ancestors) to a `createPortal` + `fixed` approach. Checkbox fixes are applied in `DemandsTable` (deselect-all header) and `RequirementsView` (dedup accumulation + selection reset on filter change).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (logical properties), `react-i18next`, `react-icons/md`, existing `FilterSort`/`FilterGroupConfig` types in `client/src/types/filter.ts`.

---

## Git protocol (mandatory for every task)
- New branch from `dev` per task
- Author: `git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit`
- No AI references in commit messages or code comments
- Merge each branch into `dev` after its task is complete
- Update `WORK_LOG.md` in the same commit as the feature code

---

## Task A1 — FilterSort for RequestsIOpened

**Branch:** `feat/filter-requests-opened`

**Files:**
- Modify: `client/src/components/main/RequestsIOpened.tsx`

### What it does
Adds a compact `FilterSort` funnel above the DemandsTable. Options are derived from the already-loaded `demands` array (no new API calls). Filtering is applied client-side via `useMemo` before passing to `useClientInfiniteScroll`.

- [ ] **Step 1: Create branch**
```bash
git checkout dev && git checkout -b feat/filter-requests-opened
```

- [ ] **Step 2: Replace the file with the updated version**

Replace the full content of `client/src/components/main/RequestsIOpened.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DemandsTable, { demandColumnConfig } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ConfirmDialog from '../common/ConfirmDialog';
import FilterSort from '../common/filters/FilterSort';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import { useDemands } from '../../hooks/useDemands';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useClientInfiniteScroll } from '../../hooks/useClientInfiniteScroll';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type { FilterGroupConfig } from '../../types/filter';

const MY_REQUESTS_COLUMNS = demandColumnConfig.filter((col) =>
  ['project', 'service', 'resource', 'status', 'value', 'unit', 'createdAt', 'actions'].includes(col.key)
);

type MyRequestsFilterKey = 'status' | 'serviceName' | 'resourceName';

const INITIAL_FILTERS: Record<MyRequestsFilterKey, string> = {
  status: '',
  serviceName: '',
  resourceName: '',
};

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'ApprovedWithCondition', label: 'ApprovedWithCondition' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const RequestsIOpened: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [demandToRestore, setDemandToRestore] = useState<Demand | null>(null);
  const [filters, setFilters] = useState<Record<MyRequestsFilterKey, string>>(INITIAL_FILTERS);

  const { demands, isLoading, restoreDemand } = useDemands({}, { page: 1, limit: 500 });

  const { projects } = useCachedProjects();
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

  // Derive dropdown options from loaded data
  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    return demands
      .filter(d => d.serviceName && !seen.has(d.serviceName) && !!seen.add(d.serviceName))
      .map(d => ({ value: d.serviceName, label: d.serviceName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [demands]);

  const resourceOptions = useMemo(() => {
    const seen = new Set<string>();
    return demands
      .filter(d => d.resourceName && !seen.has(d.resourceName) && !!seen.add(d.resourceName))
      .map(d => ({ value: d.resourceName, label: d.resourceName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [demands]);

  const filterGroups = useMemo((): FilterGroupConfig<MyRequestsFilterKey>[] => [
    {
      id: 'main',
      label: 'common.filters',
      defaultExpanded: true,
      fields: [
        { key: 'status', label: 'projects.columns.status', inputType: 'select', options: STATUS_OPTIONS },
        { key: 'serviceName', label: 'demands.service', inputType: 'select', options: serviceOptions },
        { key: 'resourceName', label: 'demands.resource', inputType: 'select', options: resourceOptions },
      ],
    },
  ], [serviceOptions, resourceOptions]);

  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      if (filters.status && d.status !== filters.status) return false;
      if (filters.serviceName && d.serviceName !== filters.serviceName) return false;
      if (filters.resourceName && d.resourceName !== filters.resourceName) return false;
      return true;
    });
  }, [demands, filters]);

  const { displayedItems, sentinelRef, hasMore } = useClientInfiniteScroll(filteredDemands, 20);

  const handleFilterChange = (key: MyRequestsFilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => setFilters(INITIAL_FILTERS);

  const handleRestore = (demand: Demand) => {
    setDemandToRestore(demand);
  };

  const confirmRestore = async () => {
    if (!demandToRestore) return;
    const target = demandToRestore;
    setDemandToRestore(null);
    try {
      await restoreDemand(target.id);
      showToast(t('demands.restoreSuccess', 'הדרישה הוחזרה בהצלחה'), 'success');
    } catch {
      showToast(t('demands.restoreError', 'שגיאה בהחזרת הדרישה'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        {/* Header with FilterSort */}
        <div className="relative flex items-center justify-end gap-2 px-4 py-2 border-b border-divider">
          <FilterSort
            compact
            filterGroups={filterGroups}
            filterValues={filters}
            onFilterChange={handleFilterChange}
            onClearAllFilters={handleClearFilters}
            sortOptions={[]}
            sortState={{ field: null, direction: 'asc' }}
            onSortChange={() => {}}
          />
        </div>

        <DemandsTable
          demands={displayedItems}
          projectMap={projectMap}
          isLoading={isLoading}
          visibleColumns={MY_REQUESTS_COLUMNS}
          selectedDemand={selectedDemand}
          onSelectDemand={setSelectedDemand}
          onRestore={handleRestore}
        />
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          isLoading={isLoading}
          hasMore={hasMore}
        />
      </div>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        isModerator={false}
      />

      <ConfirmDialog
        isOpen={demandToRestore !== null}
        title={t('demands.restoreTitle', 'החזרת דרישה')}
        message={t('demands.restoreConfirm', 'להחזיר דרישה זו לסטטוס ממתין?')}
        onConfirm={confirmRestore}
        onCancel={() => setDemandToRestore(null)}
      />
    </div>
  );
};
```

- [ ] **Step 3: Type-check**
```bash
cd client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit and merge**
```bash
cd ..
git add client/src/components/main/RequestsIOpened.tsx
git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit -m "feat: add filter panel to My Requests view"
git checkout dev && git merge feat/filter-requests-opened
```

---

## Task A2 — FilterSort for MyApprovalRequests

**Branch:** `feat/filter-approval-requests`

**Files:**
- Modify: `client/src/components/main/MyApprovalRequests.tsx`

### What it does
Adds compact `FilterSort` above the approval requests table. Options derived from loaded demands. Filtering via `useMemo`. Keeps existing `forwardRef`/`useImperativeHandle` intact.

- [ ] **Step 1: Create branch**
```bash
git checkout dev && git checkout -b feat/filter-approval-requests
```

- [ ] **Step 2: Replace the file**

Replace the full content of `client/src/components/main/MyApprovalRequests.tsx`:

```tsx
import { useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FilterSort from '../common/filters/FilterSort';
import type { Demand } from '../../types/domain';
import type { FilterGroupConfig } from '../../types/filter';
import { fetchCenterPendingDemands } from '../../api/apiService';

interface MyApprovalRequestsProps {
  onApprove: (demand: Demand) => void;
  onReject: (demand: Demand) => void;
}

export interface MyApprovalRequestsHandle {
  reload: () => void;
}

type ApprovalFilterKey = 'serviceName' | 'resourceName' | 'projectName';

const INITIAL_FILTERS: Record<ApprovalFilterKey, string> = {
  serviceName: '',
  resourceName: '',
  projectName: '',
};

export const MyApprovalRequests = forwardRef<MyApprovalRequestsHandle, MyApprovalRequestsProps>(
  ({ onApprove, onReject }, ref) => {
    const { t } = useTranslation();
    const [demands, setDemands] = useState<Demand[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Record<ApprovalFilterKey, string>>(INITIAL_FILTERS);

    const reload = useCallback(() => {
      setLoading(true);
      fetchCenterPendingDemands()
        .then(setDemands)
        .catch(() => setDemands([]))
        .finally(() => setLoading(false));
    }, []);

    useEffect(() => { reload(); }, [reload]);

    useImperativeHandle(ref, () => ({ reload }));

    const serviceOptions = useMemo(() => {
      const seen = new Set<string>();
      return demands
        .filter(d => d.serviceName && !seen.has(d.serviceName) && !!seen.add(d.serviceName))
        .map(d => ({ value: d.serviceName, label: d.serviceName }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [demands]);

    const resourceOptions = useMemo(() => {
      const seen = new Set<string>();
      return demands
        .filter(d => d.resourceName && !seen.has(d.resourceName) && !!seen.add(d.resourceName))
        .map(d => ({ value: d.resourceName, label: d.resourceName }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [demands]);

    const projectOptions = useMemo(() => {
      const seen = new Set<string>();
      return demands
        .filter(d => d.projectName && !seen.has(d.projectName) && !!seen.add(d.projectName))
        .map(d => ({ value: d.projectName, label: d.projectName }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [demands]);

    const filterGroups = useMemo((): FilterGroupConfig<ApprovalFilterKey>[] => [
      {
        id: 'main',
        label: 'common.filters',
        defaultExpanded: true,
        fields: [
          { key: 'serviceName', label: 'demands.service', inputType: 'select', options: serviceOptions },
          { key: 'resourceName', label: 'demands.resource', inputType: 'select', options: resourceOptions },
          { key: 'projectName', label: 'demands.project', inputType: 'select', options: projectOptions },
        ],
      },
    ], [serviceOptions, resourceOptions, projectOptions]);

    const filteredDemands = useMemo(() => {
      return demands.filter(d => {
        if (filters.serviceName && d.serviceName !== filters.serviceName) return false;
        if (filters.resourceName && d.resourceName !== filters.resourceName) return false;
        if (filters.projectName && d.projectName !== filters.projectName) return false;
        return true;
      });
    }, [demands, filters]);

    if (loading) return <div className="p-4 text-center text-gray-400">{t('common.loading')}</div>;
    if (demands.length === 0)
      return <div className="p-4 text-center text-gray-400" dir="rtl">{t('approvalRequests.empty')}</div>;

    return (
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        {/* Filter header */}
        <div className="relative flex items-center justify-end gap-2 px-4 py-2 border-b border-divider">
          <FilterSort
            compact
            filterGroups={filterGroups}
            filterValues={filters}
            onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClearAllFilters={() => setFilters(INITIAL_FILTERS)}
            sortOptions={[]}
            sortState={{ field: null, direction: 'asc' }}
            onSortChange={() => {}}
          />
        </div>

        <div dir="rtl">
          {filteredDemands.length === 0 ? (
            <div className="p-4 text-center text-gray-400">{t('common.noResults')}</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-right">{t('demands.project')}</th>
                  <th className="p-2 text-right">{t('demands.service')}</th>
                  <th className="p-2 text-right">{t('demands.resource')}</th>
                  <th className="p-2 text-right">{t('demands.value')}</th>
                  <th className="p-2 text-right">{t('demands.createdBy')}</th>
                  <th className="p-2 text-right">{t('demands.createdAt')}</th>
                  <th className="p-2 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDemands.map(demand => (
                  <tr key={demand.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{demand.projectName}</td>
                    <td className="p-2">{demand.serviceName}</td>
                    <td className="p-2">{demand.resourceName}</td>
                    <td className="p-2">{demand.value} {demand.unit}</td>
                    <td className="p-2">{demand.createdByName ?? demand.createdBy}</td>
                    <td className="p-2">{new Date(demand.createdAt).toLocaleDateString('he-IL')}</td>
                    <td className="p-2 flex gap-2">
                      <button onClick={() => onApprove(demand)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                        {t('actions.approve')}
                      </button>
                      <button onClick={() => onReject(demand)} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                        {t('actions.reject')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }
);
```

- [ ] **Step 3: Type-check**
```bash
cd client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit and merge**
```bash
cd ..
git add client/src/components/main/MyApprovalRequests.tsx
git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit -m "feat: add filter panel to Approval Requests view"
git checkout dev && git merge feat/filter-approval-requests
```

---

## Task A3 — FilterSort for CapacityManagement & WalletManagement

**Branch:** `feat/filter-admin-tables`

**Files:**
- Modify: `client/src/components/management/CapacityManagement.tsx`
- Modify: `client/src/components/management/WalletManagement.tsx`

### What it does
Adds compact `FilterSort` to the header area in both management containers. Options derived from loaded data. Filtered arrays passed as `capacities`/`wallets` props to the presentation components. The `CapacityTable` and `WalletTable` components themselves are not modified.

- [ ] **Step 1: Create branch**
```bash
git checkout dev && git checkout -b feat/filter-admin-tables
```

- [ ] **Step 2: Update CapacityManagement.tsx**

Replace the full content of `client/src/components/management/CapacityManagement.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useCapacities } from '../../hooks/useCapacities';
import type { Capacity } from '../../api/types';
import CapacityTable from './CapacityTable';
import CapacityModal from './CapacityModal';
import FilterSort from '../common/filters/FilterSort';
import { useToast } from '../common/Toast';
import type { FilterGroupConfig } from '../../types/filter';

type CapacityFilterKey = 'service' | 'resource' | 'base' | 'network' | 'environment';

const INITIAL_FILTERS: Record<CapacityFilterKey, string> = {
  service: '',
  resource: '',
  base: '',
  network: '',
  environment: '',
};

export default function CapacityManagement() {
    const { t } = useTranslation();
    const {
        capacities,
        isLoading,
        error,
        fetchCapacities,
        createCapacity,
        updateCapacity,
        deleteCapacity
    } = useCapacities();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCapacity, setSelectedCapacity] = useState<Capacity | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<Record<CapacityFilterKey, string>>(INITIAL_FILTERS);

    useEffect(() => {
        fetchCapacities();
    }, [fetchCapacities]);

    // Derive filter options from loaded data
    const serviceOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.resourceService && !seen.has(c.resourceService) && !!seen.add(c.resourceService))
            .map(c => ({ value: c.resourceService, label: c.resourceService }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const resourceOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.resourceName && !seen.has(c.resourceName) && !!seen.add(c.resourceName))
            .map(c => ({ value: c.resourceName, label: c.resourceName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const baseOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.location.baseName && !seen.has(c.location.baseName) && !!seen.add(c.location.baseName))
            .map(c => ({ value: c.location.baseName, label: c.location.baseName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const networkOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.location.networkName && !seen.has(c.location.networkName) && !!seen.add(c.location.networkName))
            .map(c => ({ value: c.location.networkName, label: c.location.networkName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const environmentOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.location.environmentName && !seen.has(c.location.environmentName) && !!seen.add(c.location.environmentName))
            .map(c => ({ value: c.location.environmentName, label: c.location.environmentName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const filterGroups = useMemo((): FilterGroupConfig<CapacityFilterKey>[] => [
        {
            id: 'main',
            label: 'common.filters',
            defaultExpanded: true,
            fields: [
                { key: 'service', label: 'management.capacity.columns.service', inputType: 'select', options: serviceOptions },
                { key: 'resource', label: 'management.capacity.columns.resource', inputType: 'select', options: resourceOptions },
                { key: 'base', label: 'projects.createProject.base', inputType: 'select', options: baseOptions },
                { key: 'network', label: 'management.capacity.columns.network', inputType: 'select', options: networkOptions },
                { key: 'environment', label: 'management.capacity.columns.environment', inputType: 'select', options: environmentOptions },
            ],
        },
    ], [serviceOptions, resourceOptions, baseOptions, networkOptions, environmentOptions]);

    const filteredCapacities = useMemo(() => {
        return capacities.filter(c => {
            if (filters.service && c.resourceService !== filters.service) return false;
            if (filters.resource && c.resourceName !== filters.resource) return false;
            if (filters.base && c.location.baseName !== filters.base) return false;
            if (filters.network && c.location.networkName !== filters.network) return false;
            if (filters.environment && c.location.environmentName !== filters.environment) return false;
            return true;
        });
    }, [capacities, filters]);

    const handleCreate = () => {
        setSelectedCapacity(null);
        setIsModalOpen(true);
    };

    const handleEdit = (capacity: Capacity) => {
        setSelectedCapacity(capacity);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('Are you sure you want to delete this capacity?'))) {
            try {
                await deleteCapacity(id);
                showToast('Capacity deleted successfully', 'success');
            } catch (err) {
                showToast('Failed to delete capacity', 'error');
            }
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (selectedCapacity) {
                await updateCapacity({ id: selectedCapacity.id, value: data.value });
                showToast('Capacity updated successfully', 'success');
            } else {
                await createCapacity(data);
                showToast('Capacity created successfully', 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="relative flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary m-0">
                    {t('management.tabs.capacity')}
                </h2>
                <div className="flex items-center gap-2">
                    <FilterSort
                        compact
                        filterGroups={filterGroups}
                        filterValues={filters}
                        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                        onClearAllFilters={() => setFilters(INITIAL_FILTERS)}
                        sortOptions={[]}
                        sortState={{ field: null, direction: 'asc' }}
                        onSortChange={() => {}}
                    />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium"
                    >
                        <MdAdd size={20} />
                        {t('management.capacity.add')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    {error}
                </div>
            )}

            <CapacityTable
                capacities={filteredCapacities}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading && !isSubmitting}
            />

            {isModalOpen && (
                <CapacityModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleSubmit}
                    capacity={selectedCapacity}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 3: Update WalletManagement.tsx**

Replace the full content of `client/src/components/management/WalletManagement.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useWallets } from '../../hooks/useWallets';
import type { Wallet } from '../../api/types';
import WalletTable from './WalletTable';
import WalletModal from './WalletModal';
import FilterSort from '../common/filters/FilterSort';
import { useToast } from '../common/Toast';
import type { FilterGroupConfig } from '../../types/filter';

type WalletFilterKey = 'service' | 'resource' | 'center';

const INITIAL_FILTERS: Record<WalletFilterKey, string> = {
    service: '',
    resource: '',
    center: '',
};

export default function WalletManagement() {
    const { t } = useTranslation();
    const {
        wallets,
        isLoading,
        error,
        fetchWallets,
        createWallet,
        updateWallet,
        deleteWallet
    } = useWallets();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<Record<WalletFilterKey, string>>(INITIAL_FILTERS);

    useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    const serviceOptions = useMemo(() => {
        const seen = new Set<string>();
        return wallets
            .filter(w => w.capacity.resource.serviceName && !seen.has(w.capacity.resource.serviceName) && !!seen.add(w.capacity.resource.serviceName))
            .map(w => ({ value: w.capacity.resource.serviceName, label: w.capacity.resource.serviceName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wallets]);

    const resourceOptions = useMemo(() => {
        const seen = new Set<string>();
        return wallets
            .filter(w => w.capacity.resourceName && !seen.has(w.capacity.resourceName) && !!seen.add(w.capacity.resourceName))
            .map(w => ({ value: w.capacity.resourceName, label: w.capacity.resourceName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wallets]);

    const centerOptions = useMemo(() => {
        const seen = new Set<string>();
        return wallets
            .filter(w => w.centerName && !seen.has(w.centerName) && !!seen.add(w.centerName))
            .map(w => ({ value: w.centerName, label: w.center?.displayName || w.centerName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [wallets]);

    const filterGroups = useMemo((): FilterGroupConfig<WalletFilterKey>[] => [
        {
            id: 'main',
            label: 'common.filters',
            defaultExpanded: true,
            fields: [
                { key: 'service', label: 'management.wallet.columns.service', inputType: 'select', options: serviceOptions },
                { key: 'resource', label: 'management.wallet.columns.resource', inputType: 'select', options: resourceOptions },
                { key: 'center', label: 'management.wallet.columns.center', inputType: 'select', options: centerOptions },
            ],
        },
    ], [serviceOptions, resourceOptions, centerOptions]);

    const filteredWallets = useMemo(() => {
        return wallets.filter(w => {
            if (filters.service && w.capacity.resource.serviceName !== filters.service) return false;
            if (filters.resource && w.capacity.resourceName !== filters.resource) return false;
            if (filters.center && w.centerName !== filters.center) return false;
            return true;
        });
    }, [wallets, filters]);

    const handleCreate = () => {
        setSelectedWallet(null);
        setIsModalOpen(true);
    };

    const handleEdit = (wallet: Wallet) => {
        setSelectedWallet(wallet);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('management.wallet.confirmDelete'))) {
            try {
                await deleteWallet(id);
                showToast(t('management.wallet.deleteSuccess'), 'success');
            } catch (err) {
                showToast(t('management.wallet.deleteFailed'), 'error');
            }
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (selectedWallet) {
                await updateWallet({ id: selectedWallet.id, value: data.value });
                showToast(t('management.wallet.updateSuccess'), 'success');
            } else {
                await createWallet(data);
                showToast(t('management.wallet.createSuccess'), 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            showToast(err.response?.data?.error || t('management.wallet.operationFailed'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="relative flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary m-0">
                    {t('management.tabs.wallet')}
                </h2>
                <div className="flex items-center gap-2">
                    <FilterSort
                        compact
                        filterGroups={filterGroups}
                        filterValues={filters}
                        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                        onClearAllFilters={() => setFilters(INITIAL_FILTERS)}
                        sortOptions={[]}
                        sortState={{ field: null, direction: 'asc' }}
                        onSortChange={() => {}}
                    />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium"
                    >
                        <MdAdd size={20} />
                        {t('management.wallet.add')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    {error}
                </div>
            )}

            <WalletTable
                wallets={filteredWallets}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading && !isSubmitting}
            />

            {isModalOpen && (
                <WalletModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleSubmit}
                    wallet={selectedWallet}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 4: Type-check**
```bash
cd client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit and merge**
```bash
cd ..
git add client/src/components/management/CapacityManagement.tsx client/src/components/management/WalletManagement.tsx
git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit -m "feat: add filter panel to Capacity and Wallet management tables"
git checkout dev && git merge feat/filter-admin-tables
```

---

## Task B — MoreActionsMenu Portal Positioning Fix

**Branch:** `fix/action-menu-portal`

**Files:**
- Modify: `client/src/components/common/MoreActionsMenu.tsx`

### What it does
Replaces the `absolute end-0 top-full` dropdown (which is clipped by `overflow-hidden`/`overflow-x-auto` ancestors in table containers) with a `createPortal` + `position: fixed` dropdown anchored via `getBoundingClientRect()`. Adds a second ref (`menuRef`) so the click-outside handler correctly excludes clicks inside the portal menu.

- [ ] **Step 1: Create branch**
```bash
git checkout dev && git checkout -b fix/action-menu-portal
```

- [ ] **Step 2: Replace MoreActionsMenu.tsx**

Replace the full content of `client/src/components/common/MoreActionsMenu.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdMoreVert } from 'react-icons/md';

export interface MoreAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MoreActionsMenuProps {
  actions: MoreAction[];
  /** Controls trigger button icon size; default 'sm' (14px) */
  size?: 'sm' | 'md';
}

export default function MoreActionsMenu({ actions, size = 'sm' }: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target) ?? false;
      const insideMenu = menuRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleActions = actions.filter(Boolean);
  if (visibleActions.length === 0) return null;

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-gray-100 bg-transparent border-none cursor-pointer transition-colors"
        title="More actions"
      >
        <MdMoreVert size={iconSize} />
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 400 }}
          className="bg-bg-paper border border-divider rounded-xl shadow-lg py-1 min-w-[148px]"
        >
          {visibleActions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (!action.disabled) {
                  action.onClick();
                  setOpen(false);
                }
              }}
              disabled={action.disabled}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-start border-none transition-colors
                ${action.disabled
                  ? 'opacity-40 cursor-not-allowed bg-transparent'
                  : 'cursor-pointer hover:bg-gray-50 bg-transparent'
                }
                ${action.danger ? 'text-danger' : 'text-text-primary'}`}
            >
              {action.icon && <span className="shrink-0 flex items-center">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**
```bash
cd client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Verify no callers broke**

Search for any component that wraps `MoreActionsMenu` in a `relative` container and relied on the old `absolute` positioning — those wrappers can now drop their `relative` class, but it's not required (having an extra `relative` is harmless). No action needed unless the type-check found issues.

- [ ] **Step 5: Commit and merge**
```bash
cd ..
git add client/src/components/common/MoreActionsMenu.tsx
git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit -m "fix: render action menu via portal to escape overflow-clipped table containers"
git checkout dev && git merge fix/action-menu-portal
```

---

## Task C — Checkbox Ghost-Selection Fix & Deselect All

**Branch:** `fix/checkbox-selection`

**Files:**
- Modify: `client/src/components/projects/DemandsTable.tsx`
- Modify: `client/src/components/main/RequirementsView.tsx`

### What it does
1. Deduplicates `accumulatedDemands` by `id` to prevent the same demand rendering twice (ghost-selection root cause).
2. Clears bulk selection state whenever the active filter/sort params change.
3. Adds an `onDeselectAll` prop to `DemandsTable` and replaces the `—` placeholder in the bulk-select header with an indeterminate checkbox that calls `onDeselectAll` when clicked.

- [ ] **Step 1: Create branch**
```bash
git checkout dev && git checkout -b fix/checkbox-selection
```

- [ ] **Step 2: Update DemandsTable.tsx — add onDeselectAll prop and indeterminate header checkbox**

At the top of `client/src/components/projects/DemandsTable.tsx`, add `useRef` and `useEffect` to the React import and add the `IndeterminateCheckbox` helper before the main component:

```tsx
import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// ... rest of existing imports unchanged
```

Add this helper component after the imports and before `export const demandColumnConfig`:

```tsx
function IndeterminateCheckbox({ onDeselect }: { onDeselect: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = true;
  });
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={false}
      readOnly
      onClick={(e) => { e.stopPropagation(); onDeselect(); }}
      className="cursor-pointer"
      title="Deselect all"
    />
  );
}
```

In the `DemandsTableProps` interface, add:
```tsx
onDeselectAll?: () => void;
```

In the destructured props:
```tsx
export default function DemandsTable({
  // ... all existing props ...
  onToggleSelect,
  onDeselectAll,         // ← add this
}: DemandsTableProps) {
```

In the `<thead>` bulk-select cell (currently renders `—`), replace with:
```tsx
{showBulkSelect && (
  <th className="px-3 py-3 text-start font-semibold text-text-secondary whitespace-nowrap bg-bg-default">
    {selectedIds && selectedIds.size > 0
      ? <IndeterminateCheckbox onDeselect={() => onDeselectAll?.()} />
      : '—'
    }
  </th>
)}
```

- [ ] **Step 3: Update RequirementsView.tsx — deduplicate + clear selection on filter change**

In `client/src/components/main/RequirementsView.tsx`:

**3a. Fix accumulation dedup** — find the `useEffect` that calls `setAccumulatedDemands` (around line 145) and replace it:

```tsx
// Before:
useEffect(() => {
  if (isLoading) return;
  setAccumulatedDemands((prev) =>
    currentPage === 1 ? demands : [...prev, ...demands]
  );
}, [demands, currentPage, isLoading]);

// After:
useEffect(() => {
  if (isLoading) return;
  setAccumulatedDemands((prev) => {
    if (currentPage === 1) return demands;
    const existingIds = new Set(prev.map(d => d.id));
    return [...prev, ...demands.filter(d => !existingIds.has(d.id))];
  });
}, [demands, currentPage, isLoading]);
```

**3b. Clear selection on filter/sort change** — update the three handlers that reset pagination:

```tsx
// handleFilterChange — add clearSelection():
const handleFilterChange = useCallback((key: DemandFilterKey, value: string) => {
  setFilters((prev) => ({ ...prev, [key]: value }));
  setCurrentPage(1);
  setAccumulatedDemands([]);
  clearSelection();
}, [clearSelection]);

// handleClearAllFilters — add clearSelection():
const handleClearAllFilters = useCallback(() => {
  setFilters(initialDemandFilters);
  setCurrentPage(1);
  setAccumulatedDemands([]);
  clearSelection();
}, [clearSelection]);

// handleSortChange — add clearSelection():
const handleSortChange = useCallback((field: DemandSortKey | null, direction: SortDirection) => {
  setSortState({ field, direction });
  setCurrentPage(1);
  setAccumulatedDemands([]);
  clearSelection();
}, [clearSelection]);
```

**3c. Wire onDeselectAll to DemandsTable** — find the `<DemandsTable>` usage in RequirementsView and add:

```tsx
<DemandsTable
  // ... all existing props ...
  onDeselectAll={clearSelection}
/>
```

- [ ] **Step 4: Type-check**
```bash
cd client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit and merge**
```bash
cd ..
git add client/src/components/projects/DemandsTable.tsx client/src/components/main/RequirementsView.tsx
git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit -m "fix: deduplicate accumulated demands and add deselect-all header checkbox"
git checkout dev && git merge fix/checkbox-selection
```

---

## Task Z — WORK_LOG & Push

- [ ] **Step 1: Append to WORK_LOG.md**

Open `WORK_LOG.md` and append:

```markdown
---

## 2026-05-25 — Table Standardization Sprint

| Step | Area | Branch | Status |
|------|------|--------|--------|
| A1 | FilterSort → RequestsIOpened | feat/filter-requests-opened | ✅ Done |
| A2 | FilterSort → MyApprovalRequests | feat/filter-approval-requests | ✅ Done |
| A3 | FilterSort → CapacityManagement + WalletManagement | feat/filter-admin-tables | ✅ Done |
| B  | MoreActionsMenu portal fix | fix/action-menu-portal | ✅ Done |
| C  | Checkbox dedup + deselect-all | fix/checkbox-selection | ✅ Done |

All branches merged into `dev`.
```

- [ ] **Step 2: Commit WORK_LOG**
```bash
git add WORK_LOG.md
git -c user.email="tomer.kamar@gmail.com" -c user.name="tkamar" commit -m "docs: update WORK_LOG for table standardization sprint"
```

- [ ] **Step 3: Push dev**
```bash
git push origin dev
```

---

## Self-review

**Spec coverage check:**
- A — Filter on all data tables: ✅ Tasks A1 (RequestsIOpened), A2 (MyApprovalRequests), A3 (CapacityManagement + WalletManagement). Clear Filters button lives inside FilterSort, already implemented.
- B — Action menu positioning: ✅ Task B, portal approach.
- C — Checkbox ghost bug: ✅ Task C dedup fix + selection clear on filter change.
- C — Deselect All: ✅ Task C `IndeterminateCheckbox` in thead.

**Placeholder scan:** No TBDs. Every step has concrete code. The `Wallet.center` access in WalletManagement uses `w.center?.displayName` with optional chaining in case the relation isn't loaded.

**Type consistency:** `onDeselectAll` prop defined in `DemandsTableProps`, destructured in component body, called as `onDeselectAll?.()`, wired as `clearSelection` from RequirementsView. `IndeterminateCheckbox` defined before `demandColumnConfig` so it's in scope.
