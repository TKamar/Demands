import React, { useEffect, useState } from 'react';
import { fetchAdminStats, type AdminStats } from '../../api/apiService';

const STATUS_LABELS: Record<string, string> = {
  Pending: 'בהמתנה',
  PendingCenterManager: 'בהמתנה - מנהל מרכז',
  Approved: 'אושר',
  ApprovedWithCondition: 'אושר בתנאי',
  PartiallyApproved: 'אושר חלקית',
  Rejected: 'דחה',
  Cancelled: 'בוטל',
  ApprovedAndAssigned: 'אושר וחילק',
};

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  PendingCenterManager: 'bg-orange-100 text-orange-800',
  Approved: 'bg-green-100 text-green-800',
  ApprovedWithCondition: 'bg-blue-100 text-blue-800',
  PartiallyApproved: 'bg-cyan-100 text-cyan-800',
  Rejected: 'bg-red-100 text-red-800',
  Cancelled: 'bg-gray-100 text-gray-800',
  ApprovedAndAssigned: 'bg-emerald-100 text-emerald-800',
};

interface MetricCardProps {
  title: string;
  value: number | string;
  description?: string;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, className = '' }) => (
  <div className={`bg-bg-paper border border-divider rounded-lg p-6 ${className}`}>
    <div className="text-sm text-text-secondary mb-2">{title}</div>
    <div className="text-3xl font-bold text-text-primary mb-2">{value}</div>
    {description && <div className="text-xs text-text-secondary">{description}</div>}
  </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-secondary">טוען...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">שגיאה: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-secondary">אין נתונים להצגה</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-bg-default p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-8">דאשבוארד מנהל</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard title="סך הכל דרישות" value={stats.totalDemands} />
          <MetricCard title="סך הכל פרויקטים" value={stats.totalProjects} />
          <MetricCard title="דרישות בהמתנה" value={stats.pendingCount} />
          <MetricCard title="דרישות מאושרות" value={stats.approvedCount} />
        </div>

        {/* Status Distribution */}
        <div className="bg-bg-paper border border-divider rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">התפלגות לפי סטטוס</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex flex-col gap-2">
                <div className={`px-3 py-2 rounded text-sm font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
                  {STATUS_LABELS[status] || status}
                </div>
                <div className="text-2xl font-bold text-text-primary text-center">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Breakdown */}
        <div className="bg-bg-paper border border-divider rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">התפלגות לפי מרכז</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-right py-2 px-4 text-text-secondary font-medium">מרכז</th>
                  <th className="text-center py-2 px-4 text-text-secondary font-medium">מספר דרישות</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCenter.map((item) => (
                  <tr key={item.center} className="border-b border-divider hover:bg-gray-50">
                    <td className="py-3 px-4 text-text-primary">{item.center}</td>
                    <td className="py-3 px-4 text-text-primary text-center font-semibold">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-bg-paper border border-divider rounded-lg p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">שירותים בעלי הדרישות הרבות ביותר</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider">
                  <th className="text-right py-2 px-4 text-text-secondary font-medium">שירות</th>
                  <th className="text-center py-2 px-4 text-text-secondary font-medium">מספר דרישות</th>
                </tr>
              </thead>
              <tbody>
                {stats.byService.map((item) => (
                  <tr key={item.service} className="border-b border-divider hover:bg-gray-50">
                    <td className="py-3 px-4 text-text-primary">{item.service}</td>
                    <td className="py-3 px-4 text-text-primary text-center font-semibold">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
