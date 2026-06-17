import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import type { Demand } from '../../types/domain';

export interface MatrixDecision {
  id: number;
  approvedValue: number;
  status: 'Approved' | 'PartiallyApproved';
}

interface HierarchicalBulkDecisionModalProps {
  open: boolean;
  onClose: () => void;
  demands: Demand[];
  onSubmit: (decisions: MatrixDecision[]) => Promise<void>;
}

export default function HierarchicalBulkDecisionModal({
  open,
  onClose,
  demands,
  onSubmit,
}: HierarchicalBulkDecisionModalProps) {
  const { t } = useTranslation();

  const [approvalInputs, setApprovalInputs] = useState<Record<number, string>>({});
  const [activeProjectTab, setActiveProjectTab] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group demands by project → service
  const demandsByProject = useMemo(() => {
    const groups: Record<string, Record<string, Demand[]>> = {};
    demands.forEach((demand) => {
      if (!groups[demand.projectName]) {
        groups[demand.projectName] = {};
      }
      if (!groups[demand.projectName][demand.serviceName]) {
        groups[demand.projectName][demand.serviceName] = [];
      }
      groups[demand.projectName][demand.serviceName].push(demand);
    });
    return groups;
  }, [demands]);

  // Set initial active tab
  const projectNames = useMemo(() => Object.keys(demandsByProject).sort(), [demandsByProject]);

  // Initialize activeProjectTab on modal open using useEffect
  useEffect(() => {
    if (open && projectNames.length > 0) {
      setActiveProjectTab(projectNames[0]);
      setApprovalInputs({});
    }
  }, [open, projectNames]);

  const currentProjectDemands = useMemo(() => {
    if (!activeProjectTab) return {};
    return demandsByProject[activeProjectTab] || {};
  }, [activeProjectTab, demandsByProject]);

  const handleApprovalChange = (demandId: number, value: string) => {
    setApprovalInputs((prev) => ({
      ...prev,
      [demandId]: value,
    }));
  };

  const handleSubmit = async () => {
    // Build decisions from inputs
    const decisions: MatrixDecision[] = [];
    Object.entries(approvalInputs).forEach(([idStr, valueStr]) => {
      if (valueStr.trim() === '') return; // Skip empty inputs
      const id = Number(idStr);
      const approvedValue = Number(valueStr);
      const demand = demands.find((d) => d.id === id);
      if (!demand) return;

      decisions.push({
        id,
        approvedValue,
        status: approvedValue >= demand.value ? 'Approved' : 'PartiallyApproved',
      });
    });

    setIsSubmitting(true);
    try {
      await onSubmit(decisions);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const computeApprovalPercent = (demandId: number, approvedValue: number): number => {
    const demand = demands.find((d) => d.id === demandId);
    if (!demand || demand.value === 0) return 0;
    return Math.round((approvedValue / demand.value) * 100);
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('bulk.hierarchicalTitle', 'קבלת החלטה מרובה')}
    >
      <div className="flex flex-col gap-4" dir="rtl">
        {demands.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-secondary">
            {t('bulk.noDemands', 'No demands available for approval')}
          </div>
        ) : (
          <>
            {/* Project tabs */}
            {projectNames.length > 1 && (
              <div className="flex gap-2 border-b border-divider">
                {projectNames.map((projectName) => (
                  <button
                    key={projectName}
                    onClick={() => setActiveProjectTab(projectName)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeProjectTab === projectName
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {projectName}
                  </button>
                ))}
              </div>
            )}

            {/* Service blocks for current project */}
            <div className="max-h-96 overflow-y-auto space-y-6">
          {Object.entries(currentProjectDemands).map(([serviceName, serviceDemands]) => (
            <div key={serviceName} className="border border-divider rounded-lg p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{serviceName}</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-divider">
                      <th className="py-2 px-2 text-xs font-semibold text-text-secondary">
                        {t('bulk.location', 'מיקום')}
                      </th>
                      <th className="py-2 px-2 text-xs font-semibold text-text-secondary">
                        {t('bulk.requestedQty', 'כמות')}
                      </th>
                      <th className="py-2 px-2 text-xs font-semibold text-text-secondary">
                        {t('bulk.approvedQty', 'אישור הכמות')}
                      </th>
                      <th className="py-2 px-2 text-xs font-semibold text-text-secondary">
                        {t('bulk.approvalPercent', 'אחוז האישור')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceDemands.map((demand) => {
                      const inputValue = approvalInputs[demand.id] || '';
                      const approvedValue = inputValue ? Number(inputValue) : 0;
                      const percent = inputValue ? computeApprovalPercent(demand.id, approvedValue) : 0;

                      return (
                        <tr key={demand.id} className="border-b border-divider hover:bg-gray-50">
                          <td className="py-2 px-2 text-xs text-text-secondary">
                            {demand.locationId ? '✓' : '—'}
                          </td>
                          <td className="py-2 px-2 text-xs text-text-primary font-medium">
                            {demand.value}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={inputValue}
                              onChange={(e) => handleApprovalChange(demand.id, e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-1 text-xs border border-divider rounded bg-white text-text-primary"
                            />
                          </td>
                          <td className="py-2 px-2 text-xs text-text-secondary">
                            {inputValue ? `${percent}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
            </div>
          </>
        )}

        {/* Action buttons */}
        {demands.length > 0 && (
          <div className="flex gap-2 justify-end border-t border-divider pt-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-transparent border border-text-secondary text-text-secondary hover:border-text-primary hover:text-text-primary transition-colors cursor-pointer text-sm font-medium disabled:opacity-50"
            >
              {t('common.cancel', 'ביטול')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(approvalInputs).length === 0}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.saving', 'שומר...') : t('bulk.submitAndApprove', 'שמור ואשר הכל')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
