import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import WalletSummary from './WalletSummary';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';
import type { Demand } from '../../types/domain';

type BulkDecisionType = 'Approved' | 'PartiallyApproved' | 'Rejected';
type ApprovalMode = 'full' | 'amount' | 'percentage';
type DialogStep = 'form' | 'confirming';

interface BulkDecisionModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: (payload: ApproveDemandPayload) => Promise<void>;
  onReject: (payload: RejectDemandPayload) => Promise<void>;
  selectedCount: number;
  isLoading?: boolean;
  // Optional new props
  demands?: Demand[];
  centerName?: string;
}

export default function BulkDecisionModal({
  open,
  onClose,
  onApprove,
  onReject,
  selectedCount,
  isLoading,
  demands,
  centerName,
}: BulkDecisionModalProps) {
  const { t } = useTranslation();

  const [decisionType, setDecisionType] = useState<BulkDecisionType>('Approved');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('full');
  const [amountValue, setAmountValue] = useState('');
  const [percentageValue, setPercentageValue] = useState('');
  const [dialogStep, setDialogStep] = useState<DialogStep>('form');

  useEffect(() => {
    if (open) {
      setDecisionType('Approved');
      setReason('');
      setApprovalMode('full');
      setAmountValue('');
      setPercentageValue('');
      setDialogStep('form');
    }
    setIsSubmitting(false);
  }, [open]);

  const totalRequested = demands?.reduce((sum, d) => sum + d.value, 0) ?? 0;

  function computeApprovedValue(): number | undefined {
    if (decisionType === 'Rejected') return undefined;
    if (approvalMode === 'full') return undefined;
    if (approvalMode === 'amount') {
      const v = parseFloat(amountValue);
      return isNaN(v) ? undefined : v;
    }
    if (approvalMode === 'percentage') {
      const pct = parseFloat(percentageValue);
      if (isNaN(pct) || totalRequested === 0) return undefined;
      return Math.round((pct / 100) * totalRequested * 100) / 100;
    }
    return undefined;
  }

  const isValid = () => {
    if (decisionType === 'Rejected' && (!reason || !reason.trim())) return false;
    if (decisionType === 'PartiallyApproved' && (!reason || !reason.trim())) return false;
    if (approvalMode === 'amount') {
      const v = parseFloat(amountValue);
      if (isNaN(v) || v <= 0) return false;
    }
    if (approvalMode === 'percentage') {
      const pct = parseFloat(percentageValue);
      if (isNaN(pct) || pct <= 0 || pct > 100) return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dialogStep === 'form') {
      setDialogStep('confirming');
      return;
    }
    // dialogStep === 'confirming'
    setIsSubmitting(true);
    try {
      const approvedValue = computeApprovedValue();
      if (decisionType === 'Rejected') {
        await onReject({ reason: reason.trim() });
      } else {
        await onApprove({
          status: decisionType,
          ...(approvedValue !== undefined ? { approvedValue } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresReason = decisionType === 'Rejected' || decisionType === 'PartiallyApproved';

  const decisionTypeConfig: { type: BulkDecisionType; colorClass: string }[] = [
    { type: 'Approved', colorClass: 'border-primary bg-primary/5' },
    { type: 'PartiallyApproved', colorClass: 'border-orange-400 bg-orange-50' },
    { type: 'Rejected', colorClass: 'border-danger bg-danger/5' },
  ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('management.bulkDecision.title')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {dialogStep === 'form' && (
          <>
            {/* Stats row */}
            {demands && demands.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-2 mb-1">
                <div>
                  <span className="text-text-secondary">{t('management.bulkDecision.selectedCount')}: </span>
                  <span className="font-semibold">{selectedCount}</span>
                </div>
                <div>
                  <span className="text-text-secondary">{t('management.bulkDecision.totalRequested')}: </span>
                  <span className="font-semibold">{totalRequested}</span>
                </div>
              </div>
            )}

            {/* Wallet Summary */}
            {centerName && <WalletSummary centerName={centerName} />}

            {/* Decision Type */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-text-primary">
                {t('management.decisionModal.decisionType')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {decisionTypeConfig.map(({ type, colorClass }) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      decisionType === type
                        ? colorClass
                        : 'border-divider hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkDecisionType"
                      value={type}
                      checked={decisionType === type}
                      onChange={() => setDecisionType(type)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">
                      {t(`management.bulkDecision.decisionType.${type}`)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Approval Mode (only when not Rejected) */}
            {decisionType !== 'Rejected' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">
                  {t('management.bulkDecision.approvalMode')}
                </label>
                <div className="flex gap-3">
                  {(['full', 'amount', 'percentage'] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        checked={approvalMode === mode}
                        onChange={() => setApprovalMode(mode)}
                      />
                      {t(`management.bulkDecision.mode.${mode}`)}
                    </label>
                  ))}
                </div>
                {approvalMode === 'amount' && (
                  <input
                    type="number"
                    min="1"
                    value={amountValue}
                    onChange={(e) => setAmountValue(e.target.value)}
                    placeholder={t('management.bulkDecision.amountPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-divider text-sm"
                  />
                )}
                {approvalMode === 'percentage' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={percentageValue}
                      onChange={(e) => setPercentageValue(e.target.value)}
                      placeholder="50"
                      className="w-24 px-4 py-2.5 rounded-xl border border-divider text-sm"
                    />
                    <span className="text-sm text-text-secondary">%</span>
                    {percentageValue && !isNaN(parseFloat(percentageValue)) && totalRequested > 0 && (
                      <span className="text-sm text-primary">
                        ≈ {Math.round((parseFloat(percentageValue) / 100) * totalRequested * 100) / 100}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reason (for Rejected and PartiallyApproved) */}
            {requiresReason && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">
                  {t('management.decisionModal.reason')} <span className="text-danger">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-divider bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('management.decisionModal.reasonPlaceholder')}
                  rows={3}
                  required
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!isValid()}
                className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  decisionType === 'Rejected'
                    ? 'bg-danger hover:bg-red-700'
                    : decisionType === 'PartiallyApproved'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {t('common.next')}
              </button>
            </div>
          </>
        )}

        {dialogStep === 'confirming' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              {t('management.bulkDecision.confirmMessage', {
                count: selectedCount,
                decision: t(`management.bulkDecision.decisionType.${decisionType}`),
              })}
            </p>
            {computeApprovedValue() !== undefined && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                {t('management.bulkDecision.approvedValueSummary', { value: computeApprovedValue() })}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDialogStep('form')}
                className="px-6 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
              >
                {t('common.back')}
              </button>
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  decisionType === 'Rejected'
                    ? 'bg-danger hover:bg-red-700'
                    : decisionType === 'PartiallyApproved'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {(isLoading || isSubmitting) && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block me-2"></div>
                )}
                {t('common.confirm')}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
