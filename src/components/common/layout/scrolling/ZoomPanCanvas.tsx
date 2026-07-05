import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type Ref,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import './ZoomPanCanvas.css';

export interface ZoomPanPoint {
  x: number;
  y: number;
}

export interface ZoomPanView {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ZoomPanMetrics {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export type ZoomPanInitialView = ZoomPanView | ((metrics: ZoomPanMetrics) => ZoomPanView);

interface DragState {
  mode: 'pan' | 'right-drag' | 'left-select' | null;
  button: number;
  startTarget: HTMLElement | null;
  startX: number;
  startY: number;
  basePanX: number;
  basePanY: number;
  moved: boolean;
  path: ZoomPanPoint[];
  lastSampleX: number;
  lastSampleY: number;
}

export interface ZoomPanCanvasApi {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  zoomFromCenter: (factor: number) => void;
}

interface ZoomPanCanvasProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  initialView?: ZoomPanInitialView;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  panMode?: 'bounded' | 'free';
  panMarginPx?: number;
  rightDragThresholdPx?: number;
  rightDragSamplePx?: number;
  onContentLeftClick?: (point: ZoomPanPoint, target: HTMLElement | null) => void;
  onContentLeftDragUpdate?: (start: ZoomPanPoint, current: ZoomPanPoint) => void;
  onContentLeftDragEnd?: (start: ZoomPanPoint, end: ZoomPanPoint) => void;
  onContentRightClick?: (point: ZoomPanPoint) => void;
  onContentRightDragUpdate?: (points: ZoomPanPoint[]) => void;
  onContentRightDrag?: (points: ZoomPanPoint[]) => void;
  onContentMouseLeave?: () => void;
  onPanDragStart?: () => void;
  onViewChange?: (view: ZoomPanView) => void;
  controls?: ComponentType<ZoomPanCanvasApi>;
  leftDragMode?: 'pan' | 'select';
  ignoreLeftDragFrom?: (target: HTMLElement) => boolean;
  resetViewOnResize?: boolean;
  deferWheelViewState?: boolean;
  viewportRef?: Ref<HTMLDivElement>;
}

const DEFAULT_MIN_ZOOM = 1;
const DEFAULT_MAX_ZOOM = 2.5;
const DEFAULT_ZOOM_STEP = 1.15;
const DEFAULT_RIGHT_DRAG_THRESHOLD_PX = 15;
const DEFAULT_RIGHT_DRAG_SAMPLE_PX = 30;
const WHEEL_DELTA_UNIT = 120;
const MAX_WHEEL_STEPS_PER_EVENT = 3;
const SMOOTH_WHEEL_LERP = 0.28;
const SMOOTH_WHEEL_EPSILON = 0.02;
const INITIAL_VIEW: ZoomPanView = { zoom: 1, panX: 0, panY: 0 };
const WHEEL_ZOOMING_CLASS = 'zoom-pan-canvas--wheel-zooming';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function defaultIgnoreLeftDragFrom(target: HTMLElement): boolean {
  return !!target.closest('button, input, select, textarea');
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  ref.current = value;
}

function buildContentStyle(view: ZoomPanView, customStyle?: CSSProperties): CSSProperties {
  return {
    ...(customStyle ?? {}),
    transformOrigin: '0 0',
    transform: viewTransform(view),
  };
}

function viewTransform(view: ZoomPanView): string {
  return `translate(${view.panX.toFixed(2)}px, ${view.panY.toFixed(2)}px) scale(${view.zoom.toFixed(3)})`;
}

function clientToContentPercent(
  content: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  clampToBounds = false,
): ZoomPanPoint | null {
  if (!content) return null;

  const rect = content.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const x = (clientX - rect.left) / rect.width * 100;
  const y = (clientY - rect.top) / rect.height * 100;
  if (!clampToBounds && (x < 0 || x > 100 || y < 0 || y > 100)) return null;

  return {
    x: clampToBounds ? clamp(x, 0, 100) : x,
    y: clampToBounds ? clamp(y, 0, 100) : y,
  };
}

function contentLayoutOffset(viewport: HTMLDivElement, content: HTMLDivElement): ZoomPanPoint {
  const viewportRect = viewport.getBoundingClientRect();

  return {
    x: viewportRect.left + content.offsetLeft,
    y: viewportRect.top + content.offsetTop,
  };
}

export default function ZoomPanCanvas({
  children,
  className = '',
  style,
  contentClassName = '',
  contentStyle,
  initialView,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomStep = DEFAULT_ZOOM_STEP,
  panMode = 'bounded',
  panMarginPx = 0,
  rightDragThresholdPx = DEFAULT_RIGHT_DRAG_THRESHOLD_PX,
  rightDragSamplePx = DEFAULT_RIGHT_DRAG_SAMPLE_PX,
  onContentLeftClick,
  onContentLeftDragUpdate,
  onContentLeftDragEnd,
  onContentRightClick,
  onContentRightDragUpdate,
  onContentRightDrag,
  onContentMouseLeave,
  onPanDragStart,
  onViewChange,
  controls,
  leftDragMode = 'pan',
  ignoreLeftDragFrom = defaultIgnoreLeftDragFrom,
  resetViewOnResize = false,
  deferWheelViewState = false,
  viewportRef,
}: ZoomPanCanvasProps) {
  const [view, setView] = useState<ZoomPanView>(INITIAL_VIEW);
  const [isPanning, setIsPanning] = useState(false);
  const [isRightDragging, setIsRightDragging] = useState(false);
  const [isLeftSelecting, setIsLeftSelecting] = useState(false);

  const internalViewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ZoomPanView>(view);
  const layoutMetricsRef = useRef<ZoomPanMetrics | null>(null);
  const resizeFrameRef = useRef(0);
  const smoothWheelRef = useRef<{ target: ZoomPanView; frameId: number }>({
    target: INITIAL_VIEW,
    frameId: 0,
  });
  const dragRef = useRef<DragState>({
    mode: null,
    button: -1,
    startTarget: null,
    startX: 0,
    startY: 0,
    basePanX: 0,
    basePanY: 0,
    moved: false,
    path: [],
    lastSampleX: 0,
    lastSampleY: 0,
  });

  useEffect(() => {
    viewRef.current = view;
    if (deferWheelViewState) {
      const content = contentRef.current;
      if (content) {
        content.style.transformOrigin = '0 0';
        content.style.transform = viewTransform(view);
      }
    }
    onViewChange?.(view);
  }, [deferWheelViewState, onViewChange, view]);

  const bindViewportRef = useCallback((node: HTMLDivElement | null) => {
    internalViewportRef.current = node;
    assignRef(viewportRef, node);
  }, [viewportRef]);

  const setWheelZooming = useCallback((active: boolean) => {
    const viewport = internalViewportRef.current;
    if (!viewport) return;
    if (active) {
      viewport.classList.add(WHEEL_ZOOMING_CLASS);
      return;
    }
    viewport.classList.remove(WHEEL_ZOOMING_CLASS);
  }, []);

  const cancelSmoothWheel = useCallback((syncDeferredState = true) => {
    const frameId = smoothWheelRef.current.frameId;
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
      smoothWheelRef.current.frameId = 0;
    }
    setWheelZooming(false);
    smoothWheelRef.current.target = viewRef.current;
    if (syncDeferredState && deferWheelViewState) setView(viewRef.current);
  }, [deferWheelViewState, setWheelZooming]);

