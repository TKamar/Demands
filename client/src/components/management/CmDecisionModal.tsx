import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Demand } from '../../types/domain';
import { cmApproveDemand, cmRejectDemand } from '../../api/apiService';

type Decision = 'approve' | 'reject';

interface CmDecisionModalProps {
  demand: Demand;
  onClose: () => void;
  onComplete: () => void;
}

export const CmDecisionModal: React.FC<CmDecisionModalProps> = ({ demand, onClose, onComplete }) => {
  const { t } = useTranslation();
  const [decision, setDecision] = useState<Decision>('approve');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (decision === 'reject' && !reason.trim()) {
      setError(t('validation.reasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (decision === 'approve') {
        await cmApproveDemand(demand.id);
      } else {
        await cmRejectDemand(demand.id, reason);
      }
      onComplete();
    } catch (e: any) {
      setError(e.response?.data?.message ?? t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">{t('cmDecision.title')}</h2>
        <div className="bg-gray-50 rounded p-3 mb-4 text-sm space-y-1">
          <div><span className="font-medium">{t('demands.project')}:</span> {demand.projectName}</div>
          <div><span className="font-medium">{t('demands.resource')}:</span> {demand.resourceName}</div>
          <div><span className="font-medium">{t('demands.value')}:</span> {demand.value} {demand.unit}</div>
        </div>
        <div className="flex gap-4 mb-4">
          {(['approve', 'reject'] as Decision[]).map(d => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={d} checked={decision === d}
                onChange={() => { setDecision(d); setReason(''); setError(null); }} />
              <span>{t(`cmDecision.${d}`)}</span>
            </label>
          ))}
        </div>
        {decision === 'reject' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('demands.reason')} *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={3} className="w-full border rounded p-2 text-sm"
              placeholder={t('cmDecision.reasonPlaceholder')} />
          </div>
        )}
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded text-gray-700 hover:bg-gray-50">
            {t('actions.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className={`px-4 py-2 text-sm rounded text-white disabled:opacity-50 ${decision === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {submitting ? '...' : t(`cmDecision.${decision}`)}
          </button>
        </div>
      </div>
    </div>
  );
};
