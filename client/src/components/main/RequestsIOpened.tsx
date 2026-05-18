import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Demand } from '../../types/domain';
import { fetchDemands } from '../../api/apiService';
import StatusBadge from '../projects/StatusBadge';

export const RequestsIOpened: React.FC = () => {
  const { t } = useTranslation();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // fetchDemands with no special filter returns only the current user's demands for non-admin users
    fetchDemands({ limit: 500 })
      .then(res => setDemands(res.data ?? []))
      .catch(() => setDemands([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-400">{t('common.loading')}</div>;
  if (demands.length === 0)
    return <div className="p-4 text-center text-gray-400" dir="rtl">{t('myRequests.empty')}</div>;

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
            <th className="p-2 text-right">{t('demands.createdAt')}</th>
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
              <td className="p-2">{new Date(demand.createdAt).toLocaleDateString('he-IL')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
