import { useTranslation } from 'react-i18next';
import type { Priority } from '../../types/domain';

const priorityStyles: Record<Priority, string> = {
  P1: 'text-red-600 dark:text-red-300',
  P2: 'text-yellow-600 dark:text-yellow-300',
  P3: 'text-green-700 dark:text-green-300',
};

interface PriorityBadgeProps {
  priority?: Priority;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { t } = useTranslation();

  if (!priority) return <span>-</span>;

  return (
    <span
      className={`text-xs font-medium ${priorityStyles[priority]}`}
    >
      {t(`projects.priority.${priority}`)}
    </span>
  );
}
