import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { MdEdit, MdDelete, MdCancel, MdGavel } from 'react-icons/md';
import MoreActionsMenu from '../common/MoreActionsMenu';
import type { MoreAction } from '../common/MoreActionsMenu';
import { useDemands } from '../../hooks/useDemands';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import DecisionModal from '../management/DecisionModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type {
  CreateDemandPayload,
  UpdateDemandPayload,
  ApproveDemandPayload,
  RejectDemandPayload,
} from '../../api/types';

export const ACTIVE_STATUSES = new Set(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite']);
export const TERMINAL_STATUSES = new Set(['Approved', 'PartiallyApproved', 'ApprovedWithCondition', 'Rejected', 'CenterManagerRejected', 'Cancelled']);

export interface DemandSubTableProps {
  projectName: string;
  canDecide: boolean;
  mode?: 'active' | 'history';
  createdBy?: string;
}

export default function DemandSubTable({
  projectName,
  canDecide,
  mode = 'active',
  createdBy,
}: DemandSubTableProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const currentUsername = auth.user?.profile.preferred_username ?? '';

  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decidingDemand, setDecidingDemand] = useState<Demand | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);

  const { demands: allDemands, isLoading, updateDemand, deleteDemand, cancelDemand, approveDemand, rejectDemand } = useDemands(
    { projectName, createdBy },
    { page: 1, limit: 100 }
  );

  const demands = useMemo(
    () => allDemands.filter(d => mode === 'history' ? TERMINAL_STATUSES.has(d.status) : ACTIVE_STATUSES.has(d.status)),
    [allDemands, mode]
  );

  async function handleSubmitDemand(payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) {
    if (demandId) {
      try {
        await updateDemand(demandId, payload as UpdateDemandPayload);
        showToast(t('demand.updated', 'Requirement updated'), 'success');
        setEditingDemand(null);
      } catch {
        showToast(t('demand.updateError', 'Failed to update requirement'), 'error');
      }
    }
  }

  async function handleDeleteDemand(demand: Demand) {
    if (!window.confirm(t('demand.deleteConfirm', 'Delete this requirement?'))) return;
    try {
      await deleteDemand(demand.id);
      showToast(t('demand.deleted', 'Requirement deleted'), 'success');
    } catch {
      showToast(t('demand.deleteError', 'Failed to delete requirement'), 'error');
    }
  }

  async function handleCancelDemand(demand: Demand) {
    if (!window.confirm(t('demand.cancelConfirm', 'Cancel this requirement?'))) return;
    try {
      await cancelDemand(demand.id);
      showToast(t('demand.cancelled', 'Requirement cancelled'), 'success');
    } catch {
      showToast(t('demand.cancelError', 'Failed to cancel requirement'), 'error');
    }
  }

  async function handleApprove(payload: ApproveDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await approveDemand(decidingDemand.id, payload);
      showToast(t('management.success.approved'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  async function handleReject(payload: RejectDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await rejectDemand(decidingDemand.id, payload);
      showToast(t('management.success.rejected'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  function buildActions(demand: Demand): MoreAction[] {
    const isPending = demand.status === 'Pending';
    const isOwner = demand.createdBy === currentUsername;
    if (canDecide) {
      if (!isPending) return [];
      return [
        { label: t('management.decide', 'Decide'), icon: <MdGavel size={12} />, onClick: () => setDecidingDemand(demand) },
        { label: t('common.delete', 'Delete'), icon: <MdDelete size={12} />, danger: true, onClick: () => handleDeleteDemand(demand) },
      ];
    }
    if (!isPending || !isOwner) return [];
    return [
      { label: t('common.edit', 'Edit'), icon: <MdEdit size={12} />, onClick: () => setEditingDemand(demand) },
      { label: t('common.cancel', 'Cancel'), icon: <MdCancel size={12} />, danger: true, onClick: () => handleCancelDemand(demand) },
    ];
  }

  if (isLoading) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary border-t border-dashed border-primary/30">
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  if (demands.length === 0) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary italic border-t border-dashed border-primary/30">
        {t('demands.empty', 'No requirements')}
      </div>
    );
  }

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/[0.02]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-primary/5 text-text-secondary">
            <th className="ps-12 pe-3 py-2 text-start font-semibold">{t('demand.service', 'Service')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.resource', 'Resource')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.value', 'Value')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.status', 'Status')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('common.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {demands.map((demand) => {
            const rowActions = buildActions(demand);
            return (
              <tr
                key={demand.id}
                className="border-t border-divider/50 hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => setSelectedDemand(demand)}
              >
                <td className="ps-12 pe-3 py-2 text-text-primary">{demand.serviceName}</td>
                <td className="px-3 py-2 text-text-secondary">{demand.resourceName}</td>
                <td className="px-3 py-2 font-medium">{demand.value.toLocaleString()}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <span className={`text-[10px] font-medium ${
                    demand.status === 'Approved' ? 'text-green-700'
                    : demand.status === 'Pending' ? 'text-amber-600'
                    : demand.status === 'Rejected' ? 'text-red-600'
                    : demand.status === 'PartiallyApproved' ? 'text-blue-600'
                    : 'text-gray-500'
                  }`}>
                    {demand.status}
                  </span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <MoreActionsMenu actions={rowActions} size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        onEdit={(d) => { setEditingDemand(d); setSelectedDemand(null); }}
        isModerator={canDecide}
        onMakeDecision={canDecide ? (d) => { setDecidingDemand(d); setSelectedDemand(null); } : undefined}
      />

      {editingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <DecisionModal
        open={decidingDemand !== null}
        onClose={() => setDecidingDemand(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        demand={decidingDemand}
        isLoading={isDecisionLoading}
      />
    </div>
  );
}
