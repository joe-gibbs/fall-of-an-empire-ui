import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type ReactNode,
  type UIEvent,
} from 'react';
import { playSound } from '../../../../hooks/useSound';
import { StyledScrollbar } from '../scrolling/StyledScrollArea';
import SortableHeader from './SortableHeader';
import {
  compareSortValues,
  normaliseSortText,
  toggleSortState,
  type SortDirection,
  type SortState,
  type SortValue,
} from './sortUtils';
import './DataTable.css';
import { webUIText } from '../../../../localization/WebUITextContext';

const DEFAULT_ROOT_FONT_SIZE = 13.2;
const DEFAULT_VIRTUALIZE_THRESHOLD = 24;

type TableAlign = 'left' | 'right' | 'centre';
type RowClassName<T> = string | ((row: T, index: number) => string);
type CellClassName<T, TKey extends string> =
  | string
  | ((row: T, column: DataTableColumn<T, TKey>, index: number) => string);
type HeaderCellClassName<T, TKey extends string> =
  | string
  | ((column: DataTableColumn<T, TKey>) => string);

export interface DataTableColumn<T, TKey extends string = string> {
  id: TKey;
  label: ReactNode;
  render: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: TableAlign;
  className?: string;
  headerClassName?: string;
  cellClassName?: string | ((row: T, index: number) => string);
  sortValue?: (row: T) => SortValue;
  searchValue?: (row: T) => SortValue;
}

interface DataTableProps<T, TKey extends string = string> {
  rows: T[];
  columns: Array<DataTableColumn<T, TKey>>;
  rowKey?: (row: T, index: number) => Key;
  emptyLabel?: ReactNode;
  onRowClick?: (row: T, index: number) => void;

  className?: string;
  toolsClassName?: string;
  searchWrapClassName?: string;
  searchLabelClassName?: string;
  searchClassName?: string;
  countClassName?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  headerGroupClassName?: string;
  headerRowClassName?: string;
  bodyClassName?: string;
  bodyScrollFrameClassName?: string;
  rowClassName?: RowClassName<T>;
  headerCellClassName?: HeaderCellClassName<T, TKey>;
  bodyCellClassName?: CellClassName<T, TKey>;
  headerContentClassName?: string;
  activeHeaderClassName?: string;
  emptyClassName?: string;
  emptyCellClassName?: string;
  rowStyle?: CSSProperties | ((row: T, index: number) => CSSProperties | undefined);
  bodyStyle?: CSSProperties;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  searchPredicate?: (row: T, query: string) => boolean;
  filterPredicate?: (row: T) => boolean;
  toolsExtra?: ReactNode;
  showCount?: boolean;
  formatCount?: (value: number) => string;

  sortState?: SortState<TKey>;
  onSortChange?: (sort: SortState<TKey>) => void;
  defaultSortKey?: TKey;
  defaultSortDirection?: SortDirection;
  sortInitialDirection?: SortDirection;

