import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

type DecisionType = 'Approved' | 'Rejected' | 'ApprovedWithCondition' | '';

interface DecisionModalProps {
    open: boolean;
    onClose: () => void;
    onApprove: (payload: ApproveDemandPayload) => Promise<void>;
    onReject: (payload: RejectDemandPayload) => Promise<void>;
    demand: Demand | null;
    isLoading?: boolean;
}

export default function DecisionModal({ open, onClose, onApprove, onReject, demand, isLoading }: DecisionModalProps) {
    const { t } = useTranslation();

    const [decision, setDecision] = useState<DecisionType>('');
    const [approvedValue, setApprovedValue] = useState<number | undefined>(undefined);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setDecision('');
            setReason('');
            setApprovedValue(undefined);
        }
        setIsSubmitting(false);
    }, [demand, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!demand || decision === '') return;

        setIsSubmitting(true);
        try {
            if (decision === 'Rejected') {
                await onReject({ reason });
            } else {
                await onApprove({ status: decision as 'Approved' | 'ApprovedWithCondition', approvedValue, reason });
            }
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = () => {
        if (decision === '') return false;
        return true;
    };

    if (!demand) return null;

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={t('management.decisionModal.title')}
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Demand Summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
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
                            <span className="font-medium">{demand.value}</span>
                        </div>
                        <div>
                            <span className="text-text-secondary">{t('projects.columns.unit')}:</span>{' '}
                            <span className="font-medium">{demand.unit}</span>
                        </div>
                        <div>
                            <span className="text-text-secondary">{t('projects.columns.project')}:</span>{' '}
                            <span className="font-medium">{demand.projectName}</span>
                        </div>
                    </div>
                </div>

                {/* Decision Dropdown */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">
                        {t('management.decisionModal.decisionType')}
                    </label>
                    <select
                        value={decision}
                        onChange={e => setDecision(e.target.value as DecisionType)}
                        className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
                        dir="rtl"
                    >
                        <option value="">{t('decision.selectPlaceholder', 'בחר החלטה')}</option>
                        <option value="Approved">{t('decision.approve', 'אישור')}</option>
                        <option value="Rejected">{t('decision.reject', 'דחיה')}</option>
                        <option value="ApprovedWithCondition">{t('decision.conditionalApproval', 'אישור מותנה')}</option>
                    </select>
                </div>

                {/* Approved Quantity — only for Approve and Conditional Approval */}
                {(decision === 'Approved' || decision === 'ApprovedWithCondition') && (
                    <div>
                        <label className="text-sm font-medium text-text-primary">
                            {t('decision.approvedQuantity', 'כמות מאושרת')}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                value={approvedValue ?? ''}
                                onChange={e => setApprovedValue(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-32 px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
                            />
                            <span className="text-sm text-text-secondary">{demand.unit ?? ''}</span>
                        </div>
                    </div>
                )}

                {/* Reason — always visible when a decision is selected */}
                {decision !== '' && (
                    <div>
                        <label className="text-sm font-medium text-text-primary">
                            {t('decision.reason', 'סיבה')}
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default resize-none"
                            dir="rtl"
                            placeholder={t('decision.reasonPlaceholder', 'הזן סיבה...')}
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
                        disabled={isLoading || isSubmitting || !isValid()}
                        className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            decision === 'Rejected'
                                ? 'bg-danger hover:bg-red-700'
                                : 'bg-primary hover:bg-primary-dark'
                        }`}
                    >
                        {(isLoading || isSubmitting) && (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block me-2"></div>
                        )}
                        {t('management.decisionModal.submit')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
