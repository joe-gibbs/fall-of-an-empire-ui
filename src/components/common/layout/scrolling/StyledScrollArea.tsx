import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import './StyledScrollArea.css';

interface StyledScrollAreaProps {
  className?: string;
  viewportClassName?: string;
  tutorialTarget?: string;
  variant?: 'fill' | 'inline';
  children: ReactNode;
}

interface StyledScrollbarProps {
  frameRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  contentSignal: unknown;
}

interface ScrollMetrics {
  visible: boolean;
  thumbHeight: number;
  thumbTop: number;
}

const MIN_THUMB_HEIGHT = 22;
const SMOOTH_SCROLL_LERP = 0.32;
const SMOOTH_SCROLL_EPSILON = 0.5;
const WHEEL_LINE_PIXELS = 42;
const DEFAULT_UI_SCROLL_SPEED = 1;
const MIN_UI_SCROLL_SPEED = 0.25;
const MAX_UI_SCROLL_SPEED = 3;

const clampUiScrollSpeed = (value: number): number => Math.max(MIN_UI_SCROLL_SPEED, Math.min(MAX_UI_SCROLL_SPEED, value));

function getConfiguredUiScrollSpeed(): number {
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue('--ui-scroll-speed');
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? clampUiScrollSpeed(parsed)
    : DEFAULT_UI_SCROLL_SPEED;
}

