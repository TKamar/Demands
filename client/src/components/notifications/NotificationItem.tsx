import type { AppNotification } from '../../api/notificationService';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdCheckCircle, MdCancel, MdEdit, MdAddCircle, MdFolder, MdFolderOff, MdFolderOpen, MdNotifications } from 'react-icons/md';

function relativeTime(iso: string, locale: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffMin < 1) return rtf.format(0, 'minute');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return rtf.format(-diffH, 'hour');
  return rtf.format(-Math.floor(diffH / 24), 'day');
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  NewDemand: <MdAddCircle className="text-blue-500" size={18} />,
  DemandDecision: <MdCheckCircle className="text-green-500" size={18} />,
  DemandCancelled: <MdCancel className="text-red-500" size={18} />,
  DemandEdited: <MdEdit className="text-amber-500" size={18} />,
  NewProject: <MdFolder className="text-blue-500" size={18} />,
  ProjectDeleted: <MdFolderOff className="text-red-500" size={18} />,
  ProjectEdited: <MdFolderOpen className="text-amber-500" size={18} />,
};

interface Props {
  notification: AppNotification;
  onMarkRead: (id: number) => void;
  onClose: () => void;
}

export default function NotificationItem({ notification, onMarkRead, onClose }: Props) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  function handleClick() {
    if (!notification.isRead) onMarkRead(notification.id);
    onClose();
    if (notification.projectName) {
      navigate(`/projects?project=${encodeURIComponent(notification.projectName)}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-start px-4 py-3 flex items-start gap-3 hover:bg-bg-default transition-colors border-b border-divider last:border-b-0 cursor-pointer bg-transparent ${
        !notification.isRead ? 'border-s-2 border-s-blue-500 bg-blue-50/30' : ''
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {TYPE_ICON[notification.type] ?? <MdNotifications size={18} className="text-gray-400" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold' : 'font-normal'} text-text-primary`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {relativeTime(notification.createdAt, i18n.language)}
        </p>
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
      )}
    </button>
  );
}