  useEffect(() => () => cancelSmoothWheel(false), [cancelSmoothWheel]);

  const clampPan = useCallback((panX: number, panY: number, zoom: number): { panX: number; panY: number } => {
    if (panMode === 'free') return { panX, panY };

    const viewport = internalViewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return { panX, panY };

    const scaledWidth = content.offsetWidth * zoom;
    const scaledHeight = content.offsetHeight * zoom;
    const leftEdgePanX = -content.offsetLeft;
    const rightEdgePanX = viewport.clientWidth - content.offsetLeft - scaledWidth;
    const topEdgePanY = -content.offsetTop;
    const bottomEdgePanY = viewport.clientHeight - content.offsetTop - scaledHeight;
    const minX = Math.min(leftEdgePanX, rightEdgePanX) - panMarginPx;
    const maxX = Math.max(leftEdgePanX, rightEdgePanX) + panMarginPx;
    const minY = Math.min(topEdgePanY, bottomEdgePanY) - panMarginPx;
    const maxY = Math.max(topEdgePanY, bottomEdgePanY) + panMarginPx;

    return {
      panX: clamp(panX, minX, maxX),
      panY: clamp(panY, minY, maxY),
    };
  }, [panMarginPx, panMode]);

  const clampView = useCallback((zoom: number, panX: number, panY: number): ZoomPanView => {
    const clampedZoom = clamp(zoom, minZoom, maxZoom);
    const clamped = clampPan(panX, panY, clampedZoom);
    return { zoom: clampedZoom, panX: clamped.panX, panY: clamped.panY };
  }, [clampPan, maxZoom, minZoom]);

