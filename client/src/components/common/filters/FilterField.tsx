import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '../Select';
import SearchableSelect from '../SearchableSelect';
import type { FilterFieldConfig } from '../../../types/filter';

interface FilterFieldProps<T extends string> {
  field: FilterFieldConfig<T>;
  value: string;
  onChange: (value: string) => void;
}

export default function FilterField<T extends string>({
  field,
  value,
  onChange,
}: FilterFieldProps<T>) {
  const { t } = useTranslation();

  const selectOptions = useMemo(() => {
    if (!field.options) return [];
    return [{ value: '', label: t('common.all') }, ...field.options];
  }, [field.options, t]);

  const searchableOptions = useMemo(() => {
    return field.options || [];
  }, [field.options]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-secondary">
        {t(field.label)}
      </label>

      {field.inputType === 'select' && (
        <Select
          options={selectOptions}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder ? t(field.placeholder) : t('common.all')}
        />
      )}

      {field.inputType === 'searchableSelect' && (
        <SearchableSelect
          options={searchableOptions}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder ? t(field.placeholder) : t('common.all')}
        />
      )}

      {field.inputType === 'text' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ? t(field.placeholder) : t('common.search')}
          className="w-full px-3 py-2 text-sm border border-divider rounded-xl bg-bg-paper text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {field.inputType === 'number' && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ? t(field.placeholder) : ''}
          className="w-full px-3 py-2 text-sm border border-divider rounded-xl bg-bg-paper text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );
}
