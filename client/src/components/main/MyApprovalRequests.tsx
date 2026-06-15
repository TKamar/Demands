import { useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdGavel } from 'react-icons/md';
import FilterSort from '../common/filters/FilterSort';
import SortableHeader from '../common/SortableHeader';
import CmDecisionModal from '../management/CmDecisionModal';
import StatusBadge from '../projects/StatusBadge';
import type { Demand } from '../../types/domain';
import type { FilterGroupConfig, SortState } from '../../types/filter';
import { fetchCenterPendingDemands } from '../../api/apiService';

interface MyApprovalRequestsProps {}

export interface MyApprovalRequestsHandle {
  reload: () => void;
}

type ApprovalFilterKey = 'serviceName' | 'resourceName' | 'projectName';
type ApprovalSortKey = 'projectName' | 'serviceName' | 'resourceName' | 'value' | 'createdBy' | 'createdAt' | 'status';

const INITIAL_FILTERS: Record<ApprovalFilterKey, string> = {
  serviceName: '',
  resourceName: '',
  projectName: '',
};

const SORTABLE_KEYS: Record<ApprovalSortKey, ApprovalSortKey> = {
  projectName: 'projectName',
  serviceName: 'serviceName',
  resourceName: 'resourceName',
  value: 'value',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  status: 'status',
};

const noop = () => {};

export const MyApprovalRequests = forwardRef<MyApprovalRequestsHandle, MyApprovalRequestsProps>(
  (_props, ref) => {
    const { t } = useTranslation();
    const [demands, setDemands] = useState<Demand[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Record<ApprovalFilterKey, string>>(INITIAL_FILTERS);
    const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
    const [sortState, setSortState] = useState<SortState<ApprovalSortKey>>({ field: 'createdAt', direction: 'desc' });

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

    const handleFilterChange = useCallback((key: ApprovalFilterKey, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleClearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

    const handleColumnSort = useCallback((key: ApprovalSortKey) => {
      setSortState(prev => {
        if (prev.field === key) {
          return { field: key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { field: key, direction: 'asc' };
      });
    }, []);

    const filteredDemands = useMemo(() => {
      let result = demands.filter(d => {
        if (filters.serviceName && d.serviceName !== filters.serviceName) return false;
        if (filters.resourceName && d.resourceName !== filters.resourceName) return false;
        if (filters.projectName && d.projectName !== filters.projectName) return false;
        return true;
      });

      if (sortState.field) {
        result = [...result].sort((a, b) => {
          const aVal = a[sortState.field as keyof Demand];
          const bVal = b[sortState.field as keyof Demand];

          let comparison = 0;
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else if (aVal instanceof Date && bVal instanceof Date) {
            comparison = aVal.getTime() - bVal.getTime();
          } else if (typeof aVal === 'string' && typeof bVal === 'number') {
            comparison = parseFloat(aVal) - bVal;
          } else if (typeof aVal === 'number' && typeof bVal === 'string') {
            comparison = aVal - parseFloat(bVal);
          }

          return sortState.direction === 'asc' ? comparison : -comparison;
        });
      }

      return result;
    }, [demands, filters, sortState]);

    if (loading) return <div className="p-4 text-center text-gray-400">{t('common.loading')}</div>;
    if (demands.length === 0)
      return <div className="p-4 text-center text-gray-400" dir="rtl">{t('approvalRequests.empty')}</div>;

    return (
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

        <div dir="rtl">
          {filteredDemands.length === 0 ? (
            <div className="p-4 text-center text-gray-400">{t('common.noResults')}</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-divider bg-bg-default">
                  <SortableHeader
                    label={t('demands.project')}
                    sortKey="projectName"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <SortableHeader
                    label={t('demands.service')}
                    sortKey="serviceName"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <SortableHeader
                    label={t('demands.resource')}
                    sortKey="resourceName"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <SortableHeader
                    label={t('demands.value')}
                    sortKey="value"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <SortableHeader
                    label={t('demands.createdBy')}
                    sortKey="createdBy"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <SortableHeader
                    label={t('demands.createdAt')}
                    sortKey="createdAt"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <SortableHeader
                    label={t('common.status')}
                    sortKey="status"
                    currentSortKey={sortState.field}
                    currentSortDir={sortState.direction}
                    onSort={handleColumnSort}
                    align="end"
                  />
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-secondary uppercase tracking-wide">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDemands.map(demand => (
                  <tr key={demand.id} className="border-b border-divider hover:bg-primary/5 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-primary">{demand.projectName}</td>
                    <td className="px-4 py-2.5 text-sm text-secondary">{demand.serviceName}</td>
                    <td className="px-4 py-2.5 text-sm text-secondary">{demand.resourceName}</td>
                    <td className="px-4 py-2.5 text-sm text-secondary">{demand.value} {demand.unit}</td>
                    <td className="px-4 py-2.5 text-sm text-secondary">{demand.createdByName ?? demand.createdBy}</td>
                    <td className="px-4 py-2.5 text-sm text-secondary">{new Date(demand.createdAt).toLocaleDateString('he-IL')}</td>
                    <td className="px-4 py-2.5 text-sm text-secondary"><StatusBadge status={demand.status} /></td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDemand(demand); }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-primary hover:bg-primary/10 border border-primary/20 transition-colors"
                        title={t('management.makeDecision', 'קבל החלטה')}
                      >
                        <MdGavel size={14} />
                        {t('management.makeDecision', 'קבל החלטה')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      <CmDecisionModal
        open={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        demand={selectedDemand}
        onSuccess={() => { setSelectedDemand(null); reload(); }}
      />
    </div>
  );
});
