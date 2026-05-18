import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Demand, DemandStatus } from '../../types/domain';
import { fetchDemandHistory, restoreDemand } from '../../api/apiService';
import StatusBadge from '../projects/StatusBadge';

const RESTORABLE: DemandStatus[] = ['Rejected', 'CenterManagerRejected'];

export const RequestHistory: React.FC = () => {
  const { t } = useTranslation();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  const reload = () => {
    setLoading(true);
    fetchDemandHistory()
      .then(setDemands)
      .catch(() => setDemands([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleRestore = async (demand: Demand) => {
    if (!window.confirm(t('history.restoreConfirm', { project: demand.projectName }))) return;
    setRestoring(demand.id);
    try {
      await restoreDemand(demand.id);
      reload();
    } catch {
      // keep existing list on error
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-400">{t('common.loading')}</div>;
  if (demands.length === 0)
    return <div className="p-4 text-center text-gray-400" dir="rtl">{t('history.empty')}</div>;

  return (
    <div dir="rtl">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-right">{t('demands.project')}</th>
            <th className="p-2 text-right">{t('demands.service')}</th>
            <th className="p-2 text-right">{t('demands.resource')}</th>
            <th className="p-2 text-right">{t('demands.value')}</th>
            <th className="p-2 text-right">{t('demands.status')}</th>
            <th className="p-2 text-right">{t('demands.reason')}</th>
            <th className="p-2 text-right">{t('demands.updatedAt')}</th>
            <th className="p-2 text-right">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {demands.map(demand => (
            <tr key={demand.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{demand.projectName}</td>
              <td className="p-2">{demand.serviceName}</td>
              <td className="p-2">{demand.resourceName}</td>
              <td className="p-2">{demand.value} {demand.unit}</td>
              <td className="p-2"><StatusBadge status={demand.status} /></td>
              <td className="p-2 max-w-xs truncate text-gray-500">{demand.reason ?? '—'}</td>
              <td className="p-2">{new Date(demand.updatedAt ?? demand.createdAt).toLocaleDateString('he-IL')}</td>
              <td className="p-2">
                {RESTORABLE.includes(demand.status) && (
                  <button
                    onClick={() => handleRestore(demand)}
                    disabled={restoring === demand.id}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {restoring === demand.id ? '...' : t('actions.restore')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
