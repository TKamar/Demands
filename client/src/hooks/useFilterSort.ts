import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import type { SortState, SortDirection } from '../types/filter';

interface UseFilterSortOptions<TFilterKey extends string, TSortKey extends string> {
  initialFilters: Record<TFilterKey, string>;
  initialSort?: SortState<TSortKey>;
  debounceMs?: number;
}

interface UseFilterSortReturn<TFilterKey extends string, TSortKey extends string> {
  // Filter state
  filters: Record<TFilterKey, string>;
  debouncedFilters: Record<TFilterKey, string>;
  setFilter: (key: TFilterKey, value: string) => void;
  setFilters: React.Dispatch<React.SetStateAction<Record<TFilterKey, string>>>;
  clearAllFilters: () => void;
  isFiltersPending: boolean;

  // Sort state
  sortState: SortState<TSortKey>;
  setSort: (field: TSortKey | null, direction: SortDirection) => void;

  // Active counts
  activeFilterCount: number;
}

export function useFilterSort<
  TFilterKey extends string,
  TSortKey extends string = string
>(
  options: UseFilterSortOptions<TFilterKey, TSortKey>
): UseFilterSortReturn<TFilterKey, TSortKey> {
  const {
    initialFilters,
    initialSort = { field: null, direction: 'asc' as SortDirection },
    debounceMs = 300,
  } = options;

  // Filter state
  const [filters, setFilters] = useState<Record<TFilterKey, string>>(initialFilters);
  const debouncedFilters = useDebounce(filters, debounceMs);

  const isFiltersPending = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(debouncedFilters),
    [filters, debouncedFilters]
  );

  // Sort state
  const [sortState, setSortState] = useState<SortState<TSortKey>>(initialSort);

  // Actions
  const setFilter = useCallback((key: TFilterKey, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const setSort = useCallback((field: TSortKey | null, direction: SortDirection) => {
    setSortState({ field, direction });
  }, []);

  // Active filter count
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  return {
    filters,
    debouncedFilters,
    setFilter,
    setFilters,
    clearAllFilters,
    isFiltersPending,
    sortState,
    setSort,
    activeFilterCount,
  };
}
