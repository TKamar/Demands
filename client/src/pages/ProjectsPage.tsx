import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
import PageHeader from '../components/layout/PageHeader';
import ProjectsTable, { projectColumnConfig, type ProjectColumnKey } from '../components/projects/ProjectsTable';
import ProjectDetailSidebar from '../components/projects/ProjectDetailSidebar';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import DuplicateProjectModal from '../components/projects/DuplicateProjectModal';
import ColumnSettingsDropdown from '../components/common/ColumnSettingsDropdown';
import { FilterSort } from '../components/common/filters';
import { useProjects } from '../hooks/useProjects';
import { useReferenceData } from '../hooks/useReferenceData';
import { useDebounce } from '../hooks/useDebounce';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { useTableColumns } from '../hooks/useTableColumns';
import { useToast } from '../components/common/Toast';
import type { CreateProjectPayload, UpdateProjectPayload, DuplicateProjectPayload } from '../api/types';
import type { Project } from '../types/domain';
import Pagination from '../components/common/Pagination';
import {
  projectFilterGroups,
  projectSortOptions,
  initialProjectFilters,
  type ProjectFilterKey,
  type ProjectSortKey,
} from '../configs/projectFilters';
import type { FilterGroupConfig, SortState, SortDirection } from '../types/filter';

