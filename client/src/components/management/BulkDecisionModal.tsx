import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';

type BulkDecisionType = 'Approved' | 'Rejected' | 'ApprovedWithCondition';

interface BulkDecisionModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: (payload: { status: 'Approved' | 'ApprovedWithCondition'; approvedValue?: number; reason?: string }) => Promise<void>;
  onReject: (payload: { reason: string }) => Promise<void>;
  selectedCount: number;
  isLoading?: boolean;
}

export default function BulkDecisionModal({
  open,
  onClose,
  onApprove,
  onReject,
  selectedCount,
  isLoading,
}: BulkDecisionModalProps) {
  const { t } = useTranslation();

  const [decisionType, setDecisionType] = useState<BulkDecisionType>('Approved');
  const [reason, setReason] = useState('');
  const [approvedValue, setApprovedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDecisionType('Approved');
      setReason('');
      setApprovedValue('');
    }
    setIsSubmitting(false);
  }, [open]);

  const showApprovedValue = decisionType === 'Approved' || decisionType === 'ApprovedWithCondition';

  const isValid = () => {
    if (decisionType === 'Rejected' && (!reason || reason.trim() === '')) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (decisionType === 'Rejected') {
        await onReject({ reason: reason.trim() });
      } else {
        await onApprove({
          status: decisionType,
          approvedValue: approvedValue ? Number(approvedValue) : undefined,
          reason: reason.trim() || undefined,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const decisionOptions: { value: BulkDecisionType; label: string }[] = [
    { value: 'Approved', label: t('management.decisionModal.Approved', 'אישור') },
    { value: 'Rejected', label: t('management.decisionModal.Rejected', 'דחיה') },
    { value: 'ApprovedWithCondition', label: t('management.decisionModal.ApprovedWithCondition', 'אישור מותנה') },
  ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('bulk.title', 'קבלת החלטה עבור דרישות מרובות')}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" dir="rtl">
        {/* Summary header */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-text-secondary flex flex-col gap-1">
          <span className="font-medium text-text-primary">
            {t('management.bulkDecision.summary', { count: selectedCount })}
          </span>
        </div>

        {/* Decision Type dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            {t('management.decisionModal.decisionType', 'סוג החלטה')}
          </label>
          <select
            value={decisionType}
            onChange={(e) => setDecisionType(e.target.value as BulkDecisionType)}
            className="w-full px-4 py-2.5 rounded-xl border border-divider bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          >
            {decisionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Approved Quantity — Approve and Conditional Approval only */}
        {showApprovedValue && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              {t('management.decisionModal.approvedValue', 'כמות מאושרת')}
            </label>
            <input
              type="number"
              min={0}
              value={approvedValue}
              onChange={(e) => setApprovedValue(e.target.value)}
              placeholder={t('management.decisionModal.approvedValuePlaceholder', 'השאר ריק לאישור מלא')}
              className="w-full px-4 py-2.5 rounded-xl border border-divider bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>
        )}

        {/* Reason — all decision types */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            {t('management.decisionModal.reason', 'סיבה')}
            {decisionType === 'Rejected' && <span className="text-danger"> *</span>}
          </label>
          <textarea
            className="w-full px-4 py-2.5 rounded-xl border border-divider bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('management.decisionModal.reasonPlaceholder', 'הוסף הערה...')}
            rows={3}
            required={decisionType === 'Rejected'}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-start gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 text-text-primary rounded-xl text-sm font-medium hover:bg-bg-default transition-colors cursor-pointer border-none"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || isSubmitting || !isValid()}
            className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
              decisionType === 'Rejected'
                ? 'bg-danger hover:bg-red-700'
                : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {(isLoading || isSubmitting) && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block me-2"></div>
            )}
            {t('management.bulkDecision.submit', 'החל על הכל')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
