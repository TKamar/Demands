import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Demand } from '../../types/domain';
import { fetchCenterPendingDemands } from '../../api/apiService';

interface MyApprovalRequestsProps {
  onApprove: (demand: Demand) => void;
  onReject: (demand: Demand) => void;
}

export const MyApprovalRequests: React.FC<MyApprovalRequestsProps> = ({ onApprove, onReject }) => {
  const { t } = useTranslation();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetchCenterPendingDemands()
      .then(setDemands)
      .catch(() => setDemands([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <div className="p-4 text-center text-gray-400">{t('common.loading')}</div>;
  if (demands.length === 0)
    return <div className="p-4 text-center text-gray-400" dir="rtl">{t('approvalRequests.empty')}</div>;

  return (
    <div dir="rtl">
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
          {demands.map(demand => (
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
    </div>
  );
};

// Export reload function via ref pattern for parent to trigger refresh
export type MyApprovalRequestsRef = { reload: () => void };
