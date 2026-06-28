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
} from 'react-icons/md';
import MoreActionsMenu from '../common/MoreActionsMenu';
import type { MoreAction } from '../common/MoreActionsMenu';
import { useProjects } from '../../hooks/useProjects';
import PriorityBadge from '../projects/PriorityBadge';
import DemandSubTable from './DemandSubTable';
import ProjectDetailSidebar from '../projects/ProjectDetailSidebar';
import CreateProjectModal from '../projects/CreateProjectModal';
import DuplicateProjectModal from '../projects/DuplicateProjectModal';
import BulkProjectActionModal from '../management/BulkProjectActionModal';
import HierarchicalBulkDecisionModal from '../management/HierarchicalBulkDecisionModal';
import { useClientInfiniteScroll } from '../../hooks/useClientInfiniteScroll';
import { InfiniteScrollSentinel } from '../common/InfiniteScrollSentinel';
import { useToast } from '../common/Toast';
import { approveDemandMatrix, fetchDemandsByProjectName } from '../../api/apiService';
import type { Project, Priority, Demand } from '../../types/domain';
import type {
  CreateProjectPayload,
  UpdateProjectPayload,
  DuplicateProjectPayload,
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
  const [selectedProjectNames, setSelectedProjectNames] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkDecisionModalOpen, setIsBulkDecisionModalOpen] = useState(false);
  const [bulkDecisionDemands, setBulkDecisionDemands] = useState<Demand[]>([]);
  const [isBulkDecisionLoading, setIsBulkDecisionLoading] = useState(false);

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

  const accordionWrapperRef = useRef<HTMLDivElement>(null);
  const { displayedItems: pageProjects, sentinelRef, hasMore } = useClientInfiniteScroll(
    sortedProjects,
    20,
    accordionWrapperRef.current,
  );

  const toggleExpand = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const toggleSelectProject = useCallback((name: string) => {
    setSelectedProjectNames((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedProjectNames.size === pageProjects.length) {
      setSelectedProjectNames(new Set());
    } else {
      setSelectedProjectNames(new Set(pageProjects.map((p) => p.name)));
    }
  }, [pageProjects, selectedProjectNames]);

  const clearSelection = useCallback(() => {
    setSelectedProjectNames(new Set());
  }, []);

  const handleOpenBulkDecision = useCallback(async () => {
    setIsBulkDecisionLoading(true);
    try {
      const results = await Promise.all(
        Array.from(selectedProjectNames).map(name => fetchDemandsByProjectName(name))
      );
      setBulkDecisionDemands(results.flat());
      setIsBulkDecisionModalOpen(true);
    } catch (err) {
      showToast(t('error.failed', 'Failed to load demands'), 'error');
    } finally {
      setIsBulkDecisionLoading(false);
    }
  }, [selectedProjectNames, showToast, t]);

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
      <div className="rounded-2xl border border-divider overflow-hidden bg-bg-paper shadow-sm">
        {/* Column header row */}
        <div className="flex items-center gap-3 bg-bg-default border-b border-divider px-4 py-3">
          <input
            type="checkbox"
            checked={selectedProjectNames.size > 0 && selectedProjectNames.size === pageProjects.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 shrink-0 cursor-pointer"
            title={t('common.selectAll', 'Select all')}
          />
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

        {/* Bounded scrollable list */}
        <div
          ref={accordionWrapperRef}
          className="overflow-y-auto overflow-x-auto"
          style={{ maxHeight: 'calc(100vh - 220px)' }}
        >
          {/* Batch action bar */}
          {selectedProjectNames.size > 0 && (
            <div className="flex items-center gap-3 bg-primary/5 border-b border-primary/20 px-4 py-3">
            <span className="text-sm font-medium text-text-primary">
              {t('common.selected', 'Selected')}: {selectedProjectNames.size}
            </span>
            <button
              onClick={clearSelection}
              className="text-sm px-3 py-1 rounded bg-transparent border border-text-secondary text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors cursor-pointer"
            >
              {t('common.clearSelection', 'Clear')}
            </button>
            {(canDecide) && (
              <>
                <button
                  onClick={handleOpenBulkDecision}
                  disabled={isBulkDecisionLoading}
                  className="text-sm px-3 py-1 rounded bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isBulkDecisionLoading ? '...' : t('bulk.makeDecision', 'קבלת החלטה')}
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="text-sm px-3 py-1 rounded bg-danger/10 border border-danger text-danger hover:bg-danger/20 transition-colors cursor-pointer ml-auto"
                >
                  {t('project.bulkDelete', 'Delete Selected')}
                </button>
              </>
            )}
          </div>
        )}

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
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedProjectNames.has(project.name)}
                    onChange={() => toggleSelectProject(project.name)}
                    className="w-4 h-4 shrink-0 cursor-pointer"
                  />

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
                  <DemandSubTable projectName={project.name} canDecide={canDecide} mode={mode} createdBy={createdBy} />
                )}
              </div>
            );
          })}
          <InfiniteScrollSentinel
            sentinelRef={sentinelRef}
            isLoading={isLoading}
            hasMore={hasMore}
          />
        </div>
      </div>

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

      <BulkProjectActionModal
        open={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedNames={Array.from(selectedProjectNames)}
        onDelete={async () => {
          try {
            for (const name of selectedProjectNames) {
              await deleteProject(name);
            }
            clearSelection();
            setIsBulkModalOpen(false);
            showToast(t('project.bulkDeleted', 'Projects deleted'), 'success');
          } catch {
            showToast(t('project.bulkDeleteError', 'Failed to delete projects'), 'error');
          }
        }}
      />

      <HierarchicalBulkDecisionModal
        open={isBulkDecisionModalOpen}
        onClose={() => { setIsBulkDecisionModalOpen(false); clearSelection(); }}
        demands={bulkDecisionDemands}
        onSubmit={async (decisions) => {
          try {
            await approveDemandMatrix({ decisions });
            showToast(t('management.success.approved'), 'success');
            setIsBulkDecisionModalOpen(false);
            clearSelection();
          } catch {
            showToast(t('error.failed', 'Failed to approve demands'), 'error');
          }
        }}
      />
    </div>
  );
}
