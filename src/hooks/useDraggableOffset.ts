import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { toRootRem } from '../utils/cssUnits';

export interface DraggableOffset {
  x: number;
  y: number;
}

export interface UseDraggableOffsetOptions {
  /** When true, drag start is ignored. */
  disabled?: boolean;
  /**
   * Class name fragments that block free-surface drag when present on the event
   * target or an ancestor inside the root. Used by surface drag mode only.
   */
  blockClassNames?: readonly string[];
}

export interface UseDraggableOffsetResult {
  offset: DraggableOffset;
  offsetStyle: CSSProperties;
  rootRef: RefObject<HTMLDivElement | null>;
  /** Start a drag from an explicit handle (no interactive-target checks). */
  onHandleMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
  /**
   * Start a drag from free surface area. Skips interactive controls and any
   * ancestor matching `blockClassNames` within the root.
   */
  onSurfaceMouseDown: (event: ReactMouseEvent<HTMLElement>) => void;
}

const DEFAULT_BLOCK_CLASS_NAMES = [
  'styled-scroll-area',
  'tooltip-wrapper',
  'dropdown-select',
  'search-field',
  'search-input',
  'data-table',
] as const;

function tagBlocksDrag(tagName: string): boolean {
  return (
    tagName === 'button'
    || tagName === 'input'
    || tagName === 'select'
    || tagName === 'textarea'
    || tagName === 'a'
    || tagName === 'label'
    || tagName === 'option'
  );
}

function classNameBlocksDrag(className: string, blockClassNames: readonly string[]): boolean {
  for (const fragment of blockClassNames) {
    if (className.indexOf(fragment) >= 0) return true;
  }
  return false;
}

export function isDragBlockedTarget(
  target: EventTarget | null,
  root: HTMLElement | null,
  blockClassNames: readonly string[] = DEFAULT_BLOCK_CLASS_NAMES,
): boolean {
  if (!target || !root) return true;

  let element = target as HTMLElement | null;
  while (element && element !== root) {
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (tagBlocksDrag(tagName)) return true;

    if (element.isContentEditable) return true;

    const className = typeof element.className === 'string' ? element.className : '';
    if (classNameBlocksDrag(className, blockClassNames)) return true;

    element = element.parentElement;
  }

  return false;
}

/**
 * Shared pointer-drag offset for floating panels (event popup, candidate modals,
 * unit catalogue, and similar dialogs). Transform is applied by the caller so
 * entrance/exit animations on the panel can stay on a nested element.
 */
export function useDraggableOffset(options: UseDraggableOffsetOptions = {}): UseDraggableOffsetResult {
  const { disabled = false, blockClassNames = DEFAULT_BLOCK_CLASS_NAMES } = options;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState<DraggableOffset>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const offsetRef = useRef(offset);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const beginDrag = useCallback((clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y,
    };
  }, []);

  const onHandleMouseDown = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0 || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    beginDrag(event.clientX, event.clientY);
  }, [beginDrag, disabled]);

  const onSurfaceMouseDown = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0 || disabled) return;
    if (isDragBlockedTarget(event.target, rootRef.current, blockClassNames)) return;
    event.preventDefault();
    beginDrag(event.clientX, event.clientY);
  }, [beginDrag, blockClassNames, disabled]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setOffset({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      });
    };

    const endDrag = () => {
      dragRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', endDrag);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', endDrag);
    };
  }, []);

  const offsetStyle: CSSProperties = {
    transform: `translate(${toRootRem(offset.x)}, ${toRootRem(offset.y)})`,
  };

  return {
    offset,
    offsetStyle,
    rootRef,
    onHandleMouseDown,
    onSurfaceMouseDown,
  };
}
