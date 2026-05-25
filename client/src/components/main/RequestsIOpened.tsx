import React, { useState, useMemo, useCallback } from 'react';
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
import type { Demand, Project } from '../../types/domain';
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
  { value: 'PartiallyApproved', label: 'PartiallyApproved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'CenterManagerRejected', label: 'CenterManagerRejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const noop = () => {};

export const RequestsIOpened: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [demandToRestore, setDemandToRestore] = useState<Demand | null>(null);
  const [filters, setFilters] = useState<Record<MyRequestsFilterKey, string>>(INITIAL_FILTERS);

  const { demands, isLoading, restoreDemand } = useDemands({}, { page: 1, limit: 500 });

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
        <div className="relative flex items-center justify-end gap-2 px-4 py-2 border-b border-divider">
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
