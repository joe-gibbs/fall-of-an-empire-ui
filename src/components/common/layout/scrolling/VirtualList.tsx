import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AriaRole,
  type CSSProperties,
  type Key,
  type ReactNode,
  type UIEvent,
} from 'react';
import { StyledScrollbar } from './StyledScrollArea';
import './VirtualList.css';

const DEFAULT_ROOT_FONT_SIZE = 13.2;
const DEFAULT_ROW_HEIGHT_REM = 3.5;
const DEFAULT_VIRTUALISE_THRESHOLD = 24;
const DEFAULT_OVERSCAN = 8;

function currentRootFontSize(): number {
  const parsed = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROOT_FONT_SIZE;
}

function boundedViewportHeight(element: HTMLDivElement): number {
  const measured = element.clientHeight;
  const viewport = window.innerHeight;
  if (!Number.isFinite(viewport) || viewport <= 0) return measured;
  return Math.min(measured, viewport);
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

interface VirtualListProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => Key;
  empty?: ReactNode;
  className?: string;
  viewportClassName?: string;
  itemClassName?: string;
  emptyClassName?: string;
  role?: AriaRole;
  rowHeight?: number;
  rowHeightRem?: number;
  virtualizeThreshold?: number;
  overscan?: number;
  resetSignal?: unknown;
}

export default function VirtualList<T>({
  items,
  renderItem,
  getKey,
  empty,
  className = '',
  viewportClassName = '',
  itemClassName = '',
  emptyClassName = '',
  role,
  rowHeight,
  rowHeightRem = DEFAULT_ROW_HEIGHT_REM,
  virtualizeThreshold = DEFAULT_VIRTUALISE_THRESHOLD,
  overscan = DEFAULT_OVERSCAN,
  resetSignal,
}: VirtualListProps<T>) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [rootFontSize, setRootFontSize] = useState(DEFAULT_ROOT_FONT_SIZE);
  const useVirtualRows = items.length > virtualizeThreshold;
  const safeRowHeight = Math.max(1, rowHeight ?? rootFontSize * rowHeightRem);
  const visibleCount = useVirtualRows
    ? Math.ceil((viewportHeight || safeRowHeight * 12) / safeRowHeight) + overscan * 2
    : items.length;
  const startIndex = useVirtualRows
    ? Math.max(0, Math.floor(scrollTop / safeRowHeight) - overscan)
    : 0;
  const endIndex = useVirtualRows
    ? Math.min(items.length, startIndex + visibleCount)
    : items.length;
  const topSpacer = useVirtualRows ? startIndex * safeRowHeight : 0;
  const bottomSpacer = useVirtualRows ? Math.max(0, items.length - endIndex) * safeRowHeight : 0;
  const visibleItems = useVirtualRows ? items.slice(startIndex, endIndex) : items;
  const contentSignal = `${items.length}:${useVirtualRows ? 1 : 0}:${safeRowHeight}`;

  const updateViewport = useCallback(() => {
    setRootFontSize(currentRootFontSize());
    const viewport = viewportRef.current;
    if (viewport) setViewportHeight(boundedViewportHeight(viewport));
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    setViewportHeight(boundedViewportHeight(event.currentTarget));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(updateViewport, 0);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('webkiln:runtime-viewport', updateViewport);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('webkiln:runtime-viewport', updateViewport);
    };
  }, [items.length, updateViewport, useVirtualRows]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTop = 0;
      setScrollTop(0);
      setViewportHeight(boundedViewportHeight(viewport));
    }, 0);
    return () => window.clearTimeout(id);
  }, [resetSignal, useVirtualRows]);

  const virtualItemStyle: CSSProperties | undefined = useVirtualRows
    ? { height: safeRowHeight, minHeight: safeRowHeight, overflow: 'hidden' }
    : undefined;

  return (
    <div ref={frameRef} className={classNames('virtual-list', 'styled-scroll-area', 'styled-scroll-area--fill', className)}>
      <div
        ref={viewportRef}
        className={classNames(
          'styled-scroll-area__viewport',
          'virtual-list__viewport',
          useVirtualRows ? 'virtual-list__viewport--virtualized' : '',
          viewportClassName,
        )}
        role={role}
        onScroll={handleScroll}
      >
        {items.length === 0 ? (
          <div className={classNames('virtual-list__empty', emptyClassName)}>{empty}</div>
        ) : (
          <>
            {topSpacer > 0 && <div className="virtual-list__spacer" style={{ height: topSpacer }} />}
            {visibleItems.map((item, index) => {
              const absoluteIndex = startIndex + index;
              return (
                <div
                  key={getKey(item, absoluteIndex)}
                  className={classNames('virtual-list__item', itemClassName)}
                  style={virtualItemStyle}
                >
                  {renderItem(item, absoluteIndex)}
                </div>
              );
            })}
            {bottomSpacer > 0 && <div className="virtual-list__spacer" style={{ height: bottomSpacer }} />}
          </>
        )}
      </div>
      <StyledScrollbar frameRef={frameRef} viewportRef={viewportRef} contentSignal={contentSignal} />
    </div>
  );
}
