import React, { useMemo } from 'react';
import DataTable, { type DataTableColumn } from './DataTable';
import type { SortValue } from './sortUtils';
import './SortableTable.css';
import { webUIText } from '../../../../localization/WebUITextContext';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  sortValueKey?: string;
}

interface SortableTableProps<T extends Record<string, unknown>> {
  columns: Column[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => React.Key;
  emptyLabel?: React.ReactNode;
  virtualized?: boolean;
  virtualizeThreshold?: number;
  virtualRowHeight?: number;
  virtualOverscan?: number;
}

function toSortValue(value: unknown): SortValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return value;
  }

  return String(value);
}

function SortableTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  rowKey,
  emptyLabel = webUIText("Auto.Fix.Default.componentscommonSortableTable.39.1"),
  virtualized = false,
  virtualizeThreshold = 0,
  virtualRowHeight = 32,
  virtualOverscan = 6,
}: SortableTableProps<T>) {
  const tableColumns = useMemo<Array<DataTableColumn<T>>>(() => columns.map(column => ({
    id: column.key,
    label: column.label,
    sortable: column.sortable,
    width: column.width,
    render: row => row[column.key] as React.ReactNode,
    sortValue: row => toSortValue(row[column.sortValueKey ?? column.key]),
  })), [columns]);

  return (
    <DataTable
      rows={data}
      columns={tableColumns}
      rowKey={rowKey}
      emptyLabel={emptyLabel}
      onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
      wrapperClassName="sortable-table-wrapper"
      tableClassName="sortable-table"
      headerGroupClassName="sortable-table-rowgroup"
      headerRowClassName="sortable-table-header-row"
      bodyClassName="sortable-table-rowgroup sortable-table-body"
      headerCellClassName="sortable-table-header-cell"
      bodyCellClassName="sortable-table-body-cell"
      headerContentClassName="sortable-table-th-content"
      rowClassName={(_row, index) => `sortable-table-body-row sortable-table-body-row--${index % 2 === 0 ? 'even' : 'odd'}`}
      virtualized={virtualized}
      virtualizeThreshold={virtualizeThreshold}
      virtualRowHeight={virtualRowHeight}
      virtualOverscan={virtualOverscan}
    />
  );
}

export default React.memo(SortableTable) as typeof SortableTable;
