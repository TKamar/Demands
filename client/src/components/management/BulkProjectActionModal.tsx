import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';

interface BulkProjectActionModalProps {
  open: boolean;
  onClose: () => void;
  selectedNames: string[];
  onDelete: () => Promise<void>;
}

export default function BulkProjectActionModal({
  open,
  onClose,
  selectedNames,
  onDelete,
}: BulkProjectActionModalProps) {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onDelete();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('project.bulkDeleteConfirm', 'Delete Projects')}
    >
      <div className="flex flex-col gap-5" dir="rtl">
        {/* Summary */}
        <div className="bg-red-50 rounded-xl p-4 text-sm text-red-800 border border-red-200 flex flex-col gap-1">
          <span className="font-medium">
            {t('project.bulkDeleteWarning', 'Delete {{count}} selected projects?', { count: selectedNames.length })}
          </span>
          <span className="text-xs opacity-90">
            {t('project.bulkDeleteIrreversible', 'This action cannot be undone.')}
          </span>
        </div>

        {/* Project list */}
        <div className="max-h-48 overflow-y-auto border border-divider rounded-lg p-3 bg-gray-50">
          <ul className="text-xs space-y-1">
            {selectedNames.map((name) => (
              <li key={name} className="text-text-secondary">
                • {name}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-transparent border border-text-secondary text-text-secondary hover:border-text-primary hover:text-text-primary transition-colors cursor-pointer text-sm font-medium"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-danger/10 border border-danger text-danger hover:bg-danger/20 transition-colors cursor-pointer text-sm font-medium"
          >
            {t('project.delete', 'Delete')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
