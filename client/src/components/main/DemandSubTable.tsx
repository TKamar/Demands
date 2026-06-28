import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore, MdChevronLeft, MdEdit, MdDelete, MdGavel } from 'react-icons/md';
import ConfirmDialog from '../common/ConfirmDialog';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ManageServiceDemandsModal from '../projects/ManageServiceDemandsModal';
import ServiceDecisionModal from '../management/ServiceDecisionModal';
import { useDemands } from '../../hooks/useDemands';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

export const ACTIVE_STATUSES = new Set(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite']);
export const TERMINAL_STATUSES = new Set(['Approved', 'PartiallyApproved', 'ApprovedWithCondition', 'Rejected', 'CenterManagerRejected', 'Cancelled']);

type QuickApproveDemandPayload = {
  status: 'Approved';
  approvedValue: number;
};

function statusColor(status: string): string {
  if (['Approved', 'PartiallyApproved', 'ApprovedWithCondition'].includes(status)) return 'text-green-700';
  if (['Rejected', 'CenterManagerRejected'].includes(status)) return 'text-red-600';
  if (['Pending', 'PendingCenterManager', 'WaitingOnPrerequisite'].includes(status)) return 'text-amber-600';
  if (status === 'Cancelled') return 'text-gray-400';
  return 'text-text-secondary';
}

export interface DemandSubTableProps {
  projectName: string;
  canDecide: boolean;
  mode?: 'active' | 'history';
  createdBy?: string;
  onActiveDemandCountChange?: (projectName: string, count: number) => void;
}

export default function DemandSubTable({
  projectName,
  canDecide,
  mode = 'active',
  createdBy,
  onActiveDemandCountChange,
}: DemandSubTableProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { demands: allDemands, isLoading, deleteDemand, approveDemand, rejectDemand } = useDemands(
    { projectName, createdBy },
    { page: 1, limit: 100 }
  );

  const demands = useMemo(
    () => allDemands.filter(d =>
      mode === 'history' ? TERMINAL_STATUSES.has(d.status) : ACTIVE_STATUSES.has(d.status)
    ),
    [allDemands, mode]
  );

  useEffect(() => {
    if (isLoading || mode !== 'active') return;
    onActiveDemandCountChange?.(projectName, demands.length);
  }, [demands.length, isLoading, mode, projectName, onActiveDemandCountChange]);

  // Group demands by serviceName
  const serviceGroups = useMemo(() => {
    const groups = new Map<string, Demand[]>();
    for (const demand of demands) {
      const list = groups.get(demand.serviceName) ?? [];
      groups.set(demand.serviceName, [...list, demand]);
    }
    return groups;
  }, [demands]);

  // Service row expand state
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const toggleService = useCallback((name: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  // Resource row sidebar
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  // Delete group confirm
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<string | null>(null);
  const handleConfirmDeleteGroup = useCallback(async () => {
    if (!deleteServiceTarget) return;
    const group = serviceGroups.get(deleteServiceTarget) ?? [];
    setDeleteServiceTarget(null);
    const results = await Promise.allSettled(group.map(d => deleteDemand(d.id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`${results.length - failed} נמחקו, ${failed} נכשלו`, 'error');
    } else {
      showToast(t('service.deleteGroupSuccess', 'כל הדרישות נמחקו'), 'success');
    }
  }, [deleteServiceTarget, serviceGroups, deleteDemand, showToast, t]);

  // Quick approve confirm
  const [quickApproveTarget, setQuickApproveTarget] = useState<string | null>(null);
  const handleConfirmQuickApprove = useCallback(async () => {
    if (!quickApproveTarget) return;
    const group = serviceGroups.get(quickApproveTarget) ?? [];
    const pending = group.filter(d => ACTIVE_STATUSES.has(d.status));
    setQuickApproveTarget(null);
    const results = await Promise.allSettled(
      pending.map(d => {
        const payload: QuickApproveDemandPayload = { status: 'Approved', approvedValue: d.value };
        return approveDemand(d.id, payload as ApproveDemandPayload);
      })
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      showToast(`${pending.length - failed} אושרו, ${failed} נכשלו`, 'error');
    } else {
      showToast(t('service.quickApproveSuccess', 'כל הדרישות אושרו'), 'success');
    }
  }, [quickApproveTarget, serviceGroups, approveDemand, showToast, t]);

  // Edit (Manage) modal target — wired in Task 4
  const [managingServiceName, setManagingServiceName] = useState<string | null>(null);

  // Deep Decision modal target — wired in Task 5
  const [decidingServiceName, setDecidingServiceName] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary border-t border-dashed border-primary/30">
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  if (serviceGroups.size === 0) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary italic border-t border-dashed border-primary/30">
        {t('demands.empty', 'No requirements')}
      </div>
    );
  }

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/[0.02]">
      {Array.from(serviceGroups.entries()).map(([svcName, svcDemands]) => {
        const isExpanded = expandedServices.has(svcName);
        return (
          <div key={svcName} className="border-b border-divider/30 last:border-0">
            {/* ── Service row (Level 2) ── */}
            <div className="flex items-center gap-2 px-4 py-2 ps-8 bg-primary/[0.04] hover:bg-primary/[0.07] transition-colors">
              <button
                onClick={() => toggleService(svcName)}
                className="w-5 shrink-0 flex items-center justify-center text-primary bg-transparent border-none cursor-pointer p-0"
              >
                {isExpanded ? <MdExpandMore size={16} /> : <MdChevronLeft size={16} />}
              </button>
              <span className="flex-1 text-sm font-semibold text-text-primary">{svcName}</span>
              <span className="text-xs text-text-secondary me-2">
                ({svcDemands.length} {t('service.resources', 'resources')})
              </span>
              {/* Actions */}
              <div className="flex items-center gap-1">
                <span className="relative group">
                  <button
                    onClick={() => setManagingServiceName(svcName)}
                    className="p-1 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer rounded"
                  >
                    <MdEdit size={14} />
                  </button>
                  <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                    {t('common.edit', 'Edit')}
                  </span>
                </span>
                <span className="relative group">
                  <button
                    onClick={() => setDeleteServiceTarget(svcName)}
                    className="p-1 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer rounded"
                  >
                    <MdDelete size={14} />
                  </button>
                  <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                    {t('common.delete', 'Delete')}
                  </span>
                </span>
                {canDecide && (
                  <>
                    <span className="relative group">
                      <button
                        onClick={() => setQuickApproveTarget(svcName)}
                        className="px-2 py-0.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded border-none cursor-pointer transition-colors"
                      >
                        ⚡
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('service.quickApprove', 'Quick Approve')}
                      </span>
                    </span>
                    <span className="relative group">
                      <button
                        onClick={() => setDecidingServiceName(svcName)}
                        className="px-2 py-0.5 text-xs font-semibold text-white bg-indigo-900 hover:bg-indigo-950 rounded border-none cursor-pointer transition-colors flex items-center"
                      >
                        <MdGavel size={12} />
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('service.deepDecision', 'Deep Decision')}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* ── Resource rows (Level 3) ── */}
            {isExpanded && svcDemands.map(demand => (
              <div
                key={demand.id}
                onClick={() => setSelectedDemand(demand)}
                className="flex items-center gap-3 px-4 py-1.5 ps-16 border-t border-divider/20 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <span className="flex-1 text-xs text-text-primary">{demand.resourceName}</span>
                <span className="w-24 text-xs text-text-secondary">
                  {demand.value.toLocaleString()} {demand.unit}
                </span>
                <span className={`text-[10px] font-medium w-28 ${statusColor(demand.status)}`}>
                  {demand.status}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        isModerator={canDecide}
      />

      <ConfirmDialog
        isOpen={deleteServiceTarget !== null}
        title={t('service.deleteGroupTitle', 'מחיקת שירות')}
        message={t('service.deleteGroupMessage', 'מחיקת כל הדרישות בשירות זה היא בלתי הפיכה. להמשיך?')}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setDeleteServiceTarget(null)}
        danger
      />

      <ConfirmDialog
        isOpen={quickApproveTarget !== null}
        title={t('service.quickApproveTitle', 'אישור מהיר')}
        message={t('service.quickApproveMessage', 'לאשר את כל הדרישות הממתינות בשירות זה בכמות המבוקשת?')}
        onConfirm={handleConfirmQuickApprove}
        onCancel={() => setQuickApproveTarget(null)}
      />

      {managingServiceName !== null && (
        <ManageServiceDemandsModal
          isOpen={true}
          onClose={() => setManagingServiceName(null)}
          projectName={projectName}
          serviceName={managingServiceName}
        />
      )}

      {decidingServiceName !== null && (() => {
        const svcDemands = serviceGroups.get(decidingServiceName) ?? [];
        return (
          <ServiceDecisionModal
            open={true}
            onClose={() => setDecidingServiceName(null)}
            demands={svcDemands}
            serviceName={decidingServiceName}
            projectName={projectName}
            onApprove={(id, payload) => approveDemand(id, payload)}
            onReject={(id, payload) => rejectDemand(id, payload)}
            onSuccess={() => setDecidingServiceName(null)}
          />
        );
      })()}
    </div>
  );
}
