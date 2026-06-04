export interface ColumnConfig<TKey extends string = string> {
  key: TKey;
  label: string;
  defaultVisible?: boolean;
  canHide?: boolean;
}

export interface TableColumnState<TKey extends string = string> {
  visibleColumns: TKey[];
  version: number;
}

export interface UseTableColumnsOptions<TKey extends string = string> {
  tableId: string;
  columns: ColumnConfig<TKey>[];
}

export interface UseTableColumnsReturn<TKey extends string = string> {
  orderedVisibleColumns: ColumnConfig<TKey>[];
  allColumns: ColumnConfig<TKey>[];
  isColumnVisible: (key: TKey) => boolean;
  toggleColumn: (key: TKey) => void;
  reorderColumns: (newOrder: TKey[]) => void;
  resetToDefaults: () => void;
}
