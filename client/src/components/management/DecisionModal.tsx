import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';
import { useReferenceData } from '../../hooks/useReferenceData';
import { transferDemand, searchUsersAndGroups } from '../../api/apiService';
import { SUB_DECISIONS } from '../../constants/demandDecisionOptions';
import type { Demand } from '../../types/domain';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

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

  const [subDecision, setSubDecision] = useState('');
  const [reason, setReason] = useState('');
  const [approvedValue, setApprovedValue] = useState<number | undefined>(undefined);
  const [procurementDate, setProcurementDate] = useState('');
  const [assignedToUser, setAssignedToUser] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetService, setTargetService] = useState('');
  const [showTransferPath, setShowTransferPath] = useState(false);

  const [targetUser, setTargetUser] = useState('');
  const [targetUserSearch, setTargetUserSearch] = useState('');
  const [targetUserOptions, setTargetUserOptions] = useState<{username: string; fullName?: string}[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      setSubDecision('');
      setReason('');
      setApprovedValue(undefined);
      setProcurementDate('');
      setAssignedToUser('');
      setTargetService('');
      setShowTransferPath(false);
      setTargetUser('');
      setTargetUserSearch('');
      setTargetUserOptions([]);
    }
    setIsSubmitting(false);
  }, [demand, open]);

  useEffect(() => {
    if (targetUserSearch.length < 2) {
      setTargetUserOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const results = await searchUsersAndGroups(targetUserSearch);
        setTargetUserOptions(results.users ?? []);
      } catch {
        setTargetUserOptions([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [targetUserSearch]);

  if (!demand) return null;

  const selectedOption = SUB_DECISIONS.find(opt => opt.value === subDecision);
  const availableServices = services.filter(s =>
    s.isActive !== false &&
    s.name !== demand.serviceName
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demand || !selectedOption) return;

    setIsSubmitting(true);
    try {
      if (selectedOption.status === 'Rejected') {
        await onReject({ reason });
      } else {
        await onApprove({
          status: selectedOption.status,
          approvedValue: selectedOption.requiresQuantity ? approvedValue : undefined,
          reason: selectedOption.requiresReason ? reason : undefined,
          procurementDate: selectedOption.requiresDate ? procurementDate : undefined,
          assignedToUser: selectedOption.requiresTargetUser ? targetUser : (selectedOption.requiresUser ? assignedToUser : undefined),
        });
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

  const demandSummary = (
    <div className="bg-bg-default rounded-xl p-4 mb-5">
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

  // Show transfer path if requested
  if (showTransferPath) {
    return (
      <Modal
        isOpen={open}
        onClose={onClose}
        title={t('management.decisionModal.transfer', 'העברה למנהל שירות אחר')}
      >
        {demandSummary}
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
                  <option key={s.name} value={s.name}>
                    {s.displayName ?? s.name}
                  </option>
                ))}
              </select>
            }
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowTransferPath(false)}
              className="px-5 py-2.5 bg-bg-default text-text-primary rounded-xl text-sm font-medium hover:bg-bg-default transition-colors cursor-pointer border-none"
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
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('management.decisionModal.title')}
    >
      {demandSummary}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            {t('management.decisionModal.subDecision', 'בחר החלטה')}
          </label>
          <select
            value={subDecision}
            onChange={e => setSubDecision(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
            dir="rtl"
          >
            <option value="">{t('decision.selectPlaceholder', 'בחר החלטה')}</option>
            {SUB_DECISIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option value="transfer">{t('management.decisionModal.transfer', 'העברה למנהל שירות אחר')}</option>
          </select>
        </div>

        {subDecision === 'transfer' && (
          <button
            type="button"
            onClick={() => setShowTransferPath(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
          >
            {t('management.decisionModal.continueTransfer', 'המשך להעברה')}
          </button>
        )}

        {subDecision && subDecision !== 'transfer' && selectedOption && (
          <>
            {selectedOption.requiresQuantity && (
              <div>
                <label className="text-sm font-medium text-text-primary">
                  {t('decision.approvedQuantity', 'כמות מאושרת')} <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    value={approvedValue ?? ''}
                    onChange={e => setApprovedValue(e.target.value ? Number(e.target.value) : undefined)}
                    required
                    className="w-32 px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default"
                  />
                  <span className="text-sm text-text-secondary">{demand.unit ?? ''}</span>
                </div>
              </div>
            )}

            {selectedOption.requiresDate && (
              <div>
                <label className="text-sm font-medium text-text-primary">
                  {t('decision.date', 'תאריך')} <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  value={procurementDate}
                  onChange={e => setProcurementDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default mt-1"
                  dir="ltr"
                />
              </div>
            )}

            {selectedOption.requiresUser && (
              <div>
                <label className="text-sm font-medium text-text-primary">
                  {t('decision.assignedUser', 'השם של המשתמש')} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={assignedToUser}
                  onChange={e => setAssignedToUser(e.target.value)}
                  required
                  placeholder={t('decision.assignedUserPlaceholder', 'הזן שם משתמש...')}
                  className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default mt-1"
                  dir="rtl"
                />
              </div>
            )}

            {selectedOption.requiresTargetUser && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">
                  {t('decisions.selectTargetUser', 'בחירת משתמש יעד')} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={targetUserSearch}
                  onChange={e => { setTargetUserSearch(e.target.value); setTargetUser(''); }}
                  placeholder={t('decisions.searchUser', 'חפש משתמש...')}
                  className="px-4 py-2 border border-divider rounded-lg text-sm bg-bg-paper focus:outline-none focus:border-primary"
                />
                {isSearchingUsers && (
                  <p className="text-xs text-text-secondary">{t('common.searching', 'מחפש...')}</p>
                )}
                {targetUserOptions.length > 0 && !targetUser && (
                  <div className="border border-divider rounded-lg overflow-hidden shadow-sm bg-bg-paper max-h-40 overflow-y-auto">
                    {targetUserOptions.map(u => (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => { setTargetUser(u.username); setTargetUserSearch(u.fullName || u.username); setTargetUserOptions([]); }}
                        className="w-full px-4 py-2 text-sm text-start hover:bg-bg-default border-none cursor-pointer bg-transparent"
                      >
                        {u.fullName || u.username}
                        <span className="text-xs text-text-secondary ms-2">{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                {targetUser && (
                  <p className="text-xs text-green-600">{t('decisions.selectedUser', 'נבחר:')} {targetUser}</p>
                )}
              </div>
            )}

            {selectedOption.requiresReason && (
              <div>
                <label className="text-sm font-medium text-text-primary">
                  {t('decision.reason', 'סיבה')} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-sm border border-divider rounded-lg bg-bg-default resize-none mt-1"
                  dir="rtl"
                  placeholder={t('decision.reasonPlaceholder', 'הזן סיבה...')}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubDecision('')}
                className="px-5 py-2.5 bg-bg-default text-text-primary rounded-xl text-sm font-medium hover:bg-bg-default transition-colors cursor-pointer border-none"
              >
                {t('common.back', 'חזור')}
              </button>
              <button
                type="submit"
                disabled={isLoading || isSubmitting || !subDecision || (selectedOption.requiresTargetUser && !targetUser)}
                className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedOption.status === 'Rejected'
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
          </>
        )}
      </form>
    </Modal>
  );
}
