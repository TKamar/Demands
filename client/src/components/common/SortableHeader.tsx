import { MdArrowUpward, MdArrowDownward, MdUnfoldMore } from 'react-icons/md';
import type { SortDirection } from '../../types/filter';

interface SortableHeaderProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string;
  currentSortDir?: SortDirection;
  onSort?: (key: string) => void;
  className?: string;
  align?: 'start' | 'end' | 'center';
}

export default function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className = '',
  align = 'start',
}: SortableHeaderProps) {
  const isActive = sortKey && currentSortKey === sortKey;
  const alignClass = align === 'end' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide ${alignClass} ${className} ${sortKey ? 'cursor-pointer select-none hover:bg-primary/5' : ''}`}
      onClick={sortKey && onSort ? () => onSort(sortKey) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey && (
          isActive ? (
            currentSortDir === 'asc'
              ? <MdArrowUpward size={13} className="text-primary" />
              : <MdArrowDownward size={13} className="text-primary" />
          ) : (
            <MdUnfoldMore size={13} className="text-secondary opacity-50" />
          )
        )}
      </span>
    </th>
  );
}
