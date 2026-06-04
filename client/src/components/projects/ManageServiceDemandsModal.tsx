import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import CreateDemandModal from './CreateDemandModal';
import { fetchDemands, deleteDemand as apiDeleteDemand, updateDemand as apiUpdateDemand } from '../../api/apiService';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';
import type { CreateDemandPayload, UpdateDemandPayload } from '../../api/types';

const TERMINAL_STATUSES = new Set([
  'Approved', 'PartiallyApproved', 'ApprovedWithCondition',
  'Rejected', 'CenterManagerRejected', 'Cancelled',
]);

interface ManageServiceDemandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  serviceName: string;
}

export default function ManageServiceDemandsModal({
  isOpen,
  onClose,
  projectName,
  serviceName,
}: ManageServiceDemandsModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [isAddingDemand, setIsAddingDemand] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<Demand | null>(null);

  const refreshControllerRef = useRef<AbortController | null>(null);

  const refreshDemands = useCallback(async () => {
    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    setIsLoading(true);
    try {
      const res = await fetchDemands({ projectName, serviceName, page: 1, limit: 200 }, controller.signal);
      if (!controller.signal.aborted) setDemands(res.data);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [projectName, serviceName]);

  useEffect(() => {
    if (!isOpen) { setDemands([]); return; }
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    setIsLoading(true);
    fetchDemands({ projectName, serviceName, page: 1, limit: 200 }, controller.signal)
      .then(res => { if (!controller.signal.aborted) setDemands(res.data); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [isOpen, projectName, serviceName]);

  useEffect(() => {
    return () => { refreshControllerRef.current?.abort(); };
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!demandToDelete) return;
    const target = demandToDelete;
    setDemandToDelete(null);
    try {
      await apiDeleteDemand(target.id);
      await refreshDemands();
      showToast(t('demand.deleted', 'Requirement deleted'), 'success');
    } catch {
      showToast(t('demand.deleteError', 'Failed to delete requirement'), 'error');
    }
  }, [demandToDelete, refreshDemands, showToast, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('service.manage', 'ניהול דרישות')} — ${serviceName}`}
    >
      <div className="flex flex-col gap-4" dir="rtl">
        {isLoading && (
          <p className="text-sm text-text-secondary">{t('common.loading', 'טוען...')}</p>
        )}

        {!isLoading && demands.length === 0 && (
          <p className="text-sm text-text-secondary italic">{t('demands.empty', 'אין דרישות')}</p>
        )}

        {demands.length > 0 && (
          <div className="space-y-2">
            {demands.map(demand => {
              const isTerminal = TERMINAL_STATUSES.has(demand.status);
              return (
                <div key={demand.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium text-text-primary truncate">{demand.resourceName}</span>
                  <span className="w-20 text-text-secondary">{demand.value} {demand.unit}</span>
                  <span className="w-24 text-xs text-text-secondary">{demand.type}</span>
                  <span className={`w-28 text-xs font-medium ${
                    demand.status === 'Approved' ? 'text-green-700'
                    : demand.status === 'Rejected' ? 'text-red-600'
                    : 'text-amber-600'
                  }`}>{demand.status}</span>
                  <button
                    type="button"
                    onClick={() => { if (!isTerminal) setEditingDemand(demand); }}
                    disabled={isTerminal}
                    className="p-1 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded"
                  >
                    <MdEdit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!isTerminal) setDemandToDelete(demand); }}
                    disabled={isTerminal}
                    className="p-1 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed rounded"
                  >
                    <MdDelete size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsAddingDemand(true)}
          className="flex items-center gap-1 self-start text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
        >
          <MdAdd size={15} />
          {t('service.addResource', 'הוסף משאב')}
        </button>
      </div>

      {isAddingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setIsAddingDemand(false)}
          onSubmit={async () => {}}
          onCreated={async () => {
            await refreshDemands();
            setIsAddingDemand(false);
          }}
          defaultProjectName={projectName}
          defaultServiceName={serviceName}
        />
      )}

      {editingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setEditingDemand(null)}
          onSubmit={async (payload, demandId) => {
            if (!demandId) return;
            await apiUpdateDemand(demandId, payload as UpdateDemandPayload);
            await refreshDemands();
            setEditingDemand(null);
          }}
          editingDemand={editingDemand}
        />
      )}

      <ConfirmDialog
        isOpen={demandToDelete !== null}
        title={t('demand.deleteTitle', 'מחיקת דרישה')}
        message={t('demand.deleteMessage', 'למחוק דרישה זו לצמיתות?')}
        onConfirm={confirmDelete}
        onCancel={() => setDemandToDelete(null)}
        danger
      />
    </Modal>
  );
}
