import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { useReferenceData } from '../../hooks/useReferenceData';
import { transferDemand } from '../../api/apiService';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

type DecisionType = 'Approved' | 'Rejected' | 'ApprovedWithCondition' | '';
type DecisionPath = 'select' | 'manual' | 'transfer';

interface DecisionModalProps {
    open: boolean;
    onClose: () => void;
    onApprove: (payload: ApproveDemandPayload) => Promise<void>;
    onReject: (payload: RejectDemandPayload) => Promise<void>;
    demand: Demand | null;
    isLoading?: boolean;
    onSuccess?: () => void;
}

export default function DecisionModal({ open, onClose, onApprove, onReject, demand, isLoading, onSuccess }: DecisionModalProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { services } = useReferenceData();

    const [path, setPath] = useState<DecisionPath>('select');
    const [decision, setDecision] = useState<DecisionType>('');
    const [approvedValue, setApprovedValue] = useState<number | undefined>(undefined);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Transfer path state
    const [targetService, setTargetService] = useState('');
    const [transferNotes, setTransferNotes] = useState('');

    useEffect(() => {
        if (open) {
            setPath('select');
            setDecision('');
            setReason('');
            setApprovedValue(undefined);
            setTargetService('');
            setTransferNotes('');
        }
        setIsSubmitting(false);
    }, [demand, open]);

    const handleManualSubmit = async (e: React.FormEvent) => {
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

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!demand || !targetService) return;

        setIsSubmitting(true);
        try {
            await transferDemand(demand.id, targetService);
            showToast(t('management.success.transferred', 'הדרישה הועברה בהצלחה'), 'success');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            showToast(err?.response?.data?.error || t('management.error.transferFailed', 'העברה נכשלה'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!demand) return null;

    const availableServices = services.filter(
        s => s.isActive !== false && s.name !== demand.serviceName
    );

    const demandSummary = (
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="grid grid-cols-2 gap-2 text-sm">
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
    );

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={t('management.decisionModal.title')}
        >
            {demandSummary}

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
                            {t('management.decisionModal.transferDesc', 'העבר את הדרישה לטיפול שירות אחר')}
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
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
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
                            disabled={isLoading || isSubmitting || decision === ''}
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
            )}

            {path === 'transfer' && (
                <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                            {t('management.decisionModal.targetService', 'שירות יעד')} <span className="text-danger">*</span>
                        </label>
                        <select
                            value={targetService}
                            onChange={e => setTargetService(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
                            dir="rtl"
                        >
                            <option value="">{t('management.decisionModal.selectService', 'בחר שירות')}</option>
                            {availableServices.map(s => (
                                <option key={s.name} value={s.name}>
                                    {s.displayName ?? s.name}
                                </option>
                            ))}
                        </select>
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
                            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '...' : t('management.decisionModal.transferSubmit', 'העבר')}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
