import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Demand } from '../../types/domain';
import { fetchCenterForAssignmentDemands, cmAssignDemand } from '../../api/apiService';

export const ResourcesForAssignment: React.FC = () => {
  const { t } = useTranslation();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setError(null);
    setLoading(true);
    fetchCenterForAssignmentDemands()
      .then(data => {
        setDemands(data);
        const init: Record<number, string> = {};
        data.forEach((d: Demand) => {
          init[d.id] = d.approvedValue != null ? String(d.approvedValue) : '';
        });
        setValues(init);
      })
      .catch(() => setDemands([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleAssign = async (demand: Demand) => {
    const val = parseFloat(values[demand.id] ?? '');
    if (isNaN(val) || val <= 0) return;
    setAssigning(demand.id);
    try {
      await cmAssignDemand(demand.id, val);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.message ?? t('errors.generic'));
    } finally {
      setAssigning(null);
    }
  };

  if (loading) return null;
  if (demands.length === 0) return null;

  return (
    <div className="mt-6 border rounded-lg overflow-hidden" dir="rtl">
      <div className="bg-blue-50 border-b px-4 py-2 font-semibold text-blue-800">
        {t('resourceAssignment.title')}
      </div>
      {error && <p className="text-red-600 text-sm mb-3 p-2">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-right">{t('demands.project')}</th>
            <th className="p-2 text-right">{t('demands.resource')}</th>
            <th className="p-2 text-right">{t('demands.requestedValue')}</th>
            <th className="p-2 text-right">{t('resourceAssignment.assignValue')}</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {demands.map(demand => (
            <tr key={demand.id} className="border-t hover:bg-gray-50">
              <td className="p-2">{demand.projectName}</td>
              <td className="p-2">{demand.resourceName} ({demand.unit})</td>
              <td className="p-2">{demand.value}</td>
              <td className="p-2">
                <input
                  type="number"
                  min="1"
                  max={demand.value}
                  value={values[demand.id] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [demand.id]: e.target.value }))}
                  className="w-24 border rounded px-2 py-1 text-sm"
                />
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleAssign(demand)}
                  disabled={assigning === demand.id}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {assigning === demand.id ? '...' : t('resourceAssignment.assign')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
