import { useState, useCallback, useMemo } from 'react';
import type {
  ColumnConfig,
  TableColumnState,
  UseTableColumnsOptions,
  UseTableColumnsReturn,
} from '../types/table';

const STORAGE_VERSION = 1;

function getStorageKey(tableId: string): string {
  return `table-columns-${tableId}`;
}

function getDefaultVisibleColumns<TKey extends string>(
  columns: ColumnConfig<TKey>[]
): TKey[] {
  return columns
    .filter((col) => col.defaultVisible !== false)
    .map((col) => col.key);
}

function loadFromStorage<TKey extends string>(
  tableId: string,
  columns: ColumnConfig<TKey>[]
): TKey[] | null {
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (!stored) return null;

    const parsed: TableColumnState<TKey> = JSON.parse(stored);
    if (parsed.version !== STORAGE_VERSION) return null;

    const validKeys = new Set(columns.map((c) => c.key));
    const validColumns = parsed.visibleColumns.filter((key) =>
      validKeys.has(key)
    );

    if (validColumns.length === 0) return null;

    return validColumns;
  } catch {
    return null;
  }
}

function saveToStorage<TKey extends string>(
  tableId: string,
  visibleColumns: TKey[]
): void {
  const state: TableColumnState<TKey> = {
    visibleColumns,
    version: STORAGE_VERSION,
  };
  localStorage.setItem(getStorageKey(tableId), JSON.stringify(state));
}

export function useTableColumns<TKey extends string>(
  options: UseTableColumnsOptions<TKey>
): UseTableColumnsReturn<TKey> {
  const { tableId, columns } = options;

  const defaultVisible = useMemo(
    () => getDefaultVisibleColumns(columns),
    [columns]
  );

  const [visibleColumns, setVisibleColumns] = useState<TKey[]>(() => {
    const stored = loadFromStorage(tableId, columns);
    return stored ?? defaultVisible;
  });

  const orderedVisibleColumns = useMemo(() => {
    const columnMap = new Map(columns.map((c) => [c.key, c]));
    return visibleColumns
      .map((key) => columnMap.get(key))
      .filter((col): col is ColumnConfig<TKey> => col !== undefined);
  }, [columns, visibleColumns]);

  const isColumnVisible = useCallback(
    (key: TKey): boolean => visibleColumns.includes(key),
    [visibleColumns]
  );

  const toggleColumn = useCallback(
    (key: TKey): void => {
      const column = columns.find((c) => c.key === key);
      if (!column || column.canHide === false) return;

      setVisibleColumns((prev) => {
        const newVisible = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];

        saveToStorage(tableId, newVisible);
        return newVisible;
      });
    },
    [columns, tableId]
  );

  const reorderColumns = useCallback(
    (newOrder: TKey[]): void => {
      setVisibleColumns(newOrder);
      saveToStorage(tableId, newOrder);
    },
    [tableId]
  );

  const resetToDefaults = useCallback((): void => {
    setVisibleColumns(defaultVisible);
    localStorage.removeItem(getStorageKey(tableId));
  }, [defaultVisible, tableId]);

  return {
    orderedVisibleColumns,
    allColumns: columns,
    isColumnVisible,
    toggleColumn,
    reorderColumns,
    resetToDefaults,
  };
}
