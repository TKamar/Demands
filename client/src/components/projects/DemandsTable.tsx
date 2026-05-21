import { useTranslation } from 'react-i18next';
import { MdEdit, MdCancel, MdGavel, MdArrowUpward, MdArrowDownward, MdUnfoldMore, MdRestore } from 'react-icons/md';
import type { Demand, Project } from '../../types/domain';
import type { ColumnConfig } from '../../types/table';
import type { SortState } from '../../types/filter';
import type { DemandSortKey } from '../../configs/demandFilters';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export type DemandColumnKey =
  | 'project'
  | 'service'
  | 'resource'
  | 'status'
  | 'value'
  | 'approvedValue'
  | 'location'
  | 'organization'
  | 'priority'
  | 'projectType'
  | 'id'
  | 'resourceService'
  | 'unit'
  | 'demandType'
  | 'clusterName'
  | 'approvedDate'
  | 'reason'
  | 'createdBy'
  | 'createdAt'
  | 'actions';

const SORTABLE_COLUMNS: Partial<Record<DemandColumnKey, DemandSortKey>> = {
  project: 'project',
  service: 'service',
  resource: 'resource',
  status: 'status',
  value: 'value',
  createdAt: 'createdAt',
};

export const demandColumnConfig: ColumnConfig<DemandColumnKey>[] = [
  { key: 'project', label: 'projects.columns.project', canHide: false },
  { key: 'service', label: 'projects.columns.service', defaultVisible: true },
  { key: 'resource', label: 'projects.columns.resource', defaultVisible: true },
  { key: 'status', label: 'projects.columns.status', defaultVisible: true },
  { key: 'value', label: 'projects.columns.value', defaultVisible: true },
  { key: 'unit', label: 'projects.columns.unit', defaultVisible: true },
  { key: 'approvedValue', label: 'projects.columns.approvedValue', defaultVisible: true },
  { key: 'location', label: 'projectsTable.columns.location', defaultVisible: true },
  { key: 'organization', label: 'projectsTable.columns.organization', defaultVisible: true },
  { key: 'priority', label: 'projects.createProject.priority', defaultVisible: true },
  { key: 'projectType', label: 'projects.columns.projectType', defaultVisible: true },
  { key: 'id', label: 'projects.columns.id', defaultVisible: false },
  { key: 'resourceService', label: 'projects.columns.resourceService', defaultVisible: false },
  { key: 'demandType', label: 'projects.columns.type', defaultVisible: false },
  { key: 'clusterName', label: 'demandSidebar.clusterName', defaultVisible: false },
  { key: 'approvedDate', label: 'projects.columns.approvedDate', defaultVisible: false },
  { key: 'reason', label: 'projects.columns.reason', defaultVisible: false },
  { key: 'createdBy', label: 'projects.columns.createdBy', defaultVisible: false },
  { key: 'createdAt', label: 'projects.columns.createdAt', defaultVisible: false },
  { key: 'actions', label: 'common.actions', canHide: false },
];

interface DemandsTableProps {
  demands: Demand[];
  projectMap: Map<string, Project>;
  isLoading?: boolean;
  selectedDemand?: Demand | null;
  onSelectDemand: (demand: Demand) => void;
  onEdit?: (demand: Demand) => void;
  onCancel?: (demand: Demand) => void;
  onMakeDecision?: (demand: Demand) => void;
  onRestore?: (demand: Demand) => void;
  visibleColumns: ColumnConfig<DemandColumnKey>[];
  hideActions?: boolean;
  isModerator?: boolean;
  totalValue?: number;
  totalApprovedValue?: number;
  // Column sort
  sortState?: SortState<DemandSortKey>;
  onColumnSort?: (key: DemandSortKey) => void;
}

