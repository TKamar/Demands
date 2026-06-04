import type { SelectOption } from '../components/common/Select';

// Filter field input types
export type FilterInputType =
  | 'select'           // Simple dropdown (Select component)
  | 'searchableSelect' // Searchable dropdown (SearchableSelect component)
  | 'text'             // Text input
  | 'number';          // Number input

// Individual filter field configuration
export interface FilterFieldConfig<T extends string = string> {
  key: T;
  label: string;                              // i18n key or display label
  inputType: FilterInputType;
  options?: SelectOption[];                   // For select types
  placeholder?: string;                       // Placeholder text (i18n key)
}

// Filter group/section configuration
export interface FilterGroupConfig<T extends string = string> {
  id: string;
  label: string;                              // i18n key for group title
  defaultExpanded?: boolean;
  fields: FilterFieldConfig<T>[];
}

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Sort configuration for a column
export interface SortOption<T extends string = string> {
  key: T;
  label: string;                              // i18n key for display
}

// Current sort state
export interface SortState<T extends string = string> {
  field: T | null;
  direction: SortDirection;
}

// Main FilterSort component props
export interface FilterSortProps<
  TFilterKey extends string = string,
  TSortKey extends string = string
> {
  // Filter configuration
  filterGroups: FilterGroupConfig<TFilterKey>[];
  filterValues: Record<string, string>;
  onFilterChange: (key: TFilterKey, value: string) => void;
  onClearAllFilters: () => void;

  // Sort configuration
  sortOptions: SortOption<TSortKey>[];
  sortState: SortState<TSortKey>;
  onSortChange: (field: TSortKey | null, direction: SortDirection) => void;

  // Display options
  className?: string;
  compact?: boolean;
}
