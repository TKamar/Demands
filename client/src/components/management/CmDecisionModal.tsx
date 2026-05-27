import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { centerManagerApproveDemand, centerManagerRejectDemand } from '../../api/apiService';
import type { Demand } from '../../types/domain';

interface CmDecisionModalProps {
  open: boolean;
  onClose: () => void;
  demand: Demand | null;
  onSuccess: () => void;
}

type CmStep = 'choice' | 'reject';

export default function CmDecisionModal({ open, onClose, demand, onSuccess }: CmDecisionModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [step, setStep] = useState<CmStep>('choice');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('choice');
      setReason('');
    }
  }, [open, demand]);

  if (!demand) return null;

  async function handleApprove() {
    setIsSubmitting(true);
    try {
      await centerManagerApproveDemand(demand!.id);
      showToast(t('management.success.approved'), 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await centerManagerRejectDemand(demand!.id, reason.trim());
      showToast(t('management.success.rejected'), 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={t('management.cmDecision.title', 'החלטת מנהל מרכז')}>
      {/* Demand summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-text-secondary">{t('projects.columns.project')}:</span>{' '}
            <span className="font-medium">{demand.projectName}</span>
          </div>
          <div>
            <span className="text-text-secondary">{t('projects.columns.service')}:</span>{' '}
            <span className="font-medium">{demand.serviceName}</span>
          </div>
          <div>
            <span className="text-text-secondary">{t('projects.columns.resource')}:</span>{' '}
            <span className="font-medium">{demand.resourceName}</span>
          </div>
          <div>
            <span className="text-text-secondary">{t('projects.columns.value')}:</span>{' '}
            <span className="font-medium">{demand.value} {demand.unit}</span>
          </div>
        </div>
      </div>

      {step === 'choice' && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '...' : t('actions.approve', 'אישור')}
          </button>
          <button
            type="button"
            onClick={() => setStep('reject')}
            className="w-full py-3 px-4 bg-danger text-white rounded-xl font-medium hover:bg-red-700 transition-colors cursor-pointer border-none"
          >
            {t('actions.reject', 'דחיה')}
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

      {step === 'reject' && (
        <form onSubmit={handleReject} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('decision.reason', 'סיבה')} <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default resize-none"
              dir="rtl"
              placeholder={t('decision.reasonPlaceholder', 'הזן סיבת דחיה...')}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep('choice')}
              className="px-5 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
            >
              {t('common.back', 'חזור')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : t('actions.reject', 'דחיה')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
