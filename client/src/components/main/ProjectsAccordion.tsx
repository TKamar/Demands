import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import {
  MdExpandMore,
  MdChevronLeft,
  MdEdit,
  MdDelete,
  MdContentCopy,
  MdFilterList,
  MdArrowUpward,
  MdArrowDownward,
  MdUnfoldMore,
  MdCancel,
  MdGavel,
} from 'react-icons/md';
import MoreActionsMenu from '../common/MoreActionsMenu';
import type { MoreAction } from '../common/MoreActionsMenu';
import { useProjects } from '../../hooks/useProjects';
import { useDemands } from '../../hooks/useDemands';
import PriorityBadge from '../projects/PriorityBadge';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ProjectDetailSidebar from '../projects/ProjectDetailSidebar';
import DecisionModal from '../management/DecisionModal';
import CreateProjectModal from '../projects/CreateProjectModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import DuplicateProjectModal from '../projects/DuplicateProjectModal';
import { useClientInfiniteScroll } from '../../hooks/useClientInfiniteScroll';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import { useToast } from '../common/Toast';
import type { Project, Demand, Priority } from '../../types/domain';
import type {
  CreateProjectPayload,
  UpdateProjectPayload,
  DuplicateProjectPayload,
  UpdateDemandPayload,
  CreateDemandPayload,
  ApproveDemandPayload,
  RejectDemandPayload,
} from '../../api/types';

// Column header with per-column filter dropdown and sort toggle
interface ColumnHeaderProps {
  label: string;
  options: string[];
  selected: string[];
  onFilterChange: (selected: string[]) => void;
  sortKey: string;
  currentSort: { field: string | null; direction: 'asc' | 'desc' };
  onSort: (field: string) => void;
}

