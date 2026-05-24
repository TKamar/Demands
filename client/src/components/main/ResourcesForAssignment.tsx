import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useDemands } from '../../hooks/useDemands';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { assignDemand } from '../../api/apiService';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';

export const ResourcesForAssignment: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();

  const centerName = currentUser?.centerName ?? '';

  // Fetch approved demands for this center
  const { demands, isLoading } = useDemands(
    { status: 'Approved', centerName },
    { page: 1, limit: 500 }
  );

  // Local assignment values (demandId → value)
  const [assignments, setAssignments] = useState<Record<number, number | ''>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<number>>(new Set());

  // Group demands by resourceName
  const grouped = useMemo(() => {
    const map = new Map<string, Demand[]>();
    demands.forEach(d => {
      const list = map.get(d.resourceName) ?? [];
      list.push(d);
      map.set(d.resourceName, list);
    });
    return map;
  }, [demands]);

  const toggleGroup = (resource: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(resource) ? next.delete(resource) : next.add(resource);
      return next;
    });
  };

  const handleSave = async (demandId: number) => {
    const value = assignments[demandId];
    if (value === '' || value === undefined) return;
    setSaving(prev => new Set(prev).add(demandId));
    try {
      await assignDemand(demandId, Number(value));
      showToast(t('resourceAssignment.saved', 'הוקצה בהצלחה'), 'success');
    } catch {
      showToast(t('resourceAssignment.saveError', 'שגיאה בשמירה'), 'error');
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(demandId);
        return next;
      });
    }
  };

  if (!centerName) return null;

  return (
    <div className="mt-6" dir="rtl">
      <h2 className="text-base font-semibold text-text-primary mb-3">
        {t('resourceAssignment.title', 'הקצאת משאבים')}
      </h2>

      {isLoading && (
        <div className="text-sm text-text-secondary">{t('common.loading', 'טוען...')}</div>
      )}

      {!isLoading && grouped.size === 0 && (
        <div className="text-sm text-text-secondary p-4 border border-dashed border-divider rounded-lg">
          {t('resourceAssignment.empty', 'אין משאבים מאושרים להקצאה')}
        </div>
      )}

      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([resourceName, resourceDemands]) => {
          const isExpanded = expandedGroups.has(resourceName);
          const totalApproved = resourceDemands.reduce((sum, d) => sum + (d.approvedValue ?? d.value), 0);
          const unit = resourceDemands[0]?.unit ?? '';

          return (
            <div key={resourceName} className="border border-divider rounded-lg overflow-hidden">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(resourceName)}
                className="w-full flex items-center justify-between px-4 py-3 bg-bg-paper hover:bg-gray-50 transition-colors cursor-pointer border-none text-start"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">{resourceName}</span>
                  <span className="text-xs text-text-secondary">
                    {resourceDemands.length} {t('resourceAssignment.demands', 'דרישות')} · {t('resourceAssignment.total', 'סה"כ')}: {totalApproved} {unit}
                  </span>
                </div>
                {isExpanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
              </button>

              {/* Demand rows */}
              {isExpanded && (
                <div className="divide-y divide-divider">
                  {resourceDemands.map(demand => (
                    <div key={demand.id} className="px-4 py-2.5 flex items-center gap-3 bg-bg-default text-sm">
                      <span className="flex-1 text-text-primary font-medium">{demand.projectName}</span>
                      <span className="text-text-secondary w-24 text-start">
                        {t('resourceAssignment.requested', 'נדרש')}: {demand.value} {unit}
                      </span>
                      <span className="text-text-secondary w-24 text-start">
                        {t('resourceAssignment.approved', 'מאושר')}: {demand.approvedValue ?? '—'} {unit}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={demand.approvedValue ?? undefined}
                          value={assignments[demand.id] ?? ''}
                          onChange={e =>
                            setAssignments(prev => ({
                              ...prev,
                              [demand.id]: e.target.value === '' ? '' : Number(e.target.value),
                            }))
                          }
                          placeholder={t('resourceAssignment.assignPlaceholder', 'הכמות שתוקצה')}
                          className="w-24 px-2 py-1 text-sm border border-divider rounded bg-bg-paper"
                        />
                        <span className="text-text-secondary text-xs">{unit}</span>
                        <button
                          type="button"
                          onClick={() => handleSave(demand.id)}
                          disabled={
                            saving.has(demand.id) ||
                            assignments[demand.id] === '' ||
                            assignments[demand.id] === undefined
                          }
                          className="px-3 py-1 text-xs bg-primary text-white rounded hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer border-none"
                        >
                          {saving.has(demand.id) ? '...' : t('resourceAssignment.save', 'שמור')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
