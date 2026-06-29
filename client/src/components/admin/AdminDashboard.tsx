import React, { useEffect, useState } from 'react';
import { fetchAdminStats, type AdminStats } from '../../api/apiService';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { AppUser } from '../../types/domain';

const STATUS_LABELS: Record<string, string> = {
  Pending: 'בהמתנה',
  PendingCenterManager: 'בהמתנה - מנהל מרכז',
  Approved: 'אושר',
  ApprovedWithCondition: 'אושר בתנאי',
  PartiallyApproved: 'אושר חלקית',
  Rejected: 'דחה',
  Cancelled: 'בוטל',
  AwaitingProcurement: 'מחכה לרכש',
  HeldForEfficiency: 'מושהה – התייעלות',
  ConditionalFootprintReduction: 'תנאי הורדת רגל',
  InProgress: 'בתהליך',
  TransferredTo810: 'הועבר ל-810',
  WaitingOnPrerequisite: 'בהמתנה לתנאי מוקדם',
  CenterManagerRejected: 'נדחה - מנהל מרכז',
  ApprovedAndAssigned: 'אושר וחילק',
};

const SERVICE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
];

const STATUS_COLORS: Record<string, string> = {
  Pending: '#fbbf24',
  PendingCenterManager: '#fb923c',
  Approved: '#4ade80',
  ApprovedWithCondition: '#60a5fa',
  PartiallyApproved: '#06b6d4',
  Rejected: '#ef4444',
  Cancelled: '#9ca3af',
  AwaitingProcurement: '#d946ef',
  HeldForEfficiency: '#f59e0b',
  ConditionalFootprintReduction: '#8b5cf6',
  InProgress: '#3b82f6',
  TransferredTo810: '#06b6d4',
  WaitingOnPrerequisite: '#ec4899',
  CenterManagerRejected: '#dc2626',
  ApprovedAndAssigned: '#10b981',
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

interface AdminDashboardProps {
  selectedCenters?: string[];
  currentUser: AppUser | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ selectedCenters = [], currentUser }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdminStats(
          selectedCenters.length > 0 ? selectedCenters : undefined,
          isAdmin && selectedServices.length > 0 ? selectedServices : undefined,
        );
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [selectedCenters, selectedServices, isAdmin]);

  useEffect(() => {
    if (stats?.byService) {
      setAvailableServices(stats.byService.map((s) => s.service));
    }
  }, [stats]);

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

  // Prepare chart data for Pie chart
  const pieChartData = Object.entries(stats.byStatus).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
  }));

  // Prepare chart data for Bar chart (open conditional statuses)
  const barChartData = Object.entries(stats.openConditional).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    count,
  }));

  // Prepare service pie chart data
  const servicePieData = stats.byService.map((item) => ({
    name: item.service,
    value: item.count,
  }));


  return (
    <div className="flex-1 overflow-auto bg-bg-default p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-6">סטטיסטיקות</h1>

        {isAdmin && availableServices.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap" dir="rtl">
            <span className="text-sm text-text-secondary font-medium">סינון לפי שירות:</span>
            {availableServices.map((svc) => (
              <button
                key={svc}
                onClick={() =>
                  setSelectedServices((prev) =>
                    prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
                  )
                }
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedServices.includes(svc)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-bg-paper text-text-secondary border-divider hover:border-primary'
                }`}
              >
                {svc}
              </button>
            ))}
            {selectedServices.length > 0 && (
              <button
                onClick={() => setSelectedServices([])}
                className="px-3 py-1 text-xs rounded-full text-danger border border-danger hover:bg-danger hover:text-white transition-colors"
              >
                נקה
              </button>
            )}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard title="סך הכל דרישות" value={stats.totalDemands} />
          <MetricCard title="סך הכל פרויקטים" value={stats.totalProjects} />
          <MetricCard title="דרישות בהמתנה" value={stats.pendingCount} />
          <MetricCard title="דרישות מאושרות" value={stats.approvedCount} />
        </div>

        {/* Status Distribution Charts */}
        <div className="bg-bg-paper border border-divider rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-6">התפלגות לפי סטטוס</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={Object.values(stats.byStatus)[index] ? STATUS_COLORS[Object.keys(stats.byStatus)[index]] || '#9ca3af' : '#9ca3af'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Details Table */}
            <div>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex flex-col gap-1">
                    <div className={`px-3 py-2 rounded text-sm font-medium ${
                      Object.entries(STATUS_COLORS).find(([s]) => s === status)
                        ? `text-white`
                        : 'bg-bg-paper text-text-primary'
                    }`}
                    style={{ backgroundColor: STATUS_COLORS[status] || '#d1d5db', color: 'white' }}
                    >
                      {STATUS_LABELS[status] || status}
                    </div>
                    <div className="text-xl font-bold text-text-primary text-center">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Service Distribution */}
        {servicePieData.length > 0 && (
          <div className="bg-bg-paper border border-divider rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-6">התפלגות לפי שירות</h2>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={servicePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    dataKey="value"
                  >
                    {servicePieData.map((_, index) => (
                      <Cell key={`svc-cell-${index}`} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Open Conditional Statuses Bar Chart */}
        {barChartData.length > 0 && (
          <div className="bg-bg-paper border border-divider rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-text-primary mb-6">דרישות בהמתנה מותנות</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} layout="horizontal" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={180} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

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
                  <tr key={item.center} className="border-b border-divider hover:bg-bg-default">
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
                  <tr key={item.service} className="border-b border-divider hover:bg-bg-default">
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
