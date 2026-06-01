import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
import DemandsTable, { demandColumnConfig } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ConfirmDialog from '../common/ConfirmDialog';
import FilterSort from '../common/filters/FilterSort';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import CreateDemandModal from '../projects/CreateDemandModal';
import { useDemands } from '../../hooks/useDemands';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useClientInfiniteScroll } from '../../hooks/useClientInfiniteScroll';
import { useToast } from '../common/Toast';
import type { Demand, Project } from '../../types/domain';
import type { FilterGroupConfig } from '../../types/filter';
import type { CreateDemandPayload, UpdateDemandPayload } from '../../api/types';

const MY_REQUESTS_COLUMNS = demandColumnConfig.filter((col) =>
  ['project', 'service', 'resource', 'status', 'value', 'unit', 'createdAt', 'actions'].includes(col.key)
);

type MyRequestsFilterKey = 'status' | 'serviceName' | 'resourceName';

const INITIAL_FILTERS: Record<MyRequestsFilterKey, string> = {
  status: '',
  serviceName: '',
  resourceName: '',
};

const ACTIVE_STATUSES = new Set(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite']);

const STATUS_OPTIONS = [
  { value: 'PendingCenterManager', label: 'PendingCenterManager' },
  { value: 'Pending', label: 'Pending' },
  { value: 'WaitingOnPrerequisite', label: 'WaitingOnPrerequisite' },
];

const noop = () => {};

interface RequestsIOpenedProps {
  createdBy: string;
  selectedCenters?: string[];
}

export const RequestsIOpened: React.FC<RequestsIOpenedProps> = ({ createdBy, selectedCenters }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [demandToRestore, setDemandToRestore] = useState<Demand | null>(null);
  const [isCreatingDemand, setIsCreatingDemand] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);
  const [filters, setFilters] = useState<Record<MyRequestsFilterKey, string>>(INITIAL_FILTERS);

  const centerName = selectedCenters && selectedCenters.length > 0 ? selectedCenters.join(',') : undefined;

  const { demands, isLoading, restoreDemand, createDemand, updateDemand, cancelDemand } = useDemands(
    { createdBy, centerName },
    { page: 1, limit: 500 }
  );

  const { projects } = useCachedProjects();
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

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
      if (!ACTIVE_STATUSES.has(d.status)) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (filters.serviceName && d.serviceName !== filters.serviceName) return false;
      if (filters.resourceName && d.resourceName !== filters.resourceName) return false;
      return true;
    });
  }, [demands, filters]);

  const { displayedItems, sentinelRef, hasMore } = useClientInfiniteScroll(filteredDemands, 20);

  const handleFilterChange = useCallback((key: MyRequestsFilterKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const handleSubmitDemand = useCallback(
    async (payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) => {
      if (demandId) {
        await updateDemand(demandId, payload as UpdateDemandPayload);
        setEditingDemand(null);
      } else {
        await createDemand(payload as CreateDemandPayload);
      }
    },
    [createDemand, updateDemand]
  );

  const confirmCancel = useCallback(async () => {
    if (!demandToCancel) return;
    const target = demandToCancel;
    setDemandToCancel(null);
    try {
      await cancelDemand(target.id);
      showToast(t('demands.cancelSuccess', 'הדרישה בוטלה'), 'success');
    } catch {
      showToast(t('demands.cancelError', 'שגיאה בביטול הדרישה'), 'error');
    }
  }, [demandToCancel, cancelDemand, showToast, t]);

  const handleRestore = useCallback((demand: Demand) => {
    setDemandToRestore(demand);
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!demandToRestore) return;
    const target = demandToRestore;
    setDemandToRestore(null);
    try {
      await restoreDemand(target.id);
      showToast(t('demands.restoreSuccess', 'הדרישה הוחזרה בהצלחה'), 'success');
    } catch {
      showToast(t('demands.restoreError', 'שגיאה בהחזרת הדרישה'), 'error');
    }
  }, [demandToRestore, restoreDemand, showToast, t]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        <div className="relative flex items-center gap-2 px-4 py-2 border-b border-divider" dir="rtl">
          <button
            onClick={() => setIsCreatingDemand(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
          >
            <MdAdd size={15} />
            {t('requirements.addRequirement', '+ הוסף דרישה')}
          </button>
          <div className="flex-1" />
          <FilterSort
            compact
            filterGroups={filterGroups}
            filterValues={filters}
            onFilterChange={handleFilterChange}
            onClearAllFilters={handleClearFilters}
            sortOptions={[]}
            sortState={{ field: null, direction: 'asc' }}
            onSortChange={noop}
          />
        </div>

        <DemandsTable
          demands={displayedItems}
          projectMap={projectMap}
          isLoading={isLoading}
          visibleColumns={MY_REQUESTS_COLUMNS}
          selectedDemand={selectedDemand}
          onSelectDemand={setSelectedDemand}
          onEdit={setEditingDemand}
          onCancel={setDemandToCancel}
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

      {isCreatingDemand && (
        <CreateDemandModal
          isOpen={true}
          onClose={() => setIsCreatingDemand(false)}
          onSubmit={handleSubmitDemand}
          onCreated={() => setIsCreatingDemand(false)}
        />
      )}

      {editingDemand && (
        <CreateDemandModal
          isOpen={true}
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <ConfirmDialog
        isOpen={demandToCancel !== null}
        title={t('demands.cancelTitle', 'ביטול דרישה')}
        message={t('demands.cancelConfirm', 'לבטל דרישה זו?')}
        onConfirm={confirmCancel}
        onCancel={() => setDemandToCancel(null)}
        danger
      />
    </div>
  );
};