export default function DemandsTable({
  demands,
  projectMap,
  isLoading,
  selectedDemand,
  onSelectDemand,
  onEdit,
  onCancel,
  onMakeDecision,
  onRestore,
  visibleColumns,
  hideActions = false,
  isModerator = false,
  totalValue,
  totalApprovedValue,
  sortState,
  onColumnSort,
}: DemandsTableProps) {
  const { t } = useTranslation();

  const renderCell = (demand: Demand, columnKey: DemandColumnKey) => {
    const project = projectMap.get(demand.projectName);

    switch (columnKey) {
      case 'project':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap font-medium text-primary">
            {demand.projectName}
          </td>
        );
      case 'service':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.serviceName}
          </td>
        );
      case 'resource':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.resourceName}
          </td>
        );
      case 'status':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <StatusBadge status={demand.status} />
          </td>
        );
      case 'value':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.value}
          </td>
        );
      case 'approvedValue':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.approvedValue ?? '-'}
          </td>
        );
      case 'location': {
        const fullLocation = [demand.location.base, demand.location.environment, demand.location.network, demand.location.cluster]
          .filter(Boolean)
          .join(' / ');
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <span className="relative group cursor-default">
              {demand.location.base || '-'}
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
            {[demand.centerName, demand.branchName, demand.sectionName]
              .filter(Boolean)
              .join(' / ') || '-'}
          </td>
        );
      case 'priority':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <PriorityBadge priority={project?.priority} />
          </td>
        );
      case 'projectType':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {project?.type ? t(`projects.type.${project.type}`) : '-'}
          </td>
        );
      case 'id':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap text-text-secondary">
            {demand.id}
          </td>
        );
      case 'resourceService':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.resourceService}
          </td>
        );
      case 'unit':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.unit}
          </td>
        );
      case 'demandType':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {t(`projects.demandType.${demand.type}`)}
          </td>
        );
      case 'clusterName':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.clusterName ?? '-'}
          </td>
        );
      case 'approvedDate':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.approvedDate ? new Date(demand.approvedDate).toLocaleDateString() : '-'}
          </td>
        );
      case 'reason':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.reason ?? '-'}
          </td>
        );
      case 'createdBy':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {demand.createdByName || demand.createdBy}
          </td>
        );
      case 'createdAt':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            {new Date(demand.createdAt).toLocaleDateString()}
          </td>
        );
      case 'actions':
        if (hideActions) {
          return <td key={columnKey} className="px-4 py-3 whitespace-nowrap"></td>;
        }
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center justify-center gap-1">
              {(demand.status === 'Rejected' || demand.status === 'CenterManagerRejected') && onRestore && (
                <span className="relative group">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRestore(demand); }}
                    className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <MdRestore size={18} />
                  </button>
                  <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded whitespace-nowrap shadow-lg pointer-events-none">
                    {t('demands.actions.restore', 'החזר דרישה')}
                  </span>
                </span>
              )}
              {demand.status === 'Pending' && (
                <div className="flex items-center gap-1">
                  {isModerator ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMakeDecision?.(demand); }}
                      className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                      title={t('management.makeDecision')}
                    >
                      <MdGavel size={18} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(demand); }}
                        className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                        title={t('common.edit')}
                      >
                        <MdEdit size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancel?.(demand); }}
                        className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer"
                        title={t('demands.actions.cancel')}
                      >
                        <MdCancel size={18} />
                      </button>
                    </>
                  )}
                </div>
              )}
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

  if (demands.length === 0) {
    return (
      <div className="p-12 text-center text-text-secondary">
        {t('projects.noDemands')}
      </div>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider">
            {visibleColumns.map((col) => {
              const sortKey = SORTABLE_COLUMNS[col.key];
              const isSorted = sortState?.field === sortKey;
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-start font-semibold text-text-secondary whitespace-nowrap bg-bg-default ${sortKey ? 'cursor-pointer select-none hover:text-text-primary' : ''}`}
                  onClick={sortKey ? () => onColumnSort?.(sortKey) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {t(col.label)}
                    {sortKey && (
                      <span className={isSorted ? 'text-primary' : 'text-text-secondary/40'}>
                        {isSorted
                          ? sortState!.direction === 'asc'
                            ? <MdArrowUpward size={14} />
                            : <MdArrowDownward size={14} />
                          : <MdUnfoldMore size={14} />
                        }
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {demands.map((demand) => {
            return (
              <tr
                key={demand.id}
                onClick={() => onSelectDemand(demand)}
                className={`border-b border-divider last:border-b-0 hover:bg-primary-light/30 transition-colors cursor-pointer ${
                  selectedDemand?.id === demand.id ? 'bg-primary-light' : ''
                }`}
              >
                {visibleColumns.map((col) => renderCell(demand, col.key))}
              </tr>
            );
          })}
        </tbody>
        {(totalValue !== undefined || totalApprovedValue !== undefined) && (
          <tfoot>
            <tr className="border-t-2 border-divider bg-bg-default">
              {visibleColumns.map((col, index) => {
                if (index === 0) {
                  return (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      {t('common.total')}
                    </td>
                  );
                }
                if (col.key === 'value' && totalValue !== undefined) {
                  return (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap font-semibold text-primary">
                      {totalValue.toLocaleString()}
                    </td>
                  );
                }
                if (col.key === 'approvedValue' && totalApprovedValue !== undefined) {
                  return (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap font-semibold text-primary">
                      {totalApprovedValue.toLocaleString()}
                    </td>
                  );
                }
                return <td key={col.key} className="px-4 py-2.5" />;
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
