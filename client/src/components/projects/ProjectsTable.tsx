import { useTranslation } from 'react-i18next';
import { MdEdit, MdDelete, MdContentCopy } from 'react-icons/md';
import type { Project } from '../../types/domain';
import type { ColumnConfig } from '../../types/table';
import PriorityBadge from './PriorityBadge';

export type ProjectColumnKey =
  | 'name'
  | 'type'
  | 'relatedTo'
  | 'location'
  | 'organization'
  | 'priority'
  | 'purpose'
  | 'kind'
  | 'year'
  | 'median'
  | 'emergencyOption'
  | 'demandCount'
  | 'createdBy'
  | 'createdAt'
  | 'actions';

export const projectColumnConfig: ColumnConfig<ProjectColumnKey>[] = [
  { key: 'name', label: 'projectsTable.columns.name', canHide: false },
  { key: 'type', label: 'projects.columns.type', defaultVisible: true },
  { key: 'relatedTo', label: 'projectsTable.columns.relatedTo', defaultVisible: true },
  { key: 'location', label: 'projectsTable.columns.location', defaultVisible: true },
  { key: 'organization', label: 'projectsTable.columns.organization', defaultVisible: true },
  { key: 'priority', label: 'projects.createProject.priority', defaultVisible: true },
  { key: 'purpose', label: 'projectsTable.columns.purpose', defaultVisible: false },
  { key: 'kind', label: 'projectsTable.columns.kind', defaultVisible: false },
  { key: 'year', label: 'projects.columns.year', defaultVisible: false },
  { key: 'median', label: 'projects.columns.median', defaultVisible: false },
  { key: 'emergencyOption', label: 'projects.columns.emergencyOption', defaultVisible: false },
  { key: 'demandCount', label: 'projectsTable.columns.demandCount', defaultVisible: false },
  { key: 'createdBy', label: 'projects.columns.createdBy', defaultVisible: false },
  { key: 'createdAt', label: 'projects.columns.createdAt', defaultVisible: false },
  { key: 'actions', label: 'common.actions', canHide: false },
];

interface ProjectsTableProps {
  projects: Project[];
  isLoading?: boolean;
  selectedProject?: Project | null;
  onSelectProject: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  visibleColumns: ColumnConfig<ProjectColumnKey>[];
}

export default function ProjectsTable({
  projects,
  isLoading,
  selectedProject,
  onSelectProject,
  onEdit,
  onDelete,
  onDuplicate,
  visibleColumns,
}: ProjectsTableProps) {
  const { t } = useTranslation();

  const renderCell = (project: Project, columnKey: ProjectColumnKey) => {
    switch (columnKey) {
      case 'name':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap font-medium text-primary">
            {project.name}
          </td>
        );
      case 'type':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">
              {t(`projects.type.${project.type}`)}
            </span>
          </td>
        );
      case 'relatedTo':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.relatedTo ?? '-'}
          </td>
        );
      case 'location': {
        const fullLocation = [
          project.location.base,
          project.location.environment,
          project.location.network,
          project.location.cluster,
        ]
          .filter(Boolean)
          .join(' / ');
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <span className="relative group cursor-default">
              {project.location.base || '-'}
              <span className="invisible group-hover:visible absolute z-50 bottom-full start-0 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg">
                {fullLocation}
              </span>
            </span>
          </td>
        );
      }
      case 'organization':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {[project.centerName, project.branchName, project.sectionName]
              .filter(Boolean)
              .join(' / ')}
          </td>
        );
      case 'priority':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <PriorityBadge priority={project.priority} />
          </td>
        );
      case 'purpose':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap max-w-xs truncate" title={project.purpose}>
            {project.purpose || '-'}
          </td>
        );
      case 'kind':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.kind ? t(`projects.kind.${project.kind}`) : '-'}
          </td>
        );
      case 'year':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.year ?? '-'}
          </td>
        );
      case 'median':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.median ?? '-'}
          </td>
        );
      case 'emergencyOption':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.emergencyOption ?? '-'}
          </td>
        );
      case 'demandCount':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.demandCount ?? 0}
          </td>
        );
      case 'createdBy':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project.createdByName || project.createdBy}
          </td>
        );
      case 'createdAt':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {new Date(project.createdAt).toLocaleDateString()}
          </td>
        );
      case 'actions':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={(project.demandCount ?? 0) > 0 ? t('projects.actions.cannotDeleteWithDemands') : t('common.delete')}
                disabled={(project.demandCount ?? 0) > 0}
              >
                <MdDelete size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(project); }}
                className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                title={t('projects.actions.duplicate')}
              >
                <MdContentCopy size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(project); }}
                className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                title={t('common.edit')}
              >
                <MdEdit size={18} />
              </button>
            </div>
          </td>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-12 text-center text-text-secondary">
        {t('projectsTable.noProjects')}
      </div>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider">
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-start font-semibold text-text-secondary whitespace-nowrap bg-bg-default"
              >
                {t(col.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.name}
              onClick={() => onSelectProject(project)}
              className={`border-b border-divider last:border-b-0 hover:bg-primary-light/30 transition-colors cursor-pointer ${
                selectedProject?.name === project.name ? 'bg-primary-light' : ''
              }`}
            >
              {visibleColumns.map((col) => renderCell(project, col.key))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
