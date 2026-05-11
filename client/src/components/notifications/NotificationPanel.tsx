import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import { useNotificationContext } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const { notifications, markRead, markAllRead, isLoading } = useNotificationContext();

  return (
    <div className="absolute end-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-none text-gray-500"
          aria-label="close"
        >
          <MdClose size={18} />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">
          {t('notifications.title')}
        </h2>
      </div>

      {/* Mark all read */}
      {notifications.some((n) => !n.isRead) && (
        <div className="px-4 py-2 border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-blue-500 hover:underline cursor-pointer bg-transparent border-none"
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
