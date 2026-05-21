// client/src/components/main/RequirementsView.tsx
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import DemandsTable, { demandColumnConfig, type DemandColumnKey } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ColumnSettingsDropdown from '../common/ColumnSettingsDropdown';
import { FilterSort } from '../common/filters';
import BulkDecisionModal from '../management/BulkDecisionModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import DecisionModal from '../management/DecisionModal';
import { useDemands } from '../../hooks/useDemands';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useDebounce } from '../../hooks/useDebounce';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useTableColumns } from '../../hooks/useTableColumns';
import { useToast } from '../common/Toast';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import {
  demandFilterGroups,
  demandSortOptions,
  initialDemandFilters,
  type DemandFilterKey,
  type DemandSortKey,
} from '../../configs/demandFilters';
import type {
  ApproveDemandPayload,
  RejectDemandPayload,
  UpdateDemandPayload,
  CreateDemandPayload,
  BulkDemandFilters,
  DemandFilterParams,
} from '../../api/types';
import type { Demand, Project } from '../../types/domain';
import type { FilterGroupConfig, SortState, SortDirection } from '../../types/filter';

interface RequirementsViewProps {
  selectedCenters: string[];
}

export default function RequirementsView({ selectedCenters }: RequirementsViewProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const role = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase() || 'user';
  const isModerator = role === 'admin' || role === 'moderator';

  // Column settings
  const {
    orderedVisibleColumns,
    allColumns,
    toggleColumn,
    reorderColumns,
    resetToDefaults,
  } = useTableColumns<DemandColumnKey>({
    tableId: 'main-requirements',
    columns: demandColumnConfig,
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Accumulated demands for infinite scroll
  const [accumulatedDemands, setAccumulatedDemands] = useState<Demand[]>([]);

  // Filter State
  const [filters, setFilters] = useState<Record<DemandFilterKey, string>>(initialDemandFilters);

  // Sort State
  const [sortState, setSortState] = useState<SortState<DemandSortKey>>({
    field: null,
    direction: 'asc',
  });

  const debouncedFilters = useDebounce(filters, 300);

  const isFiltersPending = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(debouncedFilters),
    [filters, debouncedFilters]
  );

  // Sidebar / modal state
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decisionDemand, setDecisionDemand] = useState<Demand | null>(null);
  const [isDecisionModalLoading, setIsDecisionModalLoading] = useState(false);

  // Bulk Selection State (moderator only)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [isAllAcrossPagesSelected, setIsAllAcrossPagesSelected] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Build the demand filter params used by useDemands. Center selection from the
  // outer page is layered on top of the in-view "center" filter — when multiple
  // centers are selected we comma-join the names (the API accepts comma separated
  // lists for *Name params).
  const demandFilterParams: DemandFilterParams = useMemo(() => {
    const centerFromFilter = debouncedFilters.center || undefined;
    const centerFromTabs = selectedCenters.length > 0 ? selectedCenters.join(',') : undefined;
    const centerName = centerFromFilter ?? centerFromTabs;

    return {
      projectName: debouncedFilters.projectName || undefined,
      serviceName: debouncedFilters.serviceName || undefined,
      resourceName: debouncedFilters.resourceName || undefined,
      baseName: debouncedFilters.base || undefined,
      environmentName: debouncedFilters.environment || undefined,
      networkName: debouncedFilters.network || undefined,
      clusterName: debouncedFilters.cluster || undefined,
      type: (debouncedFilters.type || undefined) as DemandFilterParams['type'],
      status: (debouncedFilters.status || undefined) as DemandFilterParams['status'],
      projectType: (debouncedFilters.projectType || undefined) as DemandFilterParams['projectType'],
      median: (debouncedFilters.median || undefined) as DemandFilterParams['median'],
      year: debouncedFilters.year ? Number(debouncedFilters.year) : undefined,
      relatedTo: debouncedFilters.relatedTo || undefined,
      emergencyOption: debouncedFilters.emergencyOption || undefined,
      centerName,
      branchName: debouncedFilters.branch || undefined,
      sectionName: debouncedFilters.section || undefined,
      projectPriority: (debouncedFilters.priority || undefined) as DemandFilterParams['projectPriority'],
    };
  }, [debouncedFilters, selectedCenters]);

  const {
    demands,
    total,
    totalPending,
    totalPages,
    totalValue,
    totalApprovedValue,
    isLoading,
    error,
    createDemand,
    updateDemand,
    cancelDemand,
    approveDemand,
    rejectDemand,
    bulkApproveDemands,
    bulkRejectDemands,
  } = useDemands(demandFilterParams, {
    page: currentPage,
    limit: itemsPerPage,
    sortBy: sortState.field || undefined,
    sortDir: sortState.direction,
  });

  const showLoading = useDelayedLoading(isLoading);

  // Accumulate pages as user scrolls
  useEffect(() => {
    if (isLoading) return;
    setAccumulatedDemands((prev) =>
      currentPage === 1 ? demands : [...prev, ...demands]
    );
  }, [demands, currentPage, isLoading]);

  // Sentinel refs for IntersectionObserver (use refs to avoid stale closures)
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { totalPagesRef.current = totalPages; }, [totalPages]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    sentinelNodeRef.current = node;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isLoadingRef.current && currentPageRef.current < totalPagesRef.current) {
        setCurrentPage((p) => p + 1);
      }
    }, { threshold: 0.1 });
    observer.observe(node);
  }, []);

  const {
    bases,
    environments,
    networks,
    clusters,
    services,
    resources,
    emergencyOptions,
    centers,
    branches,
    sections,
  } = useReferenceData();
  const { projects: allProjects } = useCachedProjects();

  // Project map for table lookups
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    allProjects.forEach((p) => map.set(p.name, p));
    return map;
  }, [allProjects]);

  // Get full project for selected demand (for sidebar)
  const selectedProject = useMemo(() => {
    if (!selectedDemand) return null;
    return allProjects.find((p) => p.name === selectedDemand.projectName) || null;
  }, [selectedDemand, allProjects]);

  // Bulk selection derived state — only Pending demands are selectable
  const currentPageIds = useMemo(
    () => demands.filter((d) => d.status === 'Pending').map((d) => d.id),
    [demands]
  );

  const isAllPageSelected = isAllAcrossPagesSelected
    ? currentPageIds.length > 0 && currentPageIds.every((id) => !excludedIds.has(id))
    : currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const isSomePageSelected = isAllAcrossPagesSelected
    ? currentPageIds.some((id) => !excludedIds.has(id))
    : currentPageIds.some((id) => selectedIds.has(id));
  const selectedCount = isAllAcrossPagesSelected ? totalPending - excludedIds.size : selectedIds.size;
  const hasSelection = isAllAcrossPagesSelected || selectedIds.size > 0;

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setExcludedIds(new Set());
    setIsAllAcrossPagesSelected(false);
  }, []);

  const handleFilterChange = useCallback((key: DemandFilterKey, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setAccumulatedDemands([]);
    setIsAllAcrossPagesSelected(false);
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(initialDemandFilters);
    setCurrentPage(1);
    setAccumulatedDemands([]);
    setIsAllAcrossPagesSelected(false);
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  }, []);

  const handleSortChange = useCallback((field: DemandSortKey | null, direction: SortDirection) => {
    setSortState({ field, direction });
    setCurrentPage(1);
    setAccumulatedDemands([]);
  }, []);

  // Build filter groups with dynamic options
  const filterGroupsWithOptions = useMemo((): FilterGroupConfig<DemandFilterKey>[] => {
    const projectOptions = allProjects
      .map((p) => ({ value: p.name, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const serviceOptions = services
      .map((s) => ({ value: s.name, label: s.displayName || s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const resourceOptionsSet = new Set<string>();
    const resourceOptions = resources
      .filter((r) => {
        if (resourceOptionsSet.has(r.name)) return false;
        resourceOptionsSet.add(r.name);
        return true;
      })
      .map((r) => ({ value: r.name, label: r.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const baseOptions = bases.map((b) => ({ value: b.name, label: b.displayName || b.name }));
    const environmentOptions = environments.map((e) => ({ value: e.name, label: e.displayName || e.name }));
    const networkOptions = networks.map((n) => ({ value: n.name, label: n.displayName || n.name }));
    const clusterOptions = clusters.map((c) => ({ value: c.name, label: c.displayName || c.name }));
    const centerOptions = centers.map((c) => ({ value: c.name, label: c.displayName || c.name }));
    const branchOptions = branches.map((b) => ({ value: b.name, label: b.displayName || b.name }));
    const sectionOptions = sections.map((s) => ({ value: s.name, label: s.displayName || s.name }));
    const emergencyOptionOptions = emergencyOptions.map((eo) => ({ value: eo.name, label: eo.name }));

    const typeOptions = [
      { value: 'New', label: t('projects.type.New') },
      { value: 'Extension', label: t('projects.type.Extension') },
    ];

    const statusOptions = [
      { value: 'Pending', label: t('projects.status.Pending') },
      { value: 'Approved', label: t('projects.status.Approved') },
      { value: 'PartiallyApproved', label: t('projects.status.PartiallyApproved') },
      { value: 'ApprovedWithCondition', label: t('projects.status.ApprovedWithCondition') },
      { value: 'Rejected', label: t('projects.status.Rejected') },
      { value: 'Cancelled', label: t('projects.status.Cancelled') },
    ];

    const projectTypeOptions = [
      { value: 'Emergency', label: t('projects.type.Emergency') },
      { value: 'Semiannual', label: t('projects.type.Semiannual') },
    ];

    const medianOptions = [
      { value: 'H1', label: t('projects.median.H1') },
      { value: 'H2', label: t('projects.median.H2') },
    ];

    const priorityOptions = [
      { value: 'P1', label: t('projects.priority.P1') },
      { value: 'P2', label: t('projects.priority.P2') },
      { value: 'P3', label: t('projects.priority.P3') },
    ];

    const optionsMap: Record<DemandFilterKey, { value: string; label: string }[]> = {
      projectName: projectOptions,
      serviceName: serviceOptions,
      resourceName: resourceOptions,
      base: baseOptions,
      environment: environmentOptions,
      network: networkOptions,
      cluster: clusterOptions,
      type: typeOptions,
      status: statusOptions,
      projectType: projectTypeOptions,
      median: medianOptions,
      year: [],
      relatedTo: [],
      emergencyOption: emergencyOptionOptions,
      center: centerOptions,
      branch: branchOptions,
      section: sectionOptions,
      priority: priorityOptions,
    };

    return demandFilterGroups.map((group) => ({
      ...group,
      fields: group.fields.map((field) => ({
        ...field,
        options: optionsMap[field.key],
      })),
    }));
  }, [allProjects, services, resources, bases, environments, networks, clusters, centers, branches, sections, emergencyOptions, t]);

  // Bulk selection handlers
  const handleToggleSelect = useCallback((id: number) => {
    if (isAllAcrossPagesSelected) {
      setExcludedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }, [isAllAcrossPagesSelected]);

  const handleSelectAllPage = useCallback((checked: boolean) => {
    if (isAllAcrossPagesSelected) {
      setExcludedIds((prev) => {
        const next = new Set(prev);
        if (checked) currentPageIds.forEach((id) => next.delete(id));
        else currentPageIds.forEach((id) => next.add(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) currentPageIds.forEach((id) => next.add(id));
        else currentPageIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [isAllAcrossPagesSelected, currentPageIds]);

  const handleSelectAllAcrossPages = useCallback(() => {
    setIsAllAcrossPagesSelected(true);
    setExcludedIds(new Set());
  }, []);

  // Build filters payload for "select all" bulk operations
  const bulkFilters = useMemo((): BulkDemandFilters => ({
    project: debouncedFilters.projectName || undefined,
    resource: debouncedFilters.resourceName || undefined,
    resourceService: debouncedFilters.serviceName || undefined,
    base: debouncedFilters.base || undefined,
    environment: debouncedFilters.environment || undefined,
    network: debouncedFilters.network || undefined,
    cluster: debouncedFilters.cluster || undefined,
    type: debouncedFilters.type || undefined,
    status: debouncedFilters.status || undefined,
    projectType: debouncedFilters.projectType || undefined,
    median: debouncedFilters.median || undefined,
    year: debouncedFilters.year ? Number(debouncedFilters.year) : undefined,
    relatedTo: debouncedFilters.relatedTo || undefined,
    emergencyOption: debouncedFilters.emergencyOption || undefined,
    priority: debouncedFilters.priority || undefined,
  }), [debouncedFilters]);

  const handleMakeDecision = useCallback((demand: Demand) => {
    setDecisionDemand(demand);
    setSelectedDemand(null);
  }, []);

  const handleEditDemand = useCallback((demand: Demand) => {
    setEditingDemand(demand);
    setSelectedDemand(null);
  }, []);

  const handleCancelDemand = useCallback(async (demand: Demand) => {
    if (window.confirm(t('demands.confirmCancel'))) {
      try {
        await cancelDemand(demand.id);
        showToast(t('demands.cancelSuccess'), 'success');
        setSelectedDemand(null);
      } catch (err: any) {
        showToast(err?.response?.data?.error || t('demands.cancelFailed'), 'error');
      }
    }
  }, [cancelDemand, showToast, t]);

  const handleSubmitDemand = useCallback(
    async (payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) => {
      if (demandId) {
        await updateDemand(demandId, payload as UpdateDemandPayload);
      } else {
        await createDemand(payload as CreateDemandPayload);
      }
      setEditingDemand(null);
    },
    [createDemand, updateDemand]
  );

  async function handleApprove(payload: ApproveDemandPayload) {
    if (!decisionDemand) return;
    setIsDecisionModalLoading(true);
    try {
      await approveDemand(decisionDemand.id, payload);
      showToast(t('management.success.approved'), 'success');
      setDecisionDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsDecisionModalLoading(false);
    }
  }

  async function handleReject(payload: RejectDemandPayload) {
    if (!decisionDemand) return;
    setIsDecisionModalLoading(true);
    try {
      await rejectDemand(decisionDemand.id, payload);
      showToast(t('management.success.rejected'), 'success');
      setDecisionDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsDecisionModalLoading(false);
    }
  }

  async function handleBulkApprove(payload: ApproveDemandPayload) {
    setIsBulkLoading(true);
    try {
      const count = await bulkApproveDemands(
        isAllAcrossPagesSelected
          ? {
              selectAll: true,
              filters: bulkFilters,
              excludedIds: excludedIds.size > 0 ? Array.from(excludedIds) : undefined,
              ...payload,
            }
          : { ids: Array.from(selectedIds), ...payload }
      );
      showToast(t('management.bulkDecision.successApproved', { count }), 'success');
      clearSelection();
      setIsBulkModalOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsBulkLoading(false);
    }
  }

  async function handleBulkReject(payload: RejectDemandPayload) {
    setIsBulkLoading(true);
    try {
      const count = await bulkRejectDemands(
        isAllAcrossPagesSelected
          ? {
              selectAll: true,
              filters: bulkFilters,
              excludedIds: excludedIds.size > 0 ? Array.from(excludedIds) : undefined,
              reason: payload.reason,
            }
          : { ids: Array.from(selectedIds), reason: payload.reason }
      );
      showToast(t('management.bulkDecision.successRejected', { count }), 'success');
      clearSelection();
      setIsBulkModalOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsBulkLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <FilterSort
        filterGroups={filterGroupsWithOptions}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearAllFilters={handleClearAllFilters}
        sortOptions={demandSortOptions}
        sortState={sortState}
        onSortChange={handleSortChange}
      />

      {/* Bulk action bar (moderators only) */}
      {isModerator && (hasSelection || totalPending > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-medium text-primary flex-1">
            {hasSelection
              ? isAllAcrossPagesSelected && excludedIds.size === 0
                ? t('management.bulk.allSelected', { count: totalPending })
                : t('management.bulk.selected', { count: selectedCount })
              : t('management.bulk.noneSelected')}
          </span>
          {selectedCount < totalPending && totalPending > 0 && (
            <button
              onClick={handleSelectAllAcrossPages}
              className="px-4 py-1.5 bg-transparent text-primary border border-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors cursor-pointer"
            >
              {t('management.bulk.selectAllAcrossPages', { count: totalPending })}
            </button>
          )}
          {hasSelection && (
            <>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer border-none"
              >
                {t('management.bulk.changeStatus')}
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-1.5 bg-gray-100 text-text-primary rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer border-none"
              >
                {t('management.bulk.clearSelection')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Toolbar: column settings */}
      <div className="flex items-center justify-end">
        <ColumnSettingsDropdown
          columns={allColumns}
          visibleColumns={orderedVisibleColumns.map((c) => c.key)}
          onToggleColumn={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetToDefaults}
        />
      </div>

      {/* Table card */}
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        {error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : (
          <>
            <div
              className={`overflow-x-auto transition-opacity duration-200 ${isFiltersPending || showLoading ? 'opacity-50' : 'opacity-100'}`}
            >
              <DemandsTable
                demands={accumulatedDemands}
                projectMap={projectMap}
                isLoading={false}
                visibleColumns={orderedVisibleColumns}
                selectedDemand={selectedDemand}
                onSelectDemand={setSelectedDemand}
                onEdit={handleEditDemand}
                onCancel={handleCancelDemand}
                onMakeDecision={isModerator ? handleMakeDecision : undefined}
                isModerator={isModerator}
                totalValue={totalValue}
                totalApprovedValue={totalApprovedValue}
                showCheckboxes={isModerator}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                isAllPageSelected={isAllPageSelected}
                isSomePageSelected={isSomePageSelected}
                onSelectAllPage={handleSelectAllPage}
                isAllAcrossPagesSelected={isAllAcrossPagesSelected}
                excludedIds={excludedIds}
              />
            </div>

          </>
        )}
      </div>

      <InfiniteScrollSentinel
        sentinelRef={sentinelRef}
        isLoading={isLoading}
        hasMore={currentPage < totalPages}
      />

      <DemandDetailSidebar
        demand={selectedDemand}
        project={selectedProject}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        onEdit={handleEditDemand}
        onCancel={handleCancelDemand}
        isModerator={isModerator}
        onMakeDecision={isModerator ? handleMakeDecision : undefined}
      />

      {editingDemand && (
        <CreateDemandModal
          isOpen={editingDemand !== null}
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <DecisionModal
        open={decisionDemand !== null}
        onClose={() => setDecisionDemand(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        demand={decisionDemand}
        isLoading={isDecisionModalLoading}
      />

      <BulkDecisionModal
        open={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        selectedCount={selectedCount}
        isLoading={isBulkLoading}
      />
    </div>
  );
}
