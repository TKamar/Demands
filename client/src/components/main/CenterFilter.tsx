// client/src/components/main/CenterFilter.tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore } from 'react-icons/md';
import { fetchCenters } from '../../api/apiService';
import type { ReferenceItem } from '../../api/types';

interface CenterFilterProps {
  selectedCenters: string[];
  onChange: (centers: string[]) => void;
}

export default function CenterFilter({ selectedCenters, onChange }: CenterFilterProps) {
  const { t } = useTranslation();
  const [centers, setCenters] = useState<ReferenceItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCenters().then(setCenters).catch(console.error);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const allSelected = selectedCenters.length === 0;

  const toggleCenter = (name: string) => {
    if (selectedCenters.includes(name)) {
      onChange(selectedCenters.filter((c) => c !== name));
    } else {
      onChange([...selectedCenters, name]);
    }
  };

  const selectAll = () => onChange([]);

  const label = allSelected
    ? t('centerFilter.all', 'All Centers')
    : selectedCenters.length === 1
    ? centers.find((c) => c.name === selectedCenters[0])?.displayName || selectedCenters[0]
    : t('centerFilter.count', '{{count}} centers', { count: selectedCenters.length });

  return (
    <div className="relative flex items-center gap-2" ref={containerRef}>
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
        {t('centerFilter.label', 'Center')}
      </span>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-divider rounded-lg bg-bg-paper text-sm text-text-primary hover:border-primary transition-colors cursor-pointer min-w-[140px] text-start"
      >
        <span className="flex-1 truncate">{label}</span>
        <MdExpandMore
          size={16}
          className={`text-text-secondary transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute start-[56px] top-full mt-1 w-52 bg-bg-paper rounded-xl shadow-lg border border-divider overflow-hidden z-[200] py-1">
          {/* Select All */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-bg-default transition-colors bg-transparent border-none cursor-pointer text-start"
          >
            <input
              type="checkbox"
              readOnly
              checked={allSelected}
              className="w-3.5 h-3.5 accent-primary"
            />
            <span className="text-text-primary font-medium">{t('centerFilter.selectAll', 'All Centers')}</span>
          </button>
          <div className="h-px bg-divider mx-2 my-1" />
          {centers.map((center) => (
            <button
              key={center.name}
              onClick={() => toggleCenter(center.name)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-bg-default transition-colors bg-transparent border-none cursor-pointer text-start"
            >
              <input
                type="checkbox"
                readOnly
                checked={selectedCenters.includes(center.name)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <span className="text-text-primary">{center.displayName || center.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