  virtualized?: boolean;
  virtualizeThreshold?: number;
  virtualRowHeight?: number;
  virtualRowHeightRem?: number;
  virtualOverscan?: number;
  fixedVirtualRows?: boolean;
  styledScrollbar?: boolean;
  hideHeader?: boolean;
  rowLimit?: number;
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

function currentRootFontSize(): number {
  if (typeof window === 'undefined') return DEFAULT_ROOT_FONT_SIZE;
  const parsed = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROOT_FONT_SIZE;
}

function boundedViewportHeight(element: HTMLDivElement): number {
  const measured = element.clientHeight;
  const viewport = typeof window === 'undefined' ? measured : window.innerHeight;
  if (!Number.isFinite(viewport) || viewport <= 0) return measured;
  return Math.min(measured, viewport);
}

function columnStyle(width?: string): CSSProperties | undefined {
  if (!width) return undefined;

  return {
    width,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  };
}

function alignClass(align?: TableAlign): string {
  if (align === 'right') return 'data-table-cell--right';
  if (align === 'centre') return 'data-table-cell--centre';
  return '';
}

function resolveRowClassName<T>(value: RowClassName<T> | undefined, row: T, index: number): string {
  if (!value) return '';
  return typeof value === 'function' ? value(row, index) : value;
}

function resolveCellClassName<T, TKey extends string>(
  value: CellClassName<T, TKey> | undefined,
  row: T,
  column: DataTableColumn<T, TKey>,
  index: number,
): string {
  if (!value) return '';
  return typeof value === 'function' ? value(row, column, index) : value;
}

function resolveHeaderCellClassName<T, TKey extends string>(
  value: HeaderCellClassName<T, TKey> | undefined,
  column: DataTableColumn<T, TKey>,
): string {
  if (!value) return '';
  return typeof value === 'function' ? value(column) : value;
}

function searchableText<T, TKey extends string>(row: T, columns: Array<DataTableColumn<T, TKey>>): string {
  const columnText = columns
    .map(column => column.searchValue?.(row) ?? column.sortValue?.(row))
    .filter(value => value !== undefined && value !== null)
    .map(value => String(value))
    .join(' ');

  if (columnText) return normaliseSortText(columnText);

  try {
    return normaliseSortText(JSON.stringify(row));
  } catch {
    return '';
  }
}

function DataTable<T, TKey extends string = string>({
  rows,
  columns,
  rowKey,
  emptyLabel = webUIText("Auto.Fix.Default.componentscommonDataTable.164.1"),
  onRowClick,

  className = '',
  toolsClassName = '',
  searchWrapClassName = '',
  searchLabelClassName = '',
  searchClassName = '',
  countClassName = '',
  wrapperClassName = '',
  tableClassName = '',
  headerGroupClassName = '',
  headerRowClassName = '',
  bodyClassName = '',
  bodyScrollFrameClassName = '',
  rowClassName,
  headerCellClassName,
  bodyCellClassName,
  headerContentClassName = '',
  activeHeaderClassName = '',
  emptyClassName = '',
  emptyCellClassName = '',
  rowStyle,
  bodyStyle,

  searchValue,
  onSearchChange,
  searchPlaceholder = webUIText("Auto.Fix.Default.componentscommonDataTable.191.1"),
  searchLabel,
  searchPredicate,
  filterPredicate,
  toolsExtra,
  showCount = false,
  formatCount = (value: number) => String(value),

  sortState,
  onSortChange,
  defaultSortKey,
  defaultSortDirection = 'asc',
  sortInitialDirection = 'asc',

  virtualized = true,
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  virtualRowHeight,
  virtualRowHeightRem,
  virtualOverscan = 6,
  fixedVirtualRows = true,
  styledScrollbar = false,
  hideHeader = false,
  rowLimit,
}: DataTableProps<T, TKey>) {
  const firstColumnKey = columns[0]?.id ?? ('' as TKey);
  const [internalSort, setInternalSort] = useState<SortState<TKey>>({
    key: defaultSortKey ?? firstColumnKey,
    direction: defaultSortDirection,
  });
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [rootFontSize, setRootFontSize] = useState(currentRootFontSize);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollFrameRef = useRef<HTMLDivElement | null>(null);

  const activeSort = sortState ?? internalSort;
  const query = normaliseSortText(searchValue ?? '').trim();

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filterPredicate && !filterPredicate(row)) return false;
      if (!query) return true;
      return searchPredicate
        ? searchPredicate(row, query)
        : searchableText(row, columns).includes(query);
    });
  }, [columns, filterPredicate, query, rows, searchPredicate]);

  const sortedRows = useMemo(() => {
    const sortColumn = columns.find(column => column.id === activeSort.key);
    if (!sortColumn || sortColumn.sortable === false || !sortColumn.sortValue) return filteredRows;

    const sorted = [...filteredRows].sort((a, b) => compareSortValues(
      sortColumn.sortValue?.(a),
      sortColumn.sortValue?.(b),
    ));
    if (activeSort.direction === 'desc') sorted.reverse();
    return sorted;
  }, [activeSort.direction, activeSort.key, columns, filteredRows]);

  const displayedRows = rowLimit === undefined ? sortedRows : sortedRows.slice(0, Math.max(0, rowLimit));
  const useVirtualRows = virtualized && displayedRows.length > virtualizeThreshold;
  const resolvedVirtualRowHeight = virtualRowHeight ?? (virtualRowHeightRem !== undefined ? rootFontSize * virtualRowHeightRem : 32);
  const safeRowHeight = Math.max(1, resolvedVirtualRowHeight);
  const visibleCount = useVirtualRows
    ? Math.ceil((viewportHeight || safeRowHeight * 14) / safeRowHeight) + virtualOverscan * 2
    : displayedRows.length;
  const startIndex = useVirtualRows
    ? Math.max(0, Math.floor(scrollTop / safeRowHeight) - virtualOverscan)
    : 0;
  const endIndex = useVirtualRows
    ? Math.min(displayedRows.length, startIndex + visibleCount)
    : displayedRows.length;
  const topSpacer = useVirtualRows ? startIndex * safeRowHeight : 0;
  const bottomSpacer = useVirtualRows ? Math.max(0, displayedRows.length - endIndex) * safeRowHeight : 0;
  const visibleRows = useVirtualRows ? displayedRows.slice(startIndex, endIndex) : displayedRows;
  const bodyContentSignal = `${displayedRows.length}:${useVirtualRows ? 1 : 0}:${safeRowHeight}`;

  const changeSort = useCallback((key: TKey) => {
    const next = toggleSortState(activeSort, key, sortInitialDirection);
    if (!sortState) setInternalSort(next);
    onSortChange?.(next);
  }, [activeSort, onSortChange, sortInitialDirection, sortState]);

  const handleBodyScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
    setViewportHeight(boundedViewportHeight(target));
  }, []);

  useEffect(() => {
    if (!useVirtualRows) return;
    const body = bodyRef.current;
    if (!body) return;

    const updateViewport = () => setViewportHeight(boundedViewportHeight(body));
    const id = window.setTimeout(updateViewport, 0);
    window.addEventListener('resize', updateViewport);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', updateViewport);
    };
  }, [displayedRows.length, useVirtualRows]);

  useEffect(() => {
    if (virtualRowHeightRem === undefined) return;

    const updateRootFontSize = () => setRootFontSize(currentRootFontSize());
    updateRootFontSize();
    window.addEventListener('resize', updateRootFontSize);
    window.addEventListener('foae:runtime-viewport', updateRootFontSize);
    return () => {
      window.removeEventListener('resize', updateRootFontSize);
      window.removeEventListener('foae:runtime-viewport', updateRootFontSize);
    };
  }, [virtualRowHeightRem]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !useVirtualRows) return;
    body.scrollTop = 0;
    setScrollTop(0);
    setViewportHeight(boundedViewportHeight(body));
  }, [activeSort.direction, activeSort.key, query, useVirtualRows]);

  const body = (
    <div
      ref={bodyRef}
      className={classNames(
        styledScrollbar ? 'styled-scroll-area__viewport' : '',
        'data-table-rowgroup',
        'data-table-body',
        useVirtualRows ? 'data-table-body--virtualized' : '',
        bodyClassName,
      )}
      role="rowgroup"
      style={bodyStyle}
      onScroll={useVirtualRows ? handleBodyScroll : undefined}
    >
      {displayedRows.length === 0 ? (
        <div className={classNames('data-table-empty', emptyClassName)} role="row">
          <div className={classNames('data-table-empty-cell', emptyCellClassName)} role="cell">{emptyLabel}</div>
        </div>
      ) : (
        <>
          {topSpacer > 0 && <div className="data-table-spacer" style={{ height: topSpacer }} />}
          {visibleRows.map((row, index) => {
            const absoluteIndex = startIndex + index;
            const resolvedRowStyle = typeof rowStyle === 'function' ? rowStyle(row, absoluteIndex) : rowStyle;
            const virtualStyle: CSSProperties | undefined = useVirtualRows
              ? fixedVirtualRows
                ? { height: safeRowHeight, minHeight: safeRowHeight, overflow: 'hidden' }
                : { minHeight: safeRowHeight }
              : undefined;
            return (
              <div
                key={rowKey ? rowKey(row, absoluteIndex) : absoluteIndex}
                role="row"
                className={classNames(
                  'data-table-row',
                  absoluteIndex % 2 === 0 ? 'data-table-row--even' : 'data-table-row--odd',
                  onRowClick ? 'data-table-row--clickable' : '',
                  resolveRowClassName(rowClassName, row, absoluteIndex),
                )}
                style={{ ...virtualStyle, ...resolvedRowStyle }}
                onMouseDown={onRowClick ? (event) => {
                  if (event.button !== 0) return;
                  playSound('click');
                  onRowClick(row, absoluteIndex);
                } : undefined}
              >
                {columns.map(column => (
                  <div
                    key={column.id}
                    role="cell"
                    className={classNames(
                      'data-table-cell',
                      alignClass(column.align),
                      resolveCellClassName(bodyCellClassName, row, column, absoluteIndex),
                      column.className,
                      typeof column.cellClassName === 'function'
                        ? column.cellClassName(row, absoluteIndex)
                        : column.cellClassName,
                    )}
                    style={columnStyle(column.width)}
                  >
                    {column.render(row, absoluteIndex)}
                  </div>
                ))}
              </div>
            );
          })}
          {bottomSpacer > 0 && <div className="data-table-spacer" style={{ height: bottomSpacer }} />}
        </>
      )}
    </div>
  );

  return (
    <div className={classNames('data-table-block', className)}>
      {(onSearchChange || toolsExtra || showCount) && (
        <div className={classNames('data-table-tools', toolsClassName)}>
          {onSearchChange && (
            <label className={classNames('data-table-search-wrap', searchWrapClassName)}>
              {searchLabel && <span className={classNames('data-table-search-label', searchLabelClassName)}>{searchLabel}</span>}
              <input
                type="text"
                className={classNames('search-input', 'data-table-search', searchClassName)}
                value={searchValue ?? ''}
                onChange={event => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          )}
          {toolsExtra && (
            <div className="data-table-tools-extra">
              {toolsExtra}
            </div>
          )}
          {showCount && (
            <span className={classNames('data-table-count', countClassName)}>
              {`${formatCount(sortedRows.length)} / ${formatCount(rows.length)}`}
            </span>
          )}
        </div>
      )}
      <div className={classNames('data-table-wrapper', wrapperClassName)}>
        <div className={classNames('data-table', tableClassName)} role="table">
          {!hideHeader && (
            <div className={classNames('data-table-rowgroup', 'data-table-header-group', headerGroupClassName)} role="rowgroup">
              <div className={classNames('data-table-header-row', headerRowClassName)} role="row">
                {columns.map(column => {
                  const sortable = column.sortable ?? !!column.sortValue;
                  const cellClass = classNames(
                    'data-table-header-cell',
                    sortable ? 'data-table-header-cell--sortable' : 'data-table-header-cell--static',
                    alignClass(column.align),
                    resolveHeaderCellClassName(headerCellClassName, column),
                    column.headerClassName,
                  );
                  const style = columnStyle(column.width);
                  if (sortable) {
                    return (
                      <SortableHeader
                        key={column.id}
                        id={column.id}
                        label={column.label}
                        sort={activeSort}
                        onSort={changeSort}
                        activeClassName={activeHeaderClassName}
                        className={cellClass}
                        contentClassName={classNames('data-table-header-content', headerContentClassName)}
                        style={style}
                      />
                    );
                  }

                  return (
                    <div
                      key={column.id}
                      role="columnheader"
                      className={cellClass}
                      style={{ ...style, cursor: 'auto' }}
                    >
                      <span className={classNames('data-table-header-content', headerContentClassName)}>
                        {column.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {styledScrollbar ? (
            <div
              ref={bodyScrollFrameRef}
              className={classNames('data-table-body-scroll-frame', 'styled-scroll-area', 'styled-scroll-area--fill', bodyScrollFrameClassName)}
            >
              {body}
              <StyledScrollbar frameRef={bodyScrollFrameRef} viewportRef={bodyRef} contentSignal={bodyContentSignal} />
            </div>
          ) : body}
        </div>
      </div>
    </div>
  );
}

export default React.memo(DataTable) as typeof DataTable;
