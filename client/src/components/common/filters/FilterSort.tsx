import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { MdFilterList } from 'react-icons/md';
import FilterGroup from './FilterGroup';
import SortControl from './SortControl';
import type { FilterSortProps } from '../../../types/filter';

export default function FilterSort<
  TFilterKey extends string = string,
  TSortKey extends string = string
>({
  filterGroups,
  filterValues,
  onFilterChange,
  onClearAllFilters,
  sortOptions,
  sortState,
  onSortChange,
  className = '',
  compact = false,
}: FilterSortProps<TFilterKey, TSortKey>) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Calculate dropdown position when expanded
  useEffect(() => {
    if (!isCollapsed && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
        minWidth: 'min(600px, 90vw)',
      });
    }
  }, [isCollapsed]);

  // Close dropdown on outside click
  useEffect(() => {
    if (isCollapsed) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) {
        setIsCollapsed(true);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isCollapsed]);

  // Calculate total active filters
  const totalActiveFilters = useMemo(
    () => Object.values(filterValues).filter(Boolean).length,
    [filterValues]
  );

  // Calculate active filters per group
  const activeCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    filterGroups.forEach((group) => {
      counts[group.id] = group.fields.filter((f) => filterValues[f.key]).length;
    });
    return counts;
  }, [filterGroups, filterValues]);

  if (compact) {
    return (
      <div className={className}>
        {/* Compact toggle button with badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer text-text-secondary hover:text-primary"
          >
            <MdFilterList size={20} />
          </button>
          {totalActiveFilters > 0 && (
            <span className="absolute -top-1 -end-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center pointer-events-none">
              {totalActiveFilters}
            </span>
          )}
        </div>

        {/* Expanded panel rendered below the button row (inside the card) */}
        {!isCollapsed && (
          <div className="absolute end-0 top-full z-20 w-[min(600px,90vw)] bg-bg-paper border border-divider rounded-xl shadow-lg mt-1">
            {/* Clear filters link */}
            {totalActiveFilters > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-divider">
                <span className="text-xs text-text-secondary">
                  {t('common.filters')} ({totalActiveFilters})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearAllFilters();
                  }}
                  className="text-xs text-primary font-medium hover:underline bg-transparent border-none cursor-pointer"
                >
                  {t('common.clearFilters')}
                </button>
              </div>
            )}

            {/* Sort Control */}
            {sortOptions && sortOptions.length > 0 && sortState && onSortChange && (
              <SortControl
                options={sortOptions}
                sortState={sortState}
                onSortChange={onSortChange}
              />
            )}

            {/* Filter Groups */}
            <div className="p-4 space-y-2">
              {filterGroups.map((group) => (
                <FilterGroup
                  key={group.id}
                  group={group}
                  values={filterValues}
                  onChange={onFilterChange}
                  activeCount={activeCountByGroup[group.id]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-bg-paper rounded-2xl border border-divider shadow-sm ${className}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-divider cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <button
            type="button"
            className={`p-1 rounded-full hover:bg-gray-100 transition-transform duration-200 border-none bg-transparent cursor-pointer flex items-center justify-center ${isCollapsed ? '-rotate-90' : ''}`}
          >
            <MdFilterList size={20} />
          </button>
          <span className="font-semibold text-sm">{t('common.filters')}</span>
          {totalActiveFilters > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full min-w-[20px] text-center">
              {totalActiveFilters}
            </span>
          )}
        </div>

        {totalActiveFilters > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearAllFilters();
            }}
            className="text-xs text-primary font-medium hover:underline bg-transparent border-none cursor-pointer"
          >
            {t('common.clearFilters')}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Sort Control */}
          {sortOptions && sortOptions.length > 0 && sortState && onSortChange && (
            <SortControl
              options={sortOptions}
              sortState={sortState}
              onSortChange={onSortChange}
            />
          )}

          {/* Filter Groups */}
          <div className="p-4 space-y-2">
            {filterGroups.map((group) => (
              <FilterGroup
                key={group.id}
                group={group}
                values={filterValues}
                onChange={onFilterChange}
                activeCount={activeCountByGroup[group.id]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
