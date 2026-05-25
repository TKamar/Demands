import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DemandsTable, { demandColumnConfig } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ConfirmDialog from '../common/ConfirmDialog';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import { useDemands } from '../../hooks/useDemands';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useClientInfiniteScroll } from '../../hooks/useClientInfiniteScroll';
import { useToast } from '../common/Toast';
import type { Demand } from '../../types/domain';

// Columns visible in My Requests view
const MY_REQUESTS_COLUMNS = demandColumnConfig.filter((col) =>
  ['project', 'service', 'resource', 'status', 'value', 'unit', 'createdAt', 'actions'].includes(col.key)
);

export const RequestsIOpened: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [demandToRestore, setDemandToRestore] = useState<Demand | null>(null);

  // Fetch current user's demands (server returns only current user's demands for non-admin)
  const { demands, isLoading, restoreDemand } = useDemands({}, { page: 1, limit: 500 });

  // Project map for DemandsTable
  const { projects } = useCachedProjects();
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

  // Client-side infinite scroll
  const { displayedItems, sentinelRef, hasMore } = useClientInfiniteScroll(demands, 20);

  const handleRestore = (demand: Demand) => {
    setDemandToRestore(demand);
  };

  const confirmRestore = async () => {
    if (!demandToRestore) return;
    const target = demandToRestore;
    setDemandToRestore(null);
    try {
      await restoreDemand(target.id);
      showToast(t('demands.restoreSuccess', 'הדרישה הוחזרה בהצלחה'), 'success');
    } catch {
      showToast(t('demands.restoreError', 'שגיאה בהחזרת הדרישה'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        <DemandsTable
          demands={displayedItems}
          projectMap={projectMap}
          isLoading={isLoading}
          visibleColumns={MY_REQUESTS_COLUMNS}
          selectedDemand={selectedDemand}
          onSelectDemand={setSelectedDemand}
          onRestore={handleRestore}
        />
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          isLoading={isLoading}
          hasMore={hasMore}
        />
      </div>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        isModerator={false}
      />

      <ConfirmDialog
        isOpen={demandToRestore !== null}
        title={t('demands.restoreTitle', 'החזרת דרישה')}
        message={t('demands.restoreConfirm', 'להחזיר דרישה זו לסטטוס ממתין?')}
        onConfirm={confirmRestore}
        onCancel={() => setDemandToRestore(null)}
      />
    </div>
  );
};
