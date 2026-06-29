import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import CloudMonitorPanel from '../main/panels/CloudMonitorPanel';

interface ResourceAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResourceAvailabilityModal({ isOpen, onClose }: ResourceAvailabilityModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="relative flex flex-col bg-bg-default border-s border-divider shadow-2xl"
        style={{ width: 'min(90vw, 1100px)' }}
        role="dialog"
        aria-label={t('tabs.resourceAvailability')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-divider bg-bg-paper shrink-0" dir="rtl">
          <h2 className="text-sm font-semibold text-text-primary">{t('tabs.resourceAvailability')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-default text-text-secondary hover:text-text-primary transition-colors"
            aria-label={t('common.close')}
          >
            <MdClose size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-hidden">
          <CloudMonitorPanel />
        </div>
      </div>
    </div>,
    document.body,
  );
}
