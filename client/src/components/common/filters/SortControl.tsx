import { useTranslation } from 'react-i18next';
import { MdSort, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import Select from '../Select';
import type { SortOption, SortState, SortDirection } from '../../../types/filter';

interface SortControlProps<T extends string> {
  options: SortOption<T>[];
  sortState: SortState<T>;
  onSortChange: (field: T | null, direction: SortDirection) => void;
}

export default function SortControl<T extends string>({
  options,
  sortState,
  onSortChange,
}: SortControlProps<T>) {
  const { t } = useTranslation();

  const selectOptions = [
    { value: '', label: t('common.none', 'None') },
    ...options.map((o) => ({ value: o.key, label: t(o.label) })),
  ];

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-divider">
      <div className="flex items-center gap-2 text-text-secondary">
        <MdSort size={18} />
        <span className="text-sm font-medium">{t('common.sortBy', 'Sort by')}</span>
      </div>

      <div className="w-48">
        <Select
          options={selectOptions}
          value={sortState.field ?? ''}
          onChange={(val) => onSortChange((val as T) || null, sortState.direction)}
        />
      </div>

      {sortState.field && (
        <button
          type="button"
          onClick={() =>
            onSortChange(
              sortState.field,
              sortState.direction === 'asc' ? 'desc' : 'asc'
            )
          }
          className="p-2 rounded-lg hover:bg-bg-default transition-colors cursor-pointer border-none bg-transparent text-text-secondary"
          title={sortState.direction === 'asc' ? t('common.ascending') : t('common.descending')}
        >
          {sortState.direction === 'asc' ? (
            <MdArrowUpward size={18} />
          ) : (
            <MdArrowDownward size={18} />
          )}
        </button>
      )}
    </div>
  );
}
