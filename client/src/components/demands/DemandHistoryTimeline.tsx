import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchDemandAuditHistory, type DemandHistoryEntry } from '../../api/apiService';

const ACTION_COLOR: Record<string, string> = {
  Created: 'bg-blue-500',
  Approved: 'bg-green-500',
  FullyApproved: 'bg-green-600',
  PartiallyApproved: 'bg-yellow-500',
  ApprovedWithCondition: 'bg-yellow-600',
  Rejected: 'bg-red-500',
  Cancelled: 'bg-gray-400',
  Restored: 'bg-purple-500',
};

interface Props {
  demandId: number;
}

export default function DemandHistoryTimeline({ demandId }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<DemandHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchDemandAuditHistory(demandId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, [demandId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-3">
        {t('demandHistory.empty', 'אין היסטוריה')}
      </p>
    );
  }

  return (
    <ol className="relative border-s border-divider ms-3 flex flex-col gap-0">
      {entries.map((entry, i) => (
        <li
          key={entry.id}
          className={`ms-4 pb-5 ${i === entries.length - 1 ? 'pb-0' : ''}`}
        >
          <span
            className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${
              ACTION_COLOR[entry.action] ?? 'bg-gray-400'
            }`}
          />
          <p className="text-xs font-semibold text-text-primary">
            {t(`demandHistory.action.${entry.action}`, entry.action)}
          </p>
          {entry.actorUsername && (
            <p className="text-xs text-text-secondary">{entry.actorUsername}</p>
          )}
          {entry.metadata?.reason && (
            <p className="text-xs text-text-secondary italic">
              "{String(entry.metadata.reason)}"
            </p>
          )}
          <time className="text-xs text-text-secondary">
            {new Date(entry.createdAt).toLocaleString('he-IL')}
          </time>
        </li>
      ))}
    </ol>
  );
}
