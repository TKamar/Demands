import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore } from 'react-icons/md';
import FilterField from './FilterField';
import type { FilterGroupConfig } from '../../../types/filter';

interface FilterGroupProps<T extends string> {
  group: FilterGroupConfig<T>;
  values: Record<string, string>;
  onChange: (key: T, value: string) => void;
  activeCount: number;
}

export default function FilterGroup<T extends string>({
  group,
  values,
  onChange,
  activeCount,
}: FilterGroupProps<T>) {
  const [isExpanded, setIsExpanded] = useState(group.defaultExpanded ?? false);
  const { t } = useTranslation();

  return (
    <div className="border border-divider rounded-xl">
      {/* Header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-default hover:bg-bg-default transition-colors cursor-pointer border-none text-start"
      >
        <span className="font-medium text-text-primary text-sm">
          {t(group.label)}
        </span>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full min-w-[20px] text-center">
              {activeCount}
            </span>
          )}
          <MdExpandMore
            size={20}
            className={`text-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-bg-paper">
          {group.fields.map((field) => (
            <FilterField
              key={field.key}
              field={field}
              value={values[field.key] ?? ''}
              onChange={(val) => onChange(field.key, val)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
