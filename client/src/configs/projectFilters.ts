import type { FilterGroupConfig, SortOption } from '../types/filter';

export type ProjectFilterKey =
  | 'name'
  | 'type'
  | 'kind'
  | 'priority'
  | 'year'
  | 'median'
  | 'center'
  | 'branch'
  | 'section'
  | 'base'
  | 'environment'
  | 'network'
  | 'cluster'
  | 'relatedTo'
  | 'emergencyOption';

export type ProjectSortKey =
  | 'name'
  | 'type'
  | 'priority'
  | 'year'
  | 'createdAt'
  | 'demandCount';

export const projectFilterGroups: FilterGroupConfig<ProjectFilterKey>[] = [
  {
    id: 'general',
    label: 'filters.groups.general',
    defaultExpanded: false,
    fields: [
      { key: 'name', label: 'common.name', inputType: 'text', placeholder: 'common.search' },
      { key: 'type', label: 'projects.columns.type', inputType: 'select' },
      { key: 'kind', label: 'projects.columns.kind', inputType: 'select' },
      { key: 'priority', label: 'projects.createProject.priority', inputType: 'select' },
    ],
  },
  {
    id: 'timeline',
    label: 'filters.groups.timeline',
    defaultExpanded: false,
    fields: [
      { key: 'year', label: 'projects.columns.year', inputType: 'number' },
      { key: 'median', label: 'projects.columns.median', inputType: 'select' },
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
  {
    id: 'other',
    label: 'filters.groups.other',
    defaultExpanded: false,
    fields: [
      { key: 'relatedTo', label: 'projects.columns.relatedTo', inputType: 'text' },
      { key: 'emergencyOption', label: 'projects.columns.emergencyOption', inputType: 'select' },
    ],
  },
];

export const projectSortOptions: SortOption<ProjectSortKey>[] = [
  { key: 'name', label: 'projects.columns.name' },
  { key: 'type', label: 'projects.columns.type' },
  { key: 'priority', label: 'projects.columns.priority' },
  { key: 'year', label: 'projects.columns.year' },
  { key: 'demandCount', label: 'projects.columns.demandCount' },
  { key: 'createdAt', label: 'projects.columns.createdAt' },
];

export const initialProjectFilters: Record<ProjectFilterKey, string> = {
  name: '',
  type: '',
  kind: '',
  priority: '',
  year: '',
  median: '',
  center: '',
  branch: '',
  section: '',
  base: '',
  environment: '',
  network: '',
  cluster: '',
  relatedTo: '',
  emergencyOption: '',
};
