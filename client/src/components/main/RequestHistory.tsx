import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DemandsTable, { demandColumnConfig } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useHistoryDemands } from '../../hooks/useHistoryDemands';
import type { Demand, Project } from '../../types/domain';

const HISTORY_COLUMNS = demandColumnConfig.filter((col) =>
  ['project', 'service', 'resource', 'status', 'value', 'approvedValue', 'createdBy', 'createdAt'].includes(col.key)
);

export default function RequestHistory() {
  const { t } = useTranslation();
  const { demands, isLoading, isFetchingMore, hasMore, sentinelRef } = useHistoryDemands();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  const { projects } = useCachedProjects();
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        <DemandsTable
          demands={demands}
          projectMap={projectMap}
          isLoading={isLoading}
          visibleColumns={HISTORY_COLUMNS}
          selectedDemand={selectedDemand}
          onSelectDemand={setSelectedDemand}
          hideActions
        />
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          isLoading={isFetchingMore}
          hasMore={hasMore}
        />
        {!isLoading && !isFetchingMore && !hasMore && demands.length === 0 && (
          <div className="p-8 text-center text-text-secondary text-sm">
            {t('history.empty', 'אין היסטוריה להצגה')}
          </div>
        )}
      </div>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        isModerator={false}
      />
    </div>
  );
}
