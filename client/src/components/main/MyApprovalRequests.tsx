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

const noop = () => {};

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

    const handleFilterChange = useCallback((key: ApprovalFilterKey, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleClearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

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
