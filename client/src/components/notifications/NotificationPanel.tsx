import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import { useNotificationContext } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotificationContext();

  return (
    <div role="dialog" aria-label={t('notifications.title')} className="absolute end-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-bg-paper border border-divider rounded-2xl shadow-xl z-50 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
        <h2 className="text-sm font-semibold text-text-primary">
          {t('notifications.title')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-bg-default transition-colors cursor-pointer bg-transparent border-none text-text-secondary"
          aria-label={t('common.cancel')}
        >
          <MdClose size={18} />
        </button>
      </div>

      {/* Mark all read */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 border-b border-divider shrink-0 flex items-center justify-start">
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary hover:underline cursor-pointer bg-transparent border-none"
          >
            {t('notifications.markAllRead')}
          </button>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {isLoading && notifications.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            {t('notifications.loading')}
          </div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            {t('notifications.empty')}
          </div>
        )}
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onMarkRead={markRead}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
