import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdViewColumn, MdDragIndicator, MdRefresh } from 'react-icons/md';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnConfig } from '../../types/table';

interface SortableColumnItemProps {
  column: ColumnConfig;
  isVisible: boolean;
  onToggle: () => void;
  translatedLabel: string;
}

function SortableColumnItem({
  column,
  isVisible,
  onToggle,
  translatedLabel,
}: SortableColumnItemProps) {
  const canHide = column.canHide !== false;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
        isDragging ? 'bg-primary-light shadow-md z-10' : 'hover:bg-bg-default'
      }`}
    >
      <button
        type="button"
        className="p-0.5 text-text-secondary cursor-grab active:cursor-grabbing bg-transparent border-none"
        {...attributes}
        {...listeners}
      >
        <MdDragIndicator size={18} />
      </button>
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={onToggle}
          disabled={!canHide}
          className="w-4 h-4 rounded border-divider text-primary focus:ring-primary disabled:opacity-50"
        />
        <span
          className={`text-sm ${!canHide ? 'text-text-secondary' : 'text-text-primary'}`}
        >
          {translatedLabel}
        </span>
      </label>
    </div>
  );
}

interface ColumnSettingsDropdownProps<TKey extends string> {
  columns: ColumnConfig<TKey>[];
  visibleColumns: TKey[];
  onToggleColumn: (key: TKey) => void;
  onReorder: (newOrder: TKey[]) => void;
  onReset: () => void;
}

export default function ColumnSettingsDropdown<TKey extends string>({
  columns,
  visibleColumns,
  onToggleColumn,
  onReorder,
  onReset,
}: ColumnSettingsDropdownProps<TKey>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const orderedColumns = columns.slice().sort((a, b) => {
    const aIndex = visibleColumns.indexOf(a.key as TKey);
    const bIndex = visibleColumns.indexOf(b.key as TKey);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedColumns.findIndex((c) => c.key === active.id);
    const newIndex = orderedColumns.findIndex((c) => c.key === over.id);

    const newOrderedColumns = arrayMove(orderedColumns, oldIndex, newIndex);
    const newVisibleOrder = newOrderedColumns
      .filter((c) => visibleColumns.includes(c.key as TKey))
      .map((c) => c.key as TKey);

    onReorder(newVisibleOrder);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-divider rounded-xl transition-colors cursor-pointer ${
          open
            ? 'bg-primary-light text-primary border-primary'
            : 'bg-bg-paper text-text-primary hover:border-gray-400'
        }`}
      >
        <MdViewColumn size={18} />
        {t('table.columns')}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 end-0 w-64 bg-bg-paper border border-divider rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 max-h-80 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedColumns.map((c) => c.key)}
                strategy={verticalListSortingStrategy}
              >
                {orderedColumns.map((column) => (
                  <SortableColumnItem
                    key={column.key}
                    column={column}
                    isVisible={visibleColumns.includes(column.key as TKey)}
                    onToggle={() => onToggleColumn(column.key as TKey)}
                    translatedLabel={t(column.label)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="border-t border-divider p-2">
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-bg-default rounded-lg transition-colors bg-transparent border-none cursor-pointer"
            >
              <MdRefresh size={16} />
              {t('table.resetColumns')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
