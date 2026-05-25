import { MdDelete } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Select from '../common/Select';

export interface ResourceEntry {
  id: string;
  resourceName: string;
  value: number | '';
  unit: string;
}

interface ResourceRowProps {
  index: number;
  entry: ResourceEntry;
  resourceOptions: Array<{ value: string; label: string; unit: string }>;
  onChange: (index: number, updates: Partial<ResourceEntry>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

const inputClass =
  'w-full px-4 py-2.5 border border-divider rounded-xl text-sm bg-bg-paper text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors';

export default function ResourceRow({
  index,
  entry,
  resourceOptions,
  onChange,
  onRemove,
  canRemove,
}: ResourceRowProps) {
  const { t } = useTranslation();

  const handleResourceChange = (name: string) => {
    const opt = resourceOptions.find((o) => o.value === name);
    onChange(index, { resourceName: name, unit: opt?.unit ?? '' });
  };

  return (
    <div className="flex items-end gap-3 bg-bg-default rounded-xl p-3">
      {/* Resource */}
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-text-secondary mb-1">
          {t('projects.createDemand.resource')} <span className="text-danger">*</span>
        </label>
        <Select
          options={resourceOptions}
          value={entry.resourceName}
          onChange={handleResourceChange}
          placeholder={t('projects.createDemand.selectOption')}
        />
      </div>

      {/* Value */}
      <div className="w-28 shrink-0">
        <label className="block text-xs font-medium text-text-secondary mb-1">
          {t('projects.createDemand.value')} <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          min={0}
          step="any"
          value={entry.value}
          onChange={(e) => onChange(index, { value: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="0"
          className={inputClass}
        />
      </div>

      {/* Unit */}
      <div className="w-20 shrink-0">
        <label className="block text-xs font-medium text-text-secondary mb-1">
          {t('projects.createDemand.unit')}
        </label>
        <input
          type="text"
          value={entry.unit}
          readOnly
          disabled
          className={`${inputClass} bg-gray-50 text-text-secondary`}
        />
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="mb-0.5 p-2 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        title={t('common.remove', 'Remove')}
      >
        <MdDelete size={18} />
      </button>
    </div>
  );
}