export default function ProjectsPage() {
  const { t } = useTranslation();

  // Column settings
  const {
    orderedVisibleColumns,
    allColumns,
    toggleColumn,
    reorderColumns,
    resetToDefaults,
  } = useTableColumns<ProjectColumnKey>({
    tableId: 'projects',
    columns: projectColumnConfig,
  });

  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter State
  const [filters, setFilters] = useState<Record<ProjectFilterKey, string>>(initialProjectFilters);

  // Sort State
  const [sortState, setSortState] = useState<SortState<ProjectSortKey>>({
    field: null,
    direction: 'asc',
  });

  const debouncedFilters = useDebounce(filters, 300);

  // Only pass name filter to server (that's what the API supports)
  const { projects: allProjects, isLoading, error, createProject, updateProject, deleteProject, duplicateProject } = useProjects(
    { name: debouncedFilters.name },
    { page: 1, limit: 1000 } // Fetch all for client-side filtering
  );

  const isFiltersPending = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(debouncedFilters),
    [filters, debouncedFilters]
  );

  const showLoading = useDelayedLoading(isLoading);

  const { showToast } = useToast();
  const { bases, environments, networks, clusters, projectKinds, emergencyOptions, centers, branches, sections } = useReferenceData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [duplicatingProject, setDuplicatingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Build filter groups with dynamic options
  const filterGroupsWithOptions = useMemo((): FilterGroupConfig<ProjectFilterKey>[] => {
    const typeOptions = [
      { value: 'Emergency', label: 'Emergency' },
      { value: 'Semiannual', label: 'Semiannual' },
    ];

    const kindOptions = projectKinds.map((k) => ({ value: k.name, label: k.displayName || k.name }));

    const priorityOptions = [
      { value: 'P1', label: 'P1' },
      { value: 'P2', label: 'P2' },
      { value: 'P3', label: 'P3' },
    ];

    const medianOptions = [
      { value: 'H1', label: 'H1' },
      { value: 'H2', label: 'H2' },
    ];

    const baseOptions = bases.map((b) => ({ value: b.name, label: b.displayName || b.name }));
    const environmentOptions = environments.map((e) => ({ value: e.name, label: e.displayName || e.name }));
    const networkOptions = networks.map((n) => ({ value: n.name, label: n.displayName || n.name }));
    const clusterOptions = clusters.map((c) => ({ value: c.name, label: c.displayName || c.name }));
    const centerOptions = centers.map((c) => ({ value: c.name, label: c.displayName || c.name }));
    const branchOptions = branches.map((b) => ({ value: b.name, label: b.displayName || b.name }));
    const sectionOptions = sections.map((s) => ({ value: s.name, label: s.displayName || s.name }));
    const emergencyOptionOptions = emergencyOptions.map((eo) => ({ value: eo.name, label: eo.name }));

    const optionsMap: Record<ProjectFilterKey, { value: string; label: string }[]> = {
      name: [],
      type: typeOptions,
      kind: kindOptions,
      priority: priorityOptions,
      year: [],
      median: medianOptions,
      center: centerOptions,
      branch: branchOptions,
      section: sectionOptions,
      base: baseOptions,
      environment: environmentOptions,
      network: networkOptions,
      cluster: clusterOptions,
      relatedTo: [],
      emergencyOption: emergencyOptionOptions,
    };

    return projectFilterGroups.map((group) => ({
      ...group,
      fields: group.fields.map((field) => ({
        ...field,
        options: optionsMap[field.key],
      })),
    }));
  }, [projectKinds, bases, environments, networks, clusters, centers, branches, sections, emergencyOptions]);

  // Apply client-side filtering
  const filteredProjects = useMemo(() => {
    return allProjects.filter((project) => {
      // Name filter is already applied server-side, but we can also check here for consistency
      if (debouncedFilters.name && !project.name.toLowerCase().includes(debouncedFilters.name.toLowerCase())) {
        return false;
      }

      if (debouncedFilters.type && project.type !== debouncedFilters.type) {
        return false;
      }

      if (debouncedFilters.kind && project.kind !== debouncedFilters.kind) {
        return false;
      }

      if (debouncedFilters.priority && project.priority !== debouncedFilters.priority) {
        return false;
      }

      if (debouncedFilters.year && project.year !== Number(debouncedFilters.year)) {
        return false;
      }

      if (debouncedFilters.median && project.median !== debouncedFilters.median) {
        return false;
      }

      if (debouncedFilters.center && project.centerName !== debouncedFilters.center) {
        return false;
      }

      if (debouncedFilters.branch && project.branchName !== debouncedFilters.branch) {
        return false;
      }

      if (debouncedFilters.section && project.sectionName !== debouncedFilters.section) {
        return false;
      }

      if (debouncedFilters.base && project.location?.base !== debouncedFilters.base) {
        return false;
      }

      if (debouncedFilters.environment && project.location?.environment !== debouncedFilters.environment) {
        return false;
      }

      if (debouncedFilters.network && project.location?.network !== debouncedFilters.network) {
        return false;
      }

      if (debouncedFilters.cluster && project.location?.cluster !== debouncedFilters.cluster) {
        return false;
      }

      if (debouncedFilters.relatedTo && !project.relatedTo?.toLowerCase().includes(debouncedFilters.relatedTo.toLowerCase())) {
        return false;
      }

      if (debouncedFilters.emergencyOption && project.emergencyOption !== debouncedFilters.emergencyOption) {
        return false;
      }

      return true;
    });
  }, [allProjects, debouncedFilters]);

  // Sort projects client-side
  const sortedProjects = useMemo(() => {
    if (!sortState.field) return filteredProjects;

    return [...filteredProjects].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortState.field) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'priority':
          aVal = a.priority || '';
          bVal = b.priority || '';
          break;
        case 'year':
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
        case 'demandCount':
          aVal = a.demandCount || 0;
          bVal = b.demandCount || 0;
          break;
        case 'createdAt':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredProjects, sortState]);

  // Paginate client-side
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(start, start + itemsPerPage);
  }, [sortedProjects, currentPage, itemsPerPage]);

  const total = sortedProjects.length;
  const totalPages = Math.ceil(total / itemsPerPage);

  async function handleSubmitProject(payload: CreateProjectPayload | UpdateProjectPayload, projectName?: string) {
    if (projectName) {
      await updateProject(projectName, payload as UpdateProjectPayload);
    } else {
      await createProject(payload as CreateProjectPayload);
      setFilters((prev) => ({ ...prev, name: (payload as CreateProjectPayload).name }));
    }
    setCurrentPage(1);
  }

  function handleEditProject(project: Project) {
    setEditingProject(project);
    setIsModalOpen(true);
    setSelectedProject(null);
  }

  async function handleDeleteProject(project: Project) {
    if (window.confirm(t('projects.confirmDelete'))) {
      try {
        await deleteProject(project.name);
        showToast(t('projects.deleteSuccess'), 'success');
        setSelectedProject(null);
      } catch (err: any) {
        showToast(err?.response?.data?.error || t('projects.deleteFailed'), 'error');
      }
    }
  }

  async function handleDuplicateProject(sourceName: string, payload: DuplicateProjectPayload) {
    await duplicateProject(sourceName, payload);
    setCurrentPage(1);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingProject(null);
  }

  function handleOpenCreateModal() {
    setEditingProject(null);
    setIsModalOpen(true);
  }

  const handleFilterChange = useCallback((key: ProjectFilterKey, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setFilters(initialProjectFilters);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((field: ProjectSortKey | null, direction: SortDirection) => {
    setSortState({ field, direction });
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={t('projects.title')}
          subtitle={t('projects.subtitle')}
        />

        <div className="flex gap-3">
          <ColumnSettingsDropdown
            columns={allColumns}
            visibleColumns={orderedVisibleColumns.map((c) => c.key)}
            onToggleColumn={toggleColumn}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-text-primary text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer border-none whitespace-nowrap"
          >
            <MdAdd size={18} />
            {t('projects.newProject')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterSort
        filterGroups={filterGroupsWithOptions}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearAllFilters={handleClearAllFilters}
        sortOptions={projectSortOptions}
        sortState={sortState}
        onSortChange={handleSortChange}
      />

      {/* Table Card */}
      <div className="bg-bg-paper rounded-2xl border border-divider shadow-sm overflow-hidden">
        <div className={`overflow-x-auto transition-opacity duration-200 ${isFiltersPending || showLoading ? 'opacity-50' : 'opacity-100'}`}>
          <ProjectsTable
            projects={paginatedProjects}
            isLoading={false}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onDuplicate={(p) => setDuplicatingProject(p)}
            visibleColumns={orderedVisibleColumns}
          />
        </div>

        {!isLoading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={total}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {isModalOpen && (
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitProject}
          editingProject={editingProject}
        />
      )}

      <ProjectDetailSidebar
        project={selectedProject}
        isOpen={selectedProject !== null}
        onClose={() => setSelectedProject(null)}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
      />

      {duplicatingProject && (
        <DuplicateProjectModal
          isOpen={true}
          onClose={() => setDuplicatingProject(null)}
          sourceProject={duplicatingProject}
          onSubmit={handleDuplicateProject}
        />
      )}
    </div>
  );
}
