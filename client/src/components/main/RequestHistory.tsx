import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DemandsTable, { demandColumnConfig } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ConfirmDialog from '../common/ConfirmDialog';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useHistoryDemands } from '../../hooks/useHistoryDemands';
import { useToast } from '../common/Toast';
import { restoreDemand } from '../../api/apiService';
import type { Demand, Project } from '../../types/domain';

const HISTORY_COLUMNS = demandColumnConfig.filter((col) =>
  ['project', 'service', 'resource', 'status', 'value', 'approvedValue', 'createdBy', 'createdAt', 'actions'].includes(col.key)
);

interface RequestHistoryProps {
  selectedCenters?: string[];
}

export default function RequestHistory({ selectedCenters }: RequestHistoryProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const centerName = selectedCenters && selectedCenters.length > 0 ? selectedCenters.join(',') : undefined;

  const { demands, isLoading, isFetchingMore, hasMore, sentinelRef } = useHistoryDemands({ centerName });
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [demandToRestore, setDemandToRestore] = useState<Demand | null>(null);

  const { projects } = useCachedProjects();
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.name, p));
    return map;
  }, [projects]);

  const handleRestore = useCallback((demand: Demand) => {
    setDemandToRestore(demand);
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!demandToRestore) return;
    const target = demandToRestore;
    setDemandToRestore(null);
    try {
      await restoreDemand(target.id);
      showToast(t('demands.restoreSuccess', 'הדרישה הוחזרה בהצלחה'), 'success');
    } catch {
      showToast(t('demands.restoreError', 'שגיאה בהחזרת הדרישה'), 'error');
    }
  }, [demandToRestore, showToast, t]);

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
          onRestore={handleRestore}
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

      <ConfirmDialog
        isOpen={demandToRestore !== null}
        title={t('demands.restoreTitle', 'החזרת דרישה')}
        message={t('demands.restoreConfirm', 'להחזיר דרישה זו לסטטוס ממתין?')}
        onConfirm={confirmRestore}
        onCancel={() => setDemandToRestore(null)}
      />
    </div>
  );
}