export const StyledScrollbar = React.memo(function StyledScrollbar({
  frameRef,
  viewportRef,
  contentSignal,
}: StyledScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startTop: number;
    maxTop: number;
    maxScroll: number;
  } | null>(null);
  const smoothScrollRef = useRef({
    frameId: 0,
    targetTop: 0,
  });
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    visible: false,
    thumbHeight: 0,
    thumbTop: 0,
  });

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    const visible = maxScroll > 1;
    if (!visible) {
      setMetrics(prev => (
        prev.visible || prev.thumbHeight !== 0 || prev.thumbTop !== 0
          ? { visible: false, thumbHeight: 0, thumbTop: 0 }
          : prev
      ));
      return;
    }

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_HEIGHT,
      Math.round((viewport.clientHeight / viewport.scrollHeight) * trackHeight),
    );
    const maxTop = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = maxScroll > 0
      ? Math.round((viewport.scrollTop / maxScroll) * maxTop)
      : 0;

    setMetrics(prev => (
      prev.visible === visible
      && prev.thumbHeight === thumbHeight
      && prev.thumbTop === thumbTop
        ? prev
        : { visible, thumbHeight, thumbTop }
    ));
  }, [viewportRef]);

  const cancelSmoothScroll = useCallback(() => {
    if (smoothScrollRef.current.frameId !== 0) {
      window.cancelAnimationFrame(smoothScrollRef.current.frameId);
      smoothScrollRef.current.frameId = 0;
    }
  }, []);

  const clampScrollTop = useCallback((value: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    return Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight, value));
  }, [viewportRef]);

  const startSmoothScroll = useCallback(() => {
    if (smoothScrollRef.current.frameId !== 0) return;

    const step = () => {
      const viewport = viewportRef.current;
      if (!viewport) {
        smoothScrollRef.current.frameId = 0;
        return;
      }

      const targetTop = clampScrollTop(smoothScrollRef.current.targetTop);
      smoothScrollRef.current.targetTop = targetTop;
      const delta = targetTop - viewport.scrollTop;

      if (Math.abs(delta) <= SMOOTH_SCROLL_EPSILON) {
        viewport.scrollTop = targetTop;
        smoothScrollRef.current.frameId = 0;
        updateMetrics();
        return;
      }

      viewport.scrollTop += delta * SMOOTH_SCROLL_LERP;
      updateMetrics();
      smoothScrollRef.current.frameId = window.requestAnimationFrame(step);
    };

    smoothScrollRef.current.frameId = window.requestAnimationFrame(step);
  }, [clampScrollTop, updateMetrics, viewportRef]);

  const wheelDeltaPixels = useCallback((event: WheelEvent) => {
    if (event.deltaMode === 1) return event.deltaY * WHEEL_LINE_PIXELS;
    if (event.deltaMode === 2) {
      const viewport = viewportRef.current;
      return event.deltaY * ((viewport?.clientHeight ?? 0) * 0.85);
    }
    return event.deltaY;
  }, [viewportRef]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (event.defaultPrevented) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    if (maxScroll <= 0) return;

    const delta = wheelDeltaPixels(event) * getConfiguredUiScrollSpeed();
    if (delta === 0) return;

    event.preventDefault();
    const baseTop = smoothScrollRef.current.frameId !== 0
      ? smoothScrollRef.current.targetTop
      : viewport.scrollTop;
    smoothScrollRef.current.targetTop = clampScrollTop(baseTop + delta);
    startSmoothScroll();
  }, [clampScrollTop, startSmoothScroll, viewportRef, wheelDeltaPixels]);

  useLayoutEffect(() => {
    const id = window.setTimeout(updateMetrics, 0);
    return () => window.clearTimeout(id);
  }, [contentSignal, updateMetrics]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener('scroll', updateMetrics);
    window.addEventListener('resize', updateMetrics);
    const id = window.setInterval(updateMetrics, 350);

    return () => {
      viewport.removeEventListener('scroll', updateMetrics);
      window.removeEventListener('resize', updateMetrics);
      window.clearInterval(id);
    };
  }, [updateMetrics, viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const wheelOptions: AddEventListenerOptions = { passive: false };
    viewport.addEventListener('wheel', handleWheel, wheelOptions);
    return () => {
      viewport.removeEventListener('wheel', handleWheel, wheelOptions);
      cancelSmoothScroll();
    };
  }, [cancelSmoothScroll, handleWheel, viewportRef]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const handleFrameWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element) {
        const owningScrollArea = target.closest('.styled-scroll-area');
        if (owningScrollArea && owningScrollArea !== frame) return;
      }
      handleWheel(event);
    };

    const wheelOptions: AddEventListenerOptions = { capture: true, passive: false };
    frame.addEventListener('wheel', handleFrameWheel, wheelOptions);
    return () => {
      frame.removeEventListener('wheel', handleFrameWheel, wheelOptions);
    };
  }, [frameRef, handleWheel]);

  const clearDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const updateDragPosition = useCallback((clientY: number) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport) return;

    const nextTop = Math.max(0, Math.min(drag.maxTop, drag.startTop + clientY - drag.startY));
    viewport.scrollTop = drag.maxTop > 0
      ? (nextTop / drag.maxTop) * drag.maxScroll
      : 0;
    updateMetrics();
  }, [updateMetrics, viewportRef]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if ((event.buttons & 1) === 0) {
        clearDrag();
        return;
      }

      event.preventDefault();
      updateDragPosition(event.clientY);
    };
    const handlePointerEnd = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      clearDrag();
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      if ((event.buttons & 1) === 0) {
        clearDrag();
        return;
      }

      event.preventDefault();
      updateDragPosition(event.clientY);
    };
    const handleMouseUp = () => clearDrag();

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerEnd, true);
    window.addEventListener('pointercancel', handlePointerEnd, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('blur', clearDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerEnd, true);
      window.removeEventListener('pointercancel', handlePointerEnd, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('blur', clearDrag);
    };
  }, [clearDrag, updateDragPosition]);

  const jumpToClientY = useCallback((clientY: number) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !metrics.visible) return;

    cancelSmoothScroll();
    const trackRect = track.getBoundingClientRect();
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    const maxTop = Math.max(0, track.clientHeight - metrics.thumbHeight);
    const nextTop = Math.max(0, Math.min(maxTop, clientY - trackRect.top - metrics.thumbHeight / 2));
    viewport.scrollTop = maxTop > 0 ? (nextTop / maxTop) * maxScroll : 0;
    updateMetrics();
  }, [cancelSmoothScroll, metrics.thumbHeight, metrics.visible, updateMetrics, viewportRef]);

  const handleTrackMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    jumpToClientY(event.clientY);
  }, [jumpToClientY]);

  const handleThumbPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    event.preventDefault();
    event.stopPropagation();
    cancelSmoothScroll();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: metrics.thumbTop,
      maxTop: Math.max(0, track.clientHeight - metrics.thumbHeight),
      maxScroll: Math.max(0, viewport.scrollHeight - viewport.clientHeight),
    };
  }, [cancelSmoothScroll, metrics.thumbHeight, metrics.thumbTop, viewportRef]);

  const handleThumbPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if ((event.buttons & 1) === 0) {
      clearDrag();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateDragPosition(event.clientY);
  }, [clearDrag, updateDragPosition]);

  const handleThumbPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      clearDrag();
    }
  }, [clearDrag]);

  const handleThumbLostPointerCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }, []);

  return (
    <div
      ref={trackRef}
      className={`styled-scroll-area__track${metrics.visible ? '' : ' styled-scroll-area__track--hidden'}`}
      onMouseDown={handleTrackMouseDown}
    >
      <div
        ref={thumbRef}
        className="styled-scroll-area__thumb"
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={handleThumbPointerEnd}
        onPointerCancel={handleThumbPointerEnd}
        onLostPointerCapture={handleThumbLostPointerCapture}
        style={{
          height: `${metrics.thumbHeight}px`,
          transform: `translateY(${metrics.thumbTop}px)`,
        }}
      />
    </div>
  );
});

const StyledScrollArea: React.FC<StyledScrollAreaProps> = ({
  className = '',
  viewportClassName = '',
  tutorialTarget,
  variant = 'fill',
  children,
}) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={frameRef}
      className={`styled-scroll-area styled-scroll-area--${variant}${className ? ` ${className}` : ''}`}
      data-tutorial-target={tutorialTarget}
    >
      <div
        ref={viewportRef}
        className={`styled-scroll-area__viewport${viewportClassName ? ` ${viewportClassName}` : ''}`}
      >
        {children}
      </div>
      <StyledScrollbar frameRef={frameRef} viewportRef={viewportRef} contentSignal={children} />
    </div>
  );
};

export default React.memo(StyledScrollArea);