  const commitView = useCallback((nextView: ZoomPanView, syncState = true) => {
    viewRef.current = nextView;
    if (!syncState) {
      const content = contentRef.current;
      if (content) {
        content.style.transformOrigin = '0 0';
        content.style.transform = viewTransform(nextView);
      }
      return;
    }
    setView(nextView);
  }, []);

  const setClampedView = useCallback((zoom: number, panX: number, panY: number) => {
    commitView(clampView(zoom, panX, panY));
  }, [clampView, commitView]);

  const resolveInitialView = useCallback((): ZoomPanView => {
    const viewport = internalViewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) {
      return typeof initialView === 'function'
        ? INITIAL_VIEW
        : initialView ?? { zoom: minZoom, panX: 0, panY: 0 };
    }

    if (typeof initialView === 'function') {
      return initialView({
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        contentWidth: content.offsetWidth,
        contentHeight: content.offsetHeight,
      });
    }

    return initialView ?? { zoom: minZoom, panX: 0, panY: 0 };
  }, [initialView, minZoom]);

  const computeZoomAt = useCallback((baseView: ZoomPanView, clientX: number, clientY: number, factor: number): ZoomPanView => {
    const viewport = internalViewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return baseView;

    const nextZoom = clamp(baseView.zoom * factor, minZoom, maxZoom);
    if (nextZoom === baseView.zoom) return baseView;

    const layoutOffset = contentLayoutOffset(viewport, content);
    const cursorX = clientX - layoutOffset.x;
    const cursorY = clientY - layoutOffset.y;
    const contentX = (cursorX - baseView.panX) / baseView.zoom;
    const contentY = (cursorY - baseView.panY) / baseView.zoom;

    return clampView(
      nextZoom,
      cursorX - contentX * nextZoom,
      cursorY - contentY * nextZoom,
    );
  }, [clampView, maxZoom, minZoom]);

  const startSmoothWheel = useCallback(() => {
    if (smoothWheelRef.current.frameId !== 0) return;

    const step = () => {
      const target = smoothWheelRef.current.target;
      const current = viewRef.current;
      const deltaZoom = target.zoom - current.zoom;
      const deltaX = target.panX - current.panX;
      const deltaY = target.panY - current.panY;

      if (
        Math.abs(deltaZoom) < 0.001 &&
        Math.abs(deltaX) < SMOOTH_WHEEL_EPSILON &&
        Math.abs(deltaY) < SMOOTH_WHEEL_EPSILON
      ) {
        smoothWheelRef.current.frameId = 0;
        setWheelZooming(false);
        commitView(target);
        return;
      }

      commitView({
        zoom: current.zoom + deltaZoom * SMOOTH_WHEEL_LERP,
        panX: current.panX + deltaX * SMOOTH_WHEEL_LERP,
        panY: current.panY + deltaY * SMOOTH_WHEEL_LERP,
      }, !deferWheelViewState);
      smoothWheelRef.current.frameId = requestAnimationFrame(step);
    };

    setWheelZooming(true);
    smoothWheelRef.current.frameId = requestAnimationFrame(step);
  }, [commitView, deferWheelViewState, setWheelZooming]);

  const resetView = useCallback(() => {
    cancelSmoothWheel();
    const nextView = resolveInitialView();
    setClampedView(nextView.zoom, nextView.panX, nextView.panY);
  }, [cancelSmoothWheel, resolveInitialView, setClampedView]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nextView = resolveInitialView();
      setClampedView(nextView.zoom, nextView.panX, nextView.panY);
    });
    return () => cancelAnimationFrame(frame);
  }, [resolveInitialView, setClampedView]);

  const adjustZoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    cancelSmoothWheel();
    commitView(computeZoomAt(viewRef.current, clientX, clientY, factor));
  }, [cancelSmoothWheel, commitView, computeZoomAt]);

  const zoomFromCenter = useCallback((factor: number) => {
    const viewport = internalViewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    adjustZoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }, [adjustZoomAt]);

  const zoomIn = useCallback(() => {
    zoomFromCenter(zoomStep);
  }, [zoomFromCenter, zoomStep]);

  const zoomOut = useCallback(() => {
    zoomFromCenter(1 / zoomStep);
  }, [zoomFromCenter, zoomStep]);

  const handleResize = useCallback(() => {
    resizeFrameRef.current = 0;

    const viewport = internalViewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const nextMetrics: ZoomPanMetrics = {
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      contentWidth: content.offsetWidth,
      contentHeight: content.offsetHeight,
    };
    const previousMetrics = layoutMetricsRef.current;
    const sizeChanged = !previousMetrics
      || Math.abs(previousMetrics.viewportWidth - nextMetrics.viewportWidth) > 0.5
      || Math.abs(previousMetrics.viewportHeight - nextMetrics.viewportHeight) > 0.5
      || Math.abs(previousMetrics.contentWidth - nextMetrics.contentWidth) > 0.5
      || Math.abs(previousMetrics.contentHeight - nextMetrics.contentHeight) > 0.5;
    layoutMetricsRef.current = nextMetrics;

    if (resetViewOnResize && sizeChanged) {
      const nextView = resolveInitialView();
      setClampedView(nextView.zoom, nextView.panX, nextView.panY);
      return;
    }

    const currentView = viewRef.current;
    const clamped = clampPan(currentView.panX, currentView.panY, currentView.zoom);
    if (clamped.panX !== currentView.panX || clamped.panY !== currentView.panY) {
      const nextView = { zoom: currentView.zoom, panX: clamped.panX, panY: clamped.panY };
      viewRef.current = nextView;
      setView(nextView);
    }
  }, [clampPan, resetViewOnResize, resolveInitialView, setClampedView]);

  useEffect(() => {
    const requestResizeUpdate = () => {
      if (resizeFrameRef.current !== 0) return;
      resizeFrameRef.current = requestAnimationFrame(handleResize);
    };

    requestResizeUpdate();
    window.addEventListener('resize', requestResizeUpdate);

    const viewport = internalViewportRef.current;
    const content = contentRef.current;
    if (typeof ResizeObserver !== 'undefined' && viewport && content) {
      const observer = new ResizeObserver(requestResizeUpdate);
      observer.observe(viewport);
      observer.observe(content);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', requestResizeUpdate);
        if (resizeFrameRef.current !== 0) {
          cancelAnimationFrame(resizeFrameRef.current);
          resizeFrameRef.current = 0;
        }
      };
    }

    return () => {
      window.removeEventListener('resize', requestResizeUpdate);
      if (resizeFrameRef.current !== 0) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = 0;
      }
    };
  }, [handleResize]);

  const endDrag = useCallback((event: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag.mode) return;

    if (drag.mode === 'pan' && !drag.moved && drag.button === 0) {
      const clickPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY);
      if (clickPoint) {
        onContentLeftClick?.(clickPoint, drag.startTarget);
      }
    } else if (drag.mode === 'left-select') {
      const startPoint = drag.path[0];
      const finalPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY, true);
      if (drag.moved && startPoint && finalPoint) {
        onContentLeftDragEnd?.(startPoint, finalPoint);
      } else if (!drag.moved && finalPoint) {
        onContentLeftClick?.(finalPoint, drag.startTarget);
      }
    } else if (drag.mode === 'right-drag') {
      const finalPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY);
      if (drag.moved) {
        const path = finalPoint ? [...drag.path, finalPoint] : drag.path;
        if (path.length > 0) {
          onContentRightDrag?.(path);
        }
      } else if (finalPoint) {
        onContentRightClick?.(finalPoint);
      }
    }

    dragRef.current = {
      mode: null,
      button: -1,
      startTarget: null,
      startX: 0,
      startY: 0,
      basePanX: 0,
      basePanY: 0,
      moved: false,
      path: [],
      lastSampleX: 0,
      lastSampleY: 0,
    };
    setIsPanning(false);
    setIsRightDragging(false);
    setIsLeftSelecting(false);
  }, [onContentLeftClick, onContentLeftDragEnd, onContentRightClick, onContentRightDrag]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag.mode) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (drag.mode === 'pan') {
        if (!drag.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
          drag.moved = true;
          onPanDragStart?.();
        }

        setClampedView(
          viewRef.current.zoom,
          drag.basePanX + deltaX,
          drag.basePanY + deltaY,
        );
        return;
      }

      if (drag.mode === 'left-select') {
        if (!drag.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
          drag.moved = true;
          setIsLeftSelecting(true);
        }

        if (drag.moved) {
          const startPoint = drag.path[0];
          const currentPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY, true);
          if (startPoint && currentPoint) {
            onContentLeftDragUpdate?.(startPoint, currentPoint);
          }
        }
        return;
      }

      const fromStart = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (!drag.moved && fromStart >= rightDragThresholdPx) {
        drag.moved = true;
      }

      const sampleDx = event.clientX - drag.lastSampleX;
      const sampleDy = event.clientY - drag.lastSampleY;
      const sampleDistance = Math.sqrt(sampleDx * sampleDx + sampleDy * sampleDy);
      if (sampleDistance >= rightDragSamplePx) {
        const nextPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY);
        if (nextPoint) {
          drag.path.push(nextPoint);
          drag.lastSampleX = event.clientX;
          drag.lastSampleY = event.clientY;
          if (drag.moved && drag.path.length > 1) {
            onContentRightDragUpdate?.([...drag.path]);
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', endDrag);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [endDrag, onContentLeftDragUpdate, onContentRightDragUpdate, onPanDragStart, rightDragSamplePx, rightDragThresholdPx, setClampedView]);

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;

    const target = event.target as HTMLElement;
    if (event.button === 0 && ignoreLeftDragFrom(target)) {
      return;
    }

    if (event.button === 2 && !onContentRightClick && !onContentRightDrag && !onContentRightDragUpdate) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cancelSmoothWheel();

    if (event.button === 0) {
      if (leftDragMode === 'select' && onContentLeftDragEnd) {
        const startPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY);
        if (!startPoint) return;

        dragRef.current = {
          mode: 'left-select',
          button: event.button,
          startTarget: target,
          startX: event.clientX,
          startY: event.clientY,
          basePanX: viewRef.current.panX,
          basePanY: viewRef.current.panY,
          moved: false,
          path: [startPoint],
          lastSampleX: event.clientX,
          lastSampleY: event.clientY,
        };
        setIsLeftSelecting(false);
        return;
      }

      dragRef.current = {
        mode: 'pan',
        button: event.button,
        startTarget: target,
        startX: event.clientX,
        startY: event.clientY,
        basePanX: viewRef.current.panX,
        basePanY: viewRef.current.panY,
        moved: false,
        path: [],
        lastSampleX: event.clientX,
        lastSampleY: event.clientY,
      };
      setIsPanning(true);
      return;
    }

    if (event.button === 1) {
      dragRef.current = {
        mode: 'pan',
        button: event.button,
        startTarget: target,
        startX: event.clientX,
        startY: event.clientY,
        basePanX: viewRef.current.panX,
        basePanY: viewRef.current.panY,
        moved: false,
        path: [],
        lastSampleX: event.clientX,
        lastSampleY: event.clientY,
      };
      setIsPanning(true);
      return;
    }

    const startPoint = clientToContentPercent(contentRef.current, event.clientX, event.clientY);
    if (!startPoint) return;

    dragRef.current = {
      mode: 'right-drag',
      button: event.button,
      startTarget: target,
      startX: event.clientX,
      startY: event.clientY,
      basePanX: viewRef.current.panX,
      basePanY: viewRef.current.panY,
      moved: false,
      path: [startPoint],
      lastSampleX: event.clientX,
      lastSampleY: event.clientY,
    };
    setIsRightDragging(true);
  }, [cancelSmoothWheel, ignoreLeftDragFrom, leftDragMode, onContentLeftDragEnd, onContentRightClick, onContentRightDrag, onContentRightDragUpdate]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const wheelSteps = clamp(-event.deltaY / WHEEL_DELTA_UNIT, -MAX_WHEEL_STEPS_PER_EVENT, MAX_WHEEL_STEPS_PER_EVENT);
    if (wheelSteps === 0) return;

    const baseView = smoothWheelRef.current.frameId !== 0
      ? smoothWheelRef.current.target
      : viewRef.current;
    smoothWheelRef.current.target = computeZoomAt(
      baseView,
      event.clientX,
      event.clientY,
      Math.pow(zoomStep, wheelSteps),
    );
    startSmoothWheel();
  }, [computeZoomAt, startSmoothWheel, zoomStep]);

  const handleContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (onContentRightClick || onContentRightDrag || onContentRightDragUpdate) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [onContentRightClick, onContentRightDrag, onContentRightDragUpdate]);

  const Controls = controls;

  return (
    <div
      ref={bindViewportRef}
      className={`zoom-pan-canvas${isPanning ? ' zoom-pan-canvas--panning' : ''}${isRightDragging ? ' zoom-pan-canvas--right-dragging' : ''}${isLeftSelecting ? ' zoom-pan-canvas--left-selecting' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <div
        ref={contentRef}
        className={`zoom-pan-canvas__content${contentClassName ? ` ${contentClassName}` : ''}`}
        style={buildContentStyle(view, contentStyle)}
        onMouseLeave={() => onContentMouseLeave?.()}
      >
        {children}
      </div>
      {Controls ? (
        <Controls
          zoom={view.zoom}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          resetView={resetView}
          zoomFromCenter={zoomFromCenter}
        />
      ) : null}
    </div>
  );
}