function ColumnHeader({
  label,
  options,
  selected,
  onFilterChange,
  sortKey,
  currentSort,
  onSort,
}: ColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isFiltered = selected.length > 0;
  const isSorted = currentSort.field === sortKey;

  const toggleOption = (opt: string) => {
    onFilterChange(
      selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]
    );
  };

  return (
    <div className="relative flex items-center gap-0.5" ref={containerRef}>
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide select-none">
        {label}
      </span>

      {/* Sort toggle */}
      <button
        onClick={() => onSort(sortKey)}
        className={`p-0.5 rounded bg-transparent border-none cursor-pointer transition-colors ${
          isSorted ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {isSorted ? (
          currentSort.direction === 'asc' ? <MdArrowUpward size={12} /> : <MdArrowDownward size={12} />
        ) : (
          <MdUnfoldMore size={12} />
        )}
      </button>

      {/* Filter icon — only when options exist */}
      {options.length > 0 && (
        <>
          <button
            onClick={() => setOpen(!open)}
            className={`p-0.5 rounded bg-transparent border-none cursor-pointer transition-colors relative ${
              isFiltered ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <MdFilterList size={12} />
            {isFiltered && (
              <span className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full bg-primary pointer-events-none" />
            )}
          </button>

          {open && (
            <div className="absolute top-full mt-1 start-0 z-[300] bg-bg-paper border border-divider rounded-xl shadow-lg py-1 min-w-[140px]">
              <button
                onClick={() => { onFilterChange([]); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-gray-50 bg-transparent border-none cursor-pointer text-start"
              >
                All
              </button>
              <div className="h-px bg-divider mx-2 my-1" />
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 bg-transparent border-none cursor-pointer text-start"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={selected.includes(opt)}
                    className="w-3 h-3 accent-primary pointer-events-none"
                  />
                  <span className="text-text-primary">{opt}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ACTIVE_STATUSES = new Set(['PendingCenterManager', 'Pending', 'WaitingOnPrerequisite']);
const TERMINAL_STATUSES = new Set(['Approved', 'PartiallyApproved', 'ApprovedWithCondition', 'Rejected', 'CenterManagerRejected', 'Cancelled']);

// Demand sub-table inside an expanded project row
function DemandSubTable({
  projectName,
  canDecide,
  mode = 'active',
}: {
  projectName: string;
  canDecide: boolean;
  mode?: 'active' | 'history';
}) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const currentUsername = auth.user?.profile.preferred_username ?? '';

  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decidingDemand, setDecidingDemand] = useState<Demand | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);

  const { demands: allDemands, isLoading, updateDemand, deleteDemand, cancelDemand, approveDemand, rejectDemand } = useDemands(
    { projectName },
    { page: 1, limit: 100 }
  );

  const demands = useMemo(
    () => allDemands.filter(d => mode === 'history' ? TERMINAL_STATUSES.has(d.status) : ACTIVE_STATUSES.has(d.status)),
    [allDemands, mode]
  );

  async function handleSubmitDemand(
    payload: CreateDemandPayload | UpdateDemandPayload,
    demandId?: number
  ) {
    if (demandId) {
      await updateDemand(demandId, payload as UpdateDemandPayload);
      setEditingDemand(null);
    }
  }

  async function handleDeleteDemand(demand: Demand) {
    if (!window.confirm(t('demand.deleteConfirm', 'Delete this requirement?'))) return;
    try {
      await deleteDemand(demand.id);
      showToast(t('demand.deleted', 'Requirement deleted'), 'success');
    } catch {
      showToast(t('demand.deleteError', 'Failed to delete requirement'), 'error');
    }
  }

  async function handleCancelDemand(demand: Demand) {
    if (!window.confirm(t('demand.cancelConfirm', 'Cancel this requirement?'))) return;
    try {
      await cancelDemand(demand.id);
      showToast(t('demand.cancelled', 'Requirement cancelled'), 'success');
    } catch {
      showToast(t('demand.cancelError', 'Failed to cancel requirement'), 'error');
    }
  }

  async function handleApprove(payload: ApproveDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await approveDemand(decidingDemand.id, payload);
      showToast(t('management.success.approved'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  async function handleReject(payload: RejectDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await rejectDemand(decidingDemand.id, payload);
      showToast(t('management.success.rejected'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  function buildActions(demand: Demand): MoreAction[] {
    const isPending = demand.status === 'Pending';
    const isOwner = demand.createdBy === currentUsername;

    if (canDecide) {
      if (!isPending) return [];
      return [
        {
          label: t('management.decide', 'Decide'),
          icon: <MdGavel size={12} />,
          onClick: () => setDecidingDemand(demand),
        },
        {
          label: t('common.delete', 'Delete'),
          icon: <MdDelete size={12} />,
          danger: true,
          onClick: () => handleDeleteDemand(demand),
        },
      ];
    }

    if (!isPending || !isOwner) return [];
    return [
      {
        label: t('common.edit', 'Edit'),
        icon: <MdEdit size={12} />,
        onClick: () => setEditingDemand(demand),
      },
      {
        label: t('common.cancel', 'Cancel'),
        icon: <MdCancel size={12} />,
        danger: true,
        onClick: () => handleCancelDemand(demand),
      },
    ];
  }

  if (isLoading) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary border-t border-dashed border-primary/30">
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  if (demands.length === 0) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary italic border-t border-dashed border-primary/30">
        {t('demands.empty', 'No requirements')}
      </div>
    );
  }

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/[0.02]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-primary/5 text-text-secondary">
            <th className="ps-12 pe-3 py-2 text-start font-semibold">{t('demand.service', 'Service')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.resource', 'Resource')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.value', 'Value')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.status', 'Status')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('common.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {demands.map((demand) => {
            const rowActions = buildActions(demand);
            return (
              <tr
                key={demand.id}
                className="border-t border-divider/50 hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => setSelectedDemand(demand)}
              >
                <td className="ps-12 pe-3 py-2 text-text-primary">{demand.serviceName}</td>
                <td className="px-3 py-2 text-text-secondary">{demand.resourceName}</td>
                <td className="px-3 py-2 font-medium">{demand.value.toLocaleString()}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`text-[10px] font-medium ${
                      demand.status === 'Approved'
                        ? 'text-green-700'
                        : demand.status === 'Pending'
                        ? 'text-amber-600'
                        : demand.status === 'Rejected'
                        ? 'text-red-600'
                        : demand.status === 'PartiallyApproved'
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {demand.status}
                  </span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <MoreActionsMenu actions={rowActions} size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        onEdit={(d) => { setEditingDemand(d); setSelectedDemand(null); }}
        isModerator={canDecide}
        onMakeDecision={canDecide ? (d) => { setDecidingDemand(d); setSelectedDemand(null); } : undefined}
      />

      {editingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <DecisionModal
        open={decidingDemand !== null}
        onClose={() => setDecidingDemand(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        demand={decidingDemand}
        isLoading={isDecisionLoading}
      />
    </div>
  );
}

interface ProjectsAccordionProps {
  selectedCenters: string[];
  mode?: 'active' | 'history';
  createdBy?: string;
}

export default function ProjectsAccordion({ selectedCenters, mode = 'active', createdBy }: ProjectsAccordionProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const role = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase() || 'user';
  const canDecide = role === 'admin' || role === 'moderator';

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [duplicatingProject, setDuplicatingProject] = useState<Project | null>(null);

  // Client-side column filters
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({
    type: [],
    center: [],
    priority: [],
    status: [],
  });

  const [sortState, setSortState] = useState<{ field: string | null; direction: 'asc' | 'desc' }>({
    field: null,
    direction: 'asc',
  });

  // Fetch all projects — center/type/priority filters applied client-side
  const { projects: allProjects, isLoading, updateProject, deleteProject, duplicateProject } =
    useProjects({ createdBy }, { page: 1, limit: 1000 });

  const handleColumnSort = useCallback((field: string) => {
    setSortState((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    );
  }, []);

  const setColumnFilter = useCallback((col: string, values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [col]: values }));
  }, []);

  // Derive unique values for filter dropdowns
  const filterOptions = useMemo(
    () => ({
      type: [...new Set(allProjects.map((p) => p.type as string))].filter(Boolean),
      center: [...new Set(allProjects.map((p) => p.centerName ?? ''))].filter(Boolean),
      priority: [...new Set(allProjects.map((p) => p.priority ?? ''))].filter(Boolean),
      status: [...new Set(allProjects.map((p) => (p as any).status ?? ''))].filter(Boolean),
    }),
    [allProjects]
  );

  // Combined filter: top-bar selectedCenters + column filters
  const filteredProjects = useMemo(() => {
    let result = allProjects;
    if (selectedCenters.length > 0) {
      result = result.filter((p) => selectedCenters.includes(p.centerName ?? ''));
    }
    const colEntries = Object.entries(columnFilters);
    for (const [col, vals] of colEntries) {
      if (vals.length === 0) continue;
      result = result.filter((p) => {
        const v =
          col === 'type' ? (p.type as string)
          : col === 'center' ? (p.centerName ?? '')
          : col === 'priority' ? (p.priority ?? '')
          : col === 'status' ? ((p as any).status ?? '')
          : '';
        return vals.includes(v);
      });
    }
    return result;
  }, [allProjects, selectedCenters, columnFilters]);

  // Sort
  const sortedProjects = useMemo(() => {
    if (!sortState.field) return filteredProjects;
    return [...filteredProjects].sort((a, b) => {
      const val = (p: Project): string => {
        if (sortState.field === 'type') return p.type as string;
        if (sortState.field === 'center') return p.centerName ?? '';
        if (sortState.field === 'priority') return p.priority ?? '';
        if (sortState.field === 'status') return (p as any).status ?? '';
        return p.name;
      };
      const cmp = val(a).localeCompare(val(b));
      return sortState.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredProjects, sortState]);

  const { displayedItems: pageProjects, sentinelRef, hasMore } = useClientInfiniteScroll(sortedProjects, 20);

  const toggleExpand = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleDeleteProject = useCallback(
    async (project: Project) => {
      if (!window.confirm(t('project.deleteConfirm', 'Delete this project?'))) return;
      try {
        await deleteProject(project.name);
        showToast(t('project.deleted', 'Project deleted'), 'success');
        setSelectedProject(null);
      } catch {
        showToast(t('project.deleteError', 'Failed to delete project'), 'error');
      }
    },
    [deleteProject, showToast, t]
  );

  async function handleSubmitProject(
    payload: CreateProjectPayload | UpdateProjectPayload,
    projectName?: string
  ) {
    if (projectName) {
      await updateProject(projectName, payload as UpdateProjectPayload);
      setEditingProject(null);
    }
  }

  async function handleSubmitDuplicate(sourceName: string, payload: DuplicateProjectPayload) {
    await duplicateProject(sourceName, payload);
    setDuplicatingProject(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-divider overflow-visible bg-bg-paper shadow-sm">
        {/* Column header row */}
        <div className="flex items-center gap-3 bg-bg-default border-b border-divider px-4 py-3">
          <div className="w-6 shrink-0" />
          <div className="flex-1 min-w-0">
            <ColumnHeader
              label={t('project.name', 'Name')}
              options={[]}
              selected={[]}
              onFilterChange={() => {}}
              sortKey="name"
              currentSort={sortState}
              onSort={handleColumnSort}
            />
          </div>
          <div className="w-28 shrink-0">
            <ColumnHeader
              label={t('project.type', 'Type')}
              options={filterOptions.type}
              selected={columnFilters.type}
              onFilterChange={(v) => setColumnFilter('type', v)}
              sortKey="type"
              currentSort={sortState}
              onSort={handleColumnSort}
            />
          </div>
          <div className="w-32 shrink-0">
            <ColumnHeader
              label={t('project.center', 'Center')}
              options={filterOptions.center}
              selected={columnFilters.center}
              onFilterChange={(v) => setColumnFilter('center', v)}
              sortKey="center"
              currentSort={sortState}
              onSort={handleColumnSort}
            />
          </div>
          <div className="w-24 shrink-0">
            <ColumnHeader
              label={t('project.priority', 'Priority')}
              options={filterOptions.priority}
              selected={columnFilters.priority}
              onFilterChange={(v) => setColumnFilter('priority', v)}
              sortKey="priority"
              currentSort={sortState}
              onSort={handleColumnSort}
            />
          </div>
          <div className="w-28 shrink-0">
            <ColumnHeader
              label={t('project.status', 'Status')}
              options={filterOptions.status}
              selected={columnFilters.status}
              onFilterChange={(v) => setColumnFilter('status', v)}
              sortKey="status"
              currentSort={sortState}
              onSort={handleColumnSort}
            />
          </div>
          <div className="w-24 shrink-0 text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {t('common.actions', 'Actions')}
          </div>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-sm text-text-secondary">
            {t('common.loading', 'Loading…')}
          </div>
        )}

        {!isLoading && pageProjects.length === 0 && (
          <div className="py-12 text-center text-sm text-text-secondary italic">
            {t('projects.empty', 'No projects found')}
          </div>
        )}

        {!isLoading &&
          pageProjects.map((project) => {
            const isExpanded = expandedProjects.has(project.name);
            const projectStatus: string | undefined = (project as any).status;
            return (
              <div key={project.name} className="border-b border-divider last:border-0">
                <div
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/70 ${
                    isExpanded ? 'bg-primary/[0.03]' : ''
                  }`}
                >
                  {/* Expand toggle */}
                  <button
                    onClick={(e) => toggleExpand(project.name, e)}
                    className="w-6 shrink-0 flex items-center justify-center text-primary bg-transparent border-none cursor-pointer p-0"
                  >
                    {isExpanded ? <MdExpandMore size={18} /> : <MdChevronLeft size={18} />}
                  </button>

                  {/* Name */}
                  <button
                    onClick={() => setSelectedProject(project)}
                    className="flex-1 min-w-0 text-start text-sm font-medium text-text-primary hover:text-primary transition-colors bg-transparent border-none cursor-pointer truncate p-0"
                  >
                    {project.name}
                  </button>

                  {/* Type */}
                  <div className="w-28 shrink-0">
                    <span className="text-xs text-purple-700 font-medium">
                      {project.type}
                    </span>
                  </div>

                  {/* Center */}
                  <div className="w-32 shrink-0 text-sm text-text-secondary truncate">
                    {project.centerName ?? '—'}
                  </div>

                  {/* Priority */}
                  <div className="w-24 shrink-0">
                    {project.priority ? (
                      <PriorityBadge priority={project.priority as Priority} />
                    ) : (
                      <span className="text-text-secondary text-xs">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="w-28 shrink-0">
                    {projectStatus ? (
                      <span className="text-xs text-green-700 font-medium">
                        {projectStatus}
                      </span>
                    ) : (
                      <span className="text-text-secondary text-xs">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="w-24 shrink-0 flex items-center gap-1">
                    <span className="relative group">
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer rounded"
                      >
                        <MdDelete size={16} />
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('common.delete', 'Delete')}
                      </span>
                    </span>
                    <span className="relative group">
                      <button
                        onClick={() => setDuplicatingProject(project)}
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer rounded"
                      >
                        <MdContentCopy size={16} />
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('common.duplicate', 'Duplicate')}
                      </span>
                    </span>
                    <span className="relative group">
                      <button
                        onClick={() => setEditingProject(project)}
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer rounded"
                      >
                        <MdEdit size={16} />
                      </button>
                      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                        {t('common.edit', 'Edit')}
                      </span>
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <DemandSubTable projectName={project.name} canDecide={canDecide} mode={mode} />
                )}
              </div>
            );
          })}
      </div>

      <InfiniteScrollSentinel
        sentinelRef={sentinelRef}
        isLoading={isLoading}
        hasMore={hasMore}
      />

      <ProjectDetailSidebar
        project={selectedProject}
        isOpen={selectedProject !== null}
        onClose={() => setSelectedProject(null)}
        onEdit={setEditingProject}
        onDelete={handleDeleteProject}
      />

      {editingProject && (
        <CreateProjectModal
          isOpen
          onClose={() => setEditingProject(null)}
          onSubmit={handleSubmitProject}
          editingProject={editingProject}
        />
      )}

      {duplicatingProject && (
        <DuplicateProjectModal
          isOpen
          onClose={() => setDuplicatingProject(null)}
          sourceProject={duplicatingProject}
          onSubmit={handleSubmitDuplicate}
        />
      )}
    </div>
  );
}
