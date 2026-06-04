import type { FilterGroupConfig, SortOption } from '../types/filter';

export type DemandFilterKey =
  | 'projectName'
  | 'serviceName'
  | 'resourceName'
  | 'base'
  | 'environment'
  | 'network'
  | 'cluster'
  | 'type'
  | 'status'
  | 'projectType'
  | 'median'
  | 'year'
  | 'relatedTo'
  | 'emergencyOption'
  | 'center'
  | 'branch'
  | 'section'
  | 'priority';

export type DemandSortKey =
  | 'project'
  | 'status'
  | 'value'
  | 'createdAt'
  | 'service'
  | 'resource';

export const demandFilterGroups: FilterGroupConfig<DemandFilterKey>[] = [
  {
    id: 'general',
    label: 'filters.groups.general',
    defaultExpanded: false,
    fields: [
      { key: 'type', label: 'projects.columns.type', inputType: 'select' },
      { key: 'status', label: 'projects.columns.status', inputType: 'select' },
    ],
  },
  {
    id: 'project',
    label: 'filters.groups.project',
    defaultExpanded: false,
    fields: [
      { key: 'projectName', label: 'projects.columns.project', inputType: 'searchableSelect' },
      { key: 'projectType', label: 'projects.columns.projectType', inputType: 'select' },
      { key: 'median', label: 'projects.columns.median', inputType: 'select' },
      { key: 'year', label: 'projects.columns.year', inputType: 'number' },
      { key: 'relatedTo', label: 'projects.columns.relatedTo', inputType: 'text' },
      { key: 'emergencyOption', label: 'projects.columns.emergencyOption', inputType: 'select' },
      { key: 'priority', label: 'projects.createProject.priority', inputType: 'select' },
    ],
  },
  {
    id: 'service',
    label: 'filters.groups.service',
    defaultExpanded: false,
    fields: [
      { key: 'serviceName', label: 'projects.columns.service', inputType: 'searchableSelect' },
      { key: 'resourceName', label: 'projects.columns.resource', inputType: 'select' },
    ],
  },
  {
    id: 'organization',
    label: 'filters.groups.organization',
    defaultExpanded: false,
    fields: [
      { key: 'center', label: 'projects.columns.center', inputType: 'select' },
      { key: 'branch', label: 'projects.columns.branch', inputType: 'select' },
      { key: 'section', label: 'projects.columns.section', inputType: 'select' },
    ],
  },
  {
    id: 'location',
    label: 'filters.groups.location',
    defaultExpanded: false,
    fields: [
      { key: 'base', label: 'projects.columns.base', inputType: 'select' },
      { key: 'environment', label: 'projects.columns.environment', inputType: 'select' },
      { key: 'network', label: 'projects.columns.network', inputType: 'select' },
      { key: 'cluster', label: 'projects.columns.cluster', inputType: 'select' },
    ],
  },
];

export const demandSortOptions: SortOption<DemandSortKey>[] = [
  { key: 'project', label: 'projects.columns.project' },
  { key: 'status', label: 'projects.columns.status' },
  { key: 'value', label: 'projects.columns.value' },
  { key: 'service', label: 'projects.columns.service' },
  { key: 'resource', label: 'projects.columns.resource' },
  { key: 'createdAt', label: 'projects.columns.createdAt' },
];

export const initialDemandFilters: Record<DemandFilterKey, string> = {
  projectName: '',
  serviceName: '',
  resourceName: '',
  base: '',
  environment: '',
  network: '',
  cluster: '',
  type: '',
  status: '',
  projectType: '',
  median: '',
  year: '',
  relatedTo: '',
  emergencyOption: '',
  center: '',
  branch: '',
  section: '',
  priority: '',
};
