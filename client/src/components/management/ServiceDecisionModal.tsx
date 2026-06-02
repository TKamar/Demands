import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { useReferenceData } from '../../hooks/useReferenceData';
import { transferDemand } from '../../api/apiService';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

type DecisionPath = 'select' | 'manual' | 'transfer';
type DemandAction = '' | 'Approved' | 'Rejected' | 'ApprovedWithCondition';

interface DemandDecision {
  action: DemandAction;
  approvedValue?: number;
  reason?: string;
}

interface ServiceDecisionModalProps {
  open: boolean;
  onClose: () => void;
  demands: Demand[];
  serviceName: string;
  projectName: string;
  onApprove: (id: number, payload: ApproveDemandPayload) => Promise<void>;
  onReject: (id: number, payload: RejectDemandPayload) => Promise<void>;
  onSuccess?: () => void;
}

export default function ServiceDecisionModal({
  open,
  onClose,
  demands,
  serviceName,
  projectName,
  onApprove,
  onReject,
  onSuccess,
}: ServiceDecisionModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { services, resources } = useReferenceData();

  const [path, setPath] = useState<DecisionPath>('select');
  const [decisions, setDecisions] = useState<Record<number, DemandDecision>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer path state
  const [targetService, setTargetService] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => {
    if (open) {
      setPath('select');
      setDecisions({});
      setTargetService('');
      setTransferNotes('');
    }
    setIsSubmitting(false);
  }, [open, demands]);

  const setDecisionField = (
    demandId: number,
    field: keyof DemandDecision,
    value: string | number | undefined
  ) => {
    setDecisions(prev => ({
      ...prev,
      [demandId]: { ...((prev[demandId] ?? { action: '' }) as DemandDecision), [field]: value },
    }));
  };

  const actionableCount = demands.filter(d => decisions[d.id]?.action && decisions[d.id]?.action !== '').length;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionableCount === 0) return;
    setIsSubmitting(true);
    try {
      const actionable = demands.filter(d => decisions[d.id]?.action && decisions[d.id]?.action !== '');
      await Promise.allSettled(
        actionable.map(d => {
          const dec = decisions[d.id];
          if (dec.action === 'Rejected') {
            return onReject(d.id, { reason: dec.reason ?? '' });
          }
          return onApprove(d.id, {
            status: dec.action as 'Approved' | 'ApprovedWithCondition',
            approvedValue: dec.approvedValue,
            reason: dec.reason,
          });
        })
      );
      showToast(t('management.success.decided', 'החלטות נשמרו'), 'success');
      onSuccess?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetService) return;
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(demands.map(d => transferDemand(d.id, targetService)));
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        showToast(`${demands.length - failed} הועברו, ${failed} נכשלו`, 'error');
      } else {
        showToast(t('management.success.transferred', 'הדרישות הועברו בהצלחה'), 'success');
      }
      onSuccess?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupResourceNames = useMemo(
    () => [...new Set(demands.map(d => d.resourceName))],
    [demands]
  );

  const availableServices = useMemo(() =>
    services.filter(s =>
      s.isActive !== false &&
      s.name !== serviceName &&
      groupResourceNames.every(rName =>
        resources.some(r => r.serviceName === s.name && r.name === rName)
      )
    ),
    [services, resources, serviceName, groupResourceNames]
  );

  const serviceInfo = (
    <div className="bg-gray-50 rounded-xl p-4 mb-5">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-text-secondary">{t('projects.columns.project')}:</span>{' '}
          <span className="font-medium">{projectName}</span>
        </div>
        <div>
          <span className="text-text-secondary">{t('projects.columns.service')}:</span>{' '}
          <span className="font-medium">{serviceName}</span>
        </div>
        <div>
          <span className="text-text-secondary">{t('service.resources', 'Resources')}:</span>{' '}
          <span className="font-medium">{demands.length}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('management.decisionModal.title', 'קבלת החלטה')}
    >
      {serviceInfo}

      {path === 'select' && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setPath('manual')}
            className="w-full p-4 text-start border-2 border-divider rounded-xl hover:border-primary hover:bg-primary-light/20 transition-colors cursor-pointer bg-bg-paper"
          >
            <div className="font-medium text-text-primary">
              {t('management.decisionModal.manualDecision', 'קבלת החלטה ידנית')}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {t('management.decisionModal.manualDecisionDesc', 'אשר, דחה, או אשר באופן מותנה')}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPath('transfer')}
            className="w-full p-4 text-start border-2 border-divider rounded-xl hover:border-primary hover:bg-primary-light/20 transition-colors cursor-pointer bg-bg-paper"
          >
            <div className="font-medium text-text-primary">
              {t('management.decisionModal.transfer', 'העברה למנהל שירות אחר')}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {t('management.decisionModal.transferDesc', 'העבר את הדרישות לטיפול שירות אחר')}
            </div>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-100 text-text-primary rounded-xl font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {path === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3" dir="rtl">
            {demands.map(demand => {
              const dec = decisions[demand.id] ?? { action: '' as DemandAction };
              const showValueInput = dec.action === 'Approved' || dec.action === 'ApprovedWithCondition';
              const showReasonInput = dec.action !== '';
              return (
                <div key={demand.id} className="border border-divider rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-text-primary flex-1">{demand.resourceName}</span>
                    <span className="text-text-secondary">{demand.value} {demand.unit}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={dec.action}
                      onChange={e => setDecisionField(demand.id, 'action', e.target.value as DemandAction)}
                      className="flex-1 px-3 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      dir="rtl"
                    >
                      <option value="">{t('decision.selectPlaceholder', 'בחר החלטה')}</option>
                      <option value="Approved">{t('decision.approve', 'אישור')}</option>
                      <option value="Rejected">{t('decision.reject', 'דחיה')}</option>
                      <option value="ApprovedWithCondition">{t('decision.conditionalApproval', 'אישור מותנה')}</option>
                    </select>
                    {showValueInput && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={dec.approvedValue ?? ''}
                          onChange={e => setDecisionField(demand.id, 'approvedValue', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder={String(demand.value)}
                          className="w-24 px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                        />
                        <span className="text-xs text-text-secondary">{demand.unit}</span>
                      </div>
                    )}
                  </div>
                  {showReasonInput && (
                    <textarea
                      value={dec.reason ?? ''}
                      onChange={e => setDecisionField(demand.id, 'reason', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-divider rounded-lg bg-bg-default resize-none"
                      dir="rtl"
                      placeholder={t('decision.reasonPlaceholder', 'הזן סיבה...')}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-secondary" dir="rtl">
            {demands.length - actionableCount > 0 &&
              `${demands.length - actionableCount} ${t('service.noDecisionNote', 'דרישות ללא החלטה יישארו בסטטוס הנוכחי')}`
            }
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPath('select')}
              className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
            >
              {t('common.back', 'חזור')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || actionableCount === 0}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block me-2" />
              ) : null}
              {t('management.decisionModal.submit', 'שמור החלטות')} ({actionableCount})
            </button>
          </div>
        </form>
      )}

      {path === 'transfer' && (
        <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('management.decisionModal.targetService', 'שירות יעד')} <span className="text-danger">*</span>
            </label>
            {availableServices.length === 0
              ? <p className="text-sm text-text-secondary">{t('service.noCompatibleTransfer', 'No compatible services available')}</p>
              : <select
                  value={targetService}
                  onChange={e => setTargetService(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
                  dir="rtl"
                >
                  <option value="">{t('management.decisionModal.selectService', 'בחר שירות')}</option>
                  {availableServices.map(s => (
                    <option key={s.name} value={s.name}>{s.displayName ?? s.name}</option>
                  ))}
                </select>
            }
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('management.decisionModal.transferNotes', 'הערות')}
            </label>
            <textarea
              value={transferNotes}
              onChange={e => setTransferNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default resize-none"
              dir="rtl"
              placeholder={t('management.decisionModal.transferNotesPlaceholder', 'הערות להעברה (אופציונלי)...')}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPath('select')}
              className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
            >
              {t('common.back', 'חזור')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetService}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : t('management.decisionModal.transferSubmit', 'העבר')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
