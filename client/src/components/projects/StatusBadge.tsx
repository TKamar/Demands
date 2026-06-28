import { useTranslation } from 'react-i18next';
import type { DemandStatus } from '../../types/domain';

const statusStyles: Record<DemandStatus, string> = {
  PendingCenterManager:  'text-orange-600 dark:text-orange-300',
  Pending:               'text-yellow-600 dark:text-yellow-300',
  Approved:              'text-green-700 dark:text-green-300',
  Rejected:              'text-red-600 dark:text-red-300',
  PartiallyApproved:     'text-blue-600 dark:text-blue-300',
  ApprovedWithCondition: 'text-purple-600 dark:text-purple-300',
  Cancelled:             'text-gray-500 dark:text-gray-400',
  CenterManagerRejected: 'text-red-800 dark:text-red-200',
  WaitingOnPrerequisite: 'text-indigo-600 dark:text-indigo-300',
  AwaitingProcurement:   'text-cyan-600 dark:text-cyan-300',
  HeldForEfficiency:     'text-amber-600 dark:text-amber-300',
  ConditionalFootprintReduction: 'text-lime-600 dark:text-lime-300',
  InProgress:            'text-sky-600 dark:text-sky-300',
  TransferredTo810:      'text-teal-600 dark:text-teal-300',
};

interface StatusBadgeProps {
  status: DemandStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`text-xs font-medium ${statusStyles[status]}`}
    >
      {t(`projects.status.${status}`)}
    </span>
  );
}
