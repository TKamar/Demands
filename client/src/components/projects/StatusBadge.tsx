import { useTranslation } from 'react-i18next';
import type { DemandStatus } from '../../types/domain';

const statusStyles: Record<DemandStatus, string> = {
  PendingCenterManager: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  Pending:               'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Approved:              'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Rejected:              'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  PartiallyApproved:     'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ApprovedWithCondition: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Cancelled:             'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  CenterManagerRejected: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200',
};

interface StatusBadgeProps {
  status: DemandStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      {t(`projects.status.${status}`)}
    </span>
  );
}
