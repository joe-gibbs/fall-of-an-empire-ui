import React, { useState, useRef, useCallback, useContext, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { toRootRem } from '../../../utils/cssUnits';
import { WebkilnAssetPath } from '../../../utils/assets';
import { renderRichText } from '../../../utils/richText';
import { readableFactionTextColour } from '../../../utils/colorFormatters';
import { UI_PRESENTATION } from '../../../config/presentation';
import { subscribeTooltipDismissEvent } from './tooltipEvents';
import './Tooltip.css';

interface TooltipLine {
  label: React.ReactNode;
  labelColor?: string;
  labelIcon?: string;
  value?: string;
  valueColor?: string;
  valueIcon?: string;
  subTooltip?: TooltipContent;
  isHeader?: boolean;
  stacked?: boolean;
}

interface TooltipContent {
  header?: React.ReactNode;
  title?: string;
  body?: React.ReactNode;
  lines?: TooltipLine[];
  afterLines?: React.ReactNode;
  footer?: string;
}

interface TooltipProps {
  content: React.ReactNode | TooltipContent;
  children: React.ReactNode;
  open?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  variant?: 'default' | 'sidebar';
  bubbleClassName?: string;
  inline?: boolean;
  disabled?: boolean;
  onShowIntent?: () => void;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  /**
   * Position the tooltip relative to this element instead of the trigger. Useful
   * when children live inside a panel (e.g. the bottom-bar map-mode tray) and
   * the tooltip should clear the entire panel rather than overlap siblings.
   */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

type TooltipSide = NonNullable<TooltipProps['position']>;

interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

interface TooltipPlacement {
  side: TooltipSide;
  top: number;
  left: number;
  rect: Rect;
  overlapArea: number;
  clampDistance: number;
}

let nextTooltipId = 1;

const TooltipNestingContext = React.createContext<{
  tooltipId: number;
  keepOpen: () => void;
  scheduleHide: (delayMs: number) => void;
} | null>(null);

/** Default hover-open delay when the settings bridge has not supplied one yet. */
const MIN_TOOLTIP_DELAY = UI_PRESENTATION.tooltip.minimumDelayMs;
const HIDE_GRACE_MS = UI_PRESENTATION.tooltip.hideGraceMs;
const VIEWPORT_PAD = UI_PRESENTATION.tooltip.viewportPaddingPx;
const TOOLTIP_GAP = UI_PRESENTATION.tooltip.gapPx;
const SUB_TOOLTIP_GAP = UI_PRESENTATION.tooltip.nestedGapPx;
const SUB_TOOLTIP_VERTICAL_OFFSET = UI_PRESENTATION.tooltip.nestedVerticalOffsetPx;
const PLACEMENT_STABILISE_FRAMES = UI_PRESENTATION.tooltip.placementStabiliseFrames;

function rectFromBounds(rect: DOMRect): Rect {
  const width = rect.width > 0 ? rect.width : Math.max(0, rect.right - rect.left);
  const height = rect.height > 0 ? rect.height : Math.max(0, rect.bottom - rect.top);

  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width,
    height,
  };
}

function viewportSize(): Size {
  const root = document.documentElement;
  return {
    width: window.innerWidth || root.clientWidth || 0,
    height: window.innerHeight || root.clientHeight || 0,
  };
}

function elementSize(element: HTMLElement): Size {
  const offsetWidth = element.offsetWidth;
  const offsetHeight = element.offsetHeight;
  const scrollWidth = element.scrollWidth;
  const scrollHeight = element.scrollHeight;
  if (offsetWidth > 0 && offsetHeight > 0) {
    return {
      width: offsetWidth,
      height: Math.max(offsetHeight, scrollHeight),
    };
  }

  const bounds = rectFromBounds(element.getBoundingClientRect());
  const height = bounds.height || offsetHeight;
  return {
    width: bounds.width || offsetWidth || scrollWidth,
    height: height || scrollHeight,
  };
}

function rectFromPosition(left: number, top: number, width: number, height: number): Rect {
  return {
    top,
    right: left + width,
    bottom: top + height,
    left,
    width,
    height,
  };
}

function unionRects(a: Rect, b: Rect): Rect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return rectFromPosition(left, top, right - left, bottom - top);
}

function intersectionArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

function viewportLimit(size: number): number {
  return Math.max(1, size - VIEWPORT_PAD * 2);
}

function resetViewportConstraints(element: HTMLElement) {
  element.style.top = '0';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  element.style.left = '0';
  element.style.width = '';
  element.style.height = '';
  element.style.minHeight = '0';
  element.style.minWidth = '';
  element.style.maxWidth = '';
  element.style.maxHeight = '';
  element.style.overflowY = '';
  element.style.marginLeft = '0';
  element.style.marginRight = '0';
}

function constrainElementToViewport(element: HTMLElement, vw: number, vh: number): Size {
  resetViewportConstraints(element);

  const maxWidth = viewportLimit(vw);
  const maxHeight = viewportLimit(vh);
  let size = elementSize(element);

  if (size.width > maxWidth) {
    element.style.minWidth = '0';
    element.style.maxWidth = toRootRem(maxWidth);
    size = elementSize(element);
  }

  if (size.height > maxHeight) {
    element.style.maxHeight = toRootRem(maxHeight);
    element.style.overflowY = 'auto';
    size = elementSize(element);
  } else {
    element.style.height = toRootRem(size.height);
  }

  return {
    width: Math.max(element.offsetWidth || 0, size.width),
    height: Math.max(element.offsetHeight || 0, Math.min(size.height, maxHeight)),
  };
}

function beginTooltipMeasurement(element: HTMLElement) {
  element.style.visibility = 'hidden';
  resetViewportConstraints(element);
}

function oppositeSide(side: TooltipSide): TooltipSide {
  if (side === 'top') return 'bottom';
  if (side === 'bottom') return 'top';
  if (side === 'left') return 'right';
  return 'left';
}

function sideOrder(preferred: TooltipSide): TooltipSide[] {
  if (preferred === 'top' || preferred === 'bottom') {
    return [preferred, oppositeSide(preferred), 'right', 'left'];
  }
  return [preferred, oppositeSide(preferred), 'bottom', 'top'];
}

function buildPlacement(
  side: TooltipSide,
  anchor: Rect,
  avoid: Rect,
  ttW: number,
  ttH: number,
  vw: number,
  vh: number,
): TooltipPlacement {
  let rawTop: number;
  let rawLeft: number;

  if (side === 'top' || side === 'bottom') {
    rawTop = side === 'top' ? anchor.top - TOOLTIP_GAP - ttH : anchor.bottom + TOOLTIP_GAP;
    rawLeft = anchor.left + anchor.width / 2 - ttW / 2;
  } else {
    rawLeft = side === 'left' ? anchor.left - TOOLTIP_GAP - ttW : anchor.right + TOOLTIP_GAP;
    rawTop = anchor.top + anchor.height / 2 - ttH / 2;
  }

  const left = clamp(rawLeft, VIEWPORT_PAD, vw - ttW - VIEWPORT_PAD);
  const top = clamp(rawTop, VIEWPORT_PAD, vh - ttH - VIEWPORT_PAD);
  const rect = rectFromPosition(left, top, ttW, ttH);

  return {
    side,
    top,
    left,
    rect,
    overlapArea: intersectionArea(rect, avoid),
    clampDistance: Math.abs(left - rawLeft) + Math.abs(top - rawTop),
  };
}

function choosePlacement(
  preferred: TooltipSide,
  anchor: Rect,
  avoid: Rect,
  ttW: number,
  ttH: number,
  vw: number,
  vh: number,
): TooltipPlacement {
  return sideOrder(preferred)
    .map((side, preferenceIndex) => {
      const placement = buildPlacement(side, anchor, avoid, ttW, ttH, vw, vh);
      const score = placement.overlapArea * 10000 + preferenceIndex * 100 + placement.clampDistance;
      return { placement, score };
    })
    .sort((a, b) => a.score - b.score)[0].placement;
}

function GoldRule() {
  return <div className="tt-gold-rule"><span /><span /></div>;
}

function renderTooltipBody(body: React.ReactNode): React.ReactNode {
  if (typeof body !== 'string') return body;
  const normalised = body.replace(/<bold>([^<>]*)<\/>:/gi, '<bold>$1:</>');
  return renderRichText(normalised.replace(/\r?\n/g, '<br/>'), { blockBullets: true });
}

function hasTooltipContent(content: React.ReactNode | TooltipContent): boolean {
  if (content === null || content === undefined || content === false) return false;
  if (!isTooltipContent(content)) return true;
  return Boolean(
    content.title
    || content.header
    || content.body
    || content.afterLines
    || (content.footer && content.footer.trim().length > 0)
    || (content.lines && content.lines.length > 0),
  );
}

function TooltipBody({
  data,
  sidebar,
  tooltipId,
  keepAncestorOpen,
}: {
  data: TooltipContent;
  sidebar?: boolean;
  tooltipId?: number;
  keepAncestorOpen?: () => void;
}) {
  return (
    <>
      {data.header}
      {data.title && <div className="tt-title">{data.title}</div>}
      {data.body && <div className="tt-body">{renderTooltipBody(data.body)}</div>}
      {data.lines && data.lines.length > 0 && (
        <div className={sidebar ? 'tt-lines tt-lines--sidebar' : 'tt-lines'}>
          {data.lines.map((line, i) => (
            <React.Fragment key={i}>
              {sidebar && !line.isHeader && i === 0 && <GoldRule />}
              <TooltipLineItem
                key={i}
                line={line}
                sidebar={sidebar}
                tooltipId={tooltipId}
                keepAncestorOpen={keepAncestorOpen}
              />
            </React.Fragment>
          ))}
        </div>
      )}
      {data.afterLines}
      {sidebar && data.footer && <GoldRule />}
      {data.footer && <div className={sidebar ? 'tt-footer tt-footer--sidebar' : 'tt-footer'}>{data.footer}</div>}
    </>
  );
}

function TooltipLineItem({
  line,
  sidebar,
  tooltipId,
  keepAncestorOpen,
}: {
  line: TooltipLine;
  sidebar?: boolean;
  tooltipId?: number;
  keepAncestorOpen?: () => void;
}) {
  const [subVisible, setSubVisible] = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placementFrameRef = useRef<number | null>(null);
  const placementRetryFrameRef = useRef<number | null>(null);

  const showSub = useCallback(() => {
    if (!line.subTooltip) return;
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
    showRef.current = setTimeout(() => setSubVisible(true), 200);
  }, [line.subTooltip]);

  const hideSub = useCallback(() => {
    if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      hideRef.current = null;
      // Still bridging between the line and its portal child.
      if (isElementHovered(lineRef.current, subRef.current)) return;
      setSubVisible(false);
    }, HIDE_GRACE_MS);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
    keepAncestorOpen?.();
    if (tooltipId !== undefined) {
      cancelSharedTooltipHide(tooltipId);
    }
  }, [keepAncestorOpen, tooltipId]);

  const hideSubAndSharedTooltip = useCallback(() => {
    hideSub();
    if (tooltipId !== undefined) {
      scheduleSharedTooltipHide(tooltipId, HIDE_GRACE_MS);
    }
  }, [hideSub, tooltipId]);

  const cancelPlacementFrames = useCallback(() => {
    if (placementFrameRef.current !== null) {
      cancelAnimationFrame(placementFrameRef.current);
      placementFrameRef.current = null;
    }
    if (placementRetryFrameRef.current !== null) {
      cancelAnimationFrame(placementRetryFrameRef.current);
      placementRetryFrameRef.current = null;
    }
  }, []);

  const placeSubTooltip = useCallback(() => {
    if (!subVisible || !lineRef.current || !subRef.current || !lineRef.current.isConnected) return;
    const lineRect = rectFromBounds(lineRef.current.getBoundingClientRect());
    const subEl = subRef.current;
    const { width: vw, height: vh } = viewportSize();
    if (vw <= 0 || vh <= 0) return;

    // Avoid visibility:hidden while already open - it clears :hover and fires mouseleave.
    const alreadyVisible = subEl.style.visibility === 'visible';
    if (!alreadyVisible) {
      subEl.style.visibility = 'hidden';
      beginTooltipMeasurement(subEl);
    } else {
      resetViewportConstraints(subEl);
    }
    let subSize = constrainElementToViewport(subEl, vw, vh);

    let subW = subSize.width;
    let subH = subSize.height;
    if (subW <= 0 || subH <= 0) return;

    const leftSpace = Math.max(0, lineRect.left - VIEWPORT_PAD - SUB_TOOLTIP_GAP);
    const rightSpace = Math.max(0, vw - VIEWPORT_PAD - lineRect.right - SUB_TOOLTIP_GAP);
    const openRight = leftSpace < subW && rightSpace > leftSpace;
    const availableSideWidth = Math.max(1, openRight ? rightSpace : leftSpace);

    if (subW > availableSideWidth) {
      subEl.style.minWidth = '0';
      subEl.style.maxWidth = toRootRem(availableSideWidth);
      subSize = constrainElementToViewport(subEl, vw, vh);
      subW = subSize.width;
      subH = subSize.height;
      if (subW <= 0 || subH <= 0) return;
    }

    const rawLeft = openRight
      ? lineRect.right + SUB_TOOLTIP_GAP
      : lineRect.left - SUB_TOOLTIP_GAP - subW;
    const rawTop = lineRect.top - SUB_TOOLTIP_VERTICAL_OFFSET;
    const left = clamp(rawLeft, VIEWPORT_PAD, vw - subW - VIEWPORT_PAD);
    const top = clamp(rawTop, VIEWPORT_PAD, vh - subH - VIEWPORT_PAD);

    subEl.style.left = toRootRem(left);
    subEl.style.right = 'auto';
    subEl.style.top = toRootRem(top);
    subEl.style.marginLeft = '0';
    subEl.style.marginRight = '0';
    subEl.style.transformOrigin = openRight ? 'left center' : 'right center';
    subEl.style.visibility = 'visible';
  }, [subVisible]);

  const scheduleSubPlacement = useCallback(() => {
    cancelPlacementFrames();
    placementFrameRef.current = requestAnimationFrame(() => {
      placementFrameRef.current = null;
      placeSubTooltip();
      placementRetryFrameRef.current = requestAnimationFrame(() => {
        placementRetryFrameRef.current = null;
        placeSubTooltip();
      });
    });
  }, [cancelPlacementFrames, placeSubTooltip]);

  useEffect(() => {
    return () => {
      if (showRef.current) clearTimeout(showRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
      cancelPlacementFrames();
    };
  }, [cancelPlacementFrames]);

  useLayoutEffect(() => {
    placeSubTooltip();
  }, [placeSubTooltip]);

  useEffect(() => {
    if (!subVisible) {
      cancelPlacementFrames();
      return undefined;
    }
    scheduleSubPlacement();
    window.addEventListener('resize', scheduleSubPlacement);
    window.addEventListener('scroll', scheduleSubPlacement, true);
    return () => {
      cancelPlacementFrames();
      window.removeEventListener('resize', scheduleSubPlacement);
      window.removeEventListener('scroll', scheduleSubPlacement, true);
    };
  }, [subVisible, scheduleSubPlacement, cancelPlacementFrames]);

  if (line.isHeader) {
    if (sidebar) {
      return (
        <div className="tt-line tt-line--header tt-line--header-sidebar">
          <img src={WebkilnAssetPath(line.labelIcon ?? '/assets/lozenge.png')} alt="" className="tt-header-lozenge" />
          <span className="tt-line-header-label">{line.label}</span>
          <span className="tt-header-rule" />
        </div>
      );
    }
    return (
      <div className="tt-line tt-line--header">
        <span className="tt-line-header-label">
          {line.labelIcon && <img src={WebkilnAssetPath(line.labelIcon)} alt="" className="tt-line-label-icon" draggable={false} />}
          {line.label}
        </span>
      </div>
    );
  }

  const hasValue = line.value !== undefined || line.valueIcon;

  return (
    <div
      ref={lineRef}
      className={`tt-line ${line.subTooltip ? 'tt-line--has-sub' : ''}${hasValue ? '' : ' tt-line--label-only'}${line.stacked ? ' tt-line--stacked' : ''}`}
      onMouseEnter={showSub}
      onMouseLeave={hideSub}
    >
      <span className="tt-line-label">
        {line.labelIcon && <img src={WebkilnAssetPath(line.labelIcon)} alt="" className="tt-line-label-icon" draggable={false} />}
        <span style={line.labelColor ? { color: line.labelColor } : undefined}>{line.label}</span>
      </span>
      {hasValue && (
        <span className="tt-line-value" style={line.valueColor ? { color: readableFactionTextColour(line.valueColor) } : undefined}>
          {line.valueIcon && <img src={WebkilnAssetPath(line.valueIcon)} alt="" className="tt-line-icon" draggable={false} />}
          {line.value !== undefined && <span>{line.value}</span>}
        </span>
      )}
      {subVisible && line.subTooltip && createPortal(
        <div
          ref={subRef}
          className="tt-sub tt-sub--portal"
          style={{ visibility: 'hidden' }}
          data-tooltip-surface={tooltipId}
          onMouseEnter={cancelHide}
          onMouseLeave={hideSubAndSharedTooltip}
        >
          <TooltipBody data={line.subTooltip} tooltipId={tooltipId} keepAncestorOpen={cancelHide} />
        </div>,
        document.body,
      )}
    </div>
  );
}

interface NestedTooltipProps {
  content: TooltipContent;
  children: React.ReactNode;
  delay?: number;
  inline?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  bubbleClassName?: string;
}

function NestedTooltip({
  content,
  children,
  delay = 180,
  inline = false,
  disabled = false,
  wrapperClassName,
  bubbleClassName,
}: NestedTooltipProps) {
  const nesting = useContext(TooltipNestingContext);
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placementFrameRef = useRef<number | null>(null);
  const placementRetryFrameRef = useRef<number | null>(null);

  const setWrapperRef = useCallback((node: HTMLElement | null) => {
    wrapperRef.current = node;
  }, []);

  const clearShow = useCallback(() => {
    if (showRef.current) {
      clearTimeout(showRef.current);
      showRef.current = null;
    }
  }, []);

  const clearHide = useCallback(() => {
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const keepOpen = useCallback(() => {
    clearHide();
    nesting?.keepOpen();
  }, [clearHide, nesting]);

  const show = useCallback(() => {
    if (disabled || !hasTooltipContent(content)) return;
    keepOpen();
    clearShow();
    showRef.current = setTimeout(() => {
      showRef.current = null;
      nesting?.keepOpen();
      setVisible(true);
    }, delay);
  }, [clearShow, content, delay, disabled, keepOpen, nesting]);

  const hide = useCallback(() => {
    clearShow();
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      hideRef.current = null;
      // Still bridging between the nested trigger and its portal child.
      if (isElementHovered(wrapperRef.current, subRef.current)) return;
      setVisible(false);
    }, HIDE_GRACE_MS);
  }, [clearShow]);

  const hideAndScheduleParent = useCallback(() => {
    hide();
    nesting?.scheduleHide(HIDE_GRACE_MS);
  }, [hide, nesting]);

  const cancelPlacementFrames = useCallback(() => {
    if (placementFrameRef.current !== null) {
      cancelAnimationFrame(placementFrameRef.current);
      placementFrameRef.current = null;
    }
    if (placementRetryFrameRef.current !== null) {
      cancelAnimationFrame(placementRetryFrameRef.current);
      placementRetryFrameRef.current = null;
    }
  }, []);

  const placeSubTooltip = useCallback(() => {
    if (!visible || !wrapperRef.current || !subRef.current || !wrapperRef.current.isConnected) return;
    const triggerRect = rectFromBounds(wrapperRef.current.getBoundingClientRect());
    const subEl = subRef.current;
    const { width: vw, height: vh } = viewportSize();
    if (vw <= 0 || vh <= 0) return;

    // Avoid visibility:hidden while already open - it clears :hover and fires mouseleave.
    const alreadyVisible = subEl.style.visibility === 'visible';
    if (!alreadyVisible) {
      subEl.style.visibility = 'hidden';
      beginTooltipMeasurement(subEl);
    } else {
      resetViewportConstraints(subEl);
    }
    let subSize = constrainElementToViewport(subEl, vw, vh);
    let subW = subSize.width;
    let subH = subSize.height;
    if (subW <= 0 || subH <= 0) return;

    const leftSpace = Math.max(0, triggerRect.left - VIEWPORT_PAD - SUB_TOOLTIP_GAP);
    const rightSpace = Math.max(0, vw - VIEWPORT_PAD - triggerRect.right - SUB_TOOLTIP_GAP);
    const openRight = leftSpace < subW && rightSpace > leftSpace;
    const availableSideWidth = Math.max(1, openRight ? rightSpace : leftSpace);

    if (subW > availableSideWidth) {
      subEl.style.minWidth = '0';
      subEl.style.maxWidth = toRootRem(availableSideWidth);
      subSize = constrainElementToViewport(subEl, vw, vh);
      subW = subSize.width;
      subH = subSize.height;
      if (subW <= 0 || subH <= 0) return;
    }

    const rawLeft = openRight
      ? triggerRect.right + SUB_TOOLTIP_GAP
      : triggerRect.left - SUB_TOOLTIP_GAP - subW;
    const rawTop = triggerRect.top - SUB_TOOLTIP_VERTICAL_OFFSET;
    const left = clamp(rawLeft, VIEWPORT_PAD, vw - subW - VIEWPORT_PAD);
    const top = clamp(rawTop, VIEWPORT_PAD, vh - subH - VIEWPORT_PAD);

    subEl.style.left = toRootRem(left);
    subEl.style.right = 'auto';
    subEl.style.top = toRootRem(top);
    subEl.style.marginLeft = '0';
    subEl.style.marginRight = '0';
    subEl.style.transformOrigin = openRight ? 'left center' : 'right center';
    subEl.style.visibility = 'visible';
  }, [visible]);

  const scheduleSubPlacement = useCallback(() => {
    cancelPlacementFrames();
    placementFrameRef.current = requestAnimationFrame(() => {
      placementFrameRef.current = null;
      placeSubTooltip();
      placementRetryFrameRef.current = requestAnimationFrame(() => {
        placementRetryFrameRef.current = null;
        placeSubTooltip();
      });
    });
  }, [cancelPlacementFrames, placeSubTooltip]);

  useEffect(() => {
    return () => {
      clearShow();
      clearHide();
      cancelPlacementFrames();
    };
  }, [cancelPlacementFrames, clearHide, clearShow]);

  useLayoutEffect(() => {
    placeSubTooltip();
  }, [placeSubTooltip]);

  useEffect(() => {
    if (!visible) {
      cancelPlacementFrames();
      return undefined;
    }
    scheduleSubPlacement();
    window.addEventListener('resize', scheduleSubPlacement);
    window.addEventListener('scroll', scheduleSubPlacement, true);
    return () => {
      cancelPlacementFrames();
      window.removeEventListener('resize', scheduleSubPlacement);
      window.removeEventListener('scroll', scheduleSubPlacement, true);
    };
  }, [visible, scheduleSubPlacement, cancelPlacementFrames]);

  const Wrapper = inline ? 'span' : 'div';

  return (
    <>
      <Wrapper
        ref={setWrapperRef}
        className={`${inline ? 'tooltip-wrapper-inline' : 'tooltip-wrapper'}${wrapperClassName ? ` ${wrapperClassName}` : ''}`}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </Wrapper>
      {visible && createPortal(
        <div
          ref={subRef}
          className={`tt-sub tt-sub--portal${bubbleClassName ? ` ${bubbleClassName}` : ''}`}
          style={{ visibility: 'hidden' }}
          data-tooltip-surface={nesting?.tooltipId}
          onMouseEnter={keepOpen}
          onMouseLeave={hideAndScheduleParent}
        >
          <TooltipBody
            data={content}
            tooltipId={nesting?.tooltipId}
            keepAncestorOpen={keepOpen}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function isTooltipContent(c: unknown): c is TooltipContent {
  return typeof c === 'object'
    && c !== null
    && !React.isValidElement(c)
    && ('header' in c || 'title' in c || 'body' in c || 'lines' in c || 'afterLines' in c || 'footer' in c);
}

function globalTooltipDelay(): number {
  const raw = document.documentElement.style.getPropertyValue('--tooltip-delay-ms');
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : MIN_TOOLTIP_DELAY;
}

interface ActiveTooltip {
  id: number;
  content: React.ReactNode | TooltipContent;
  position: TooltipSide;
  variant: NonNullable<TooltipProps['variant']>;
  bubbleClassName?: string;
  wrapperElement: HTMLElement;
  anchorElement?: HTMLElement | null;
}

type TooltipListener = (active: ActiveTooltip | null) => void;

let activeTooltip: ActiveTooltip | null = null;
let tooltipHideTimer: ReturnType<typeof setTimeout> | null = null;
const tooltipListeners = new Set<TooltipListener>();

function emitTooltipState() {
  tooltipListeners.forEach(listener => listener(activeTooltip));
}

function subscribeTooltip(listener: TooltipListener): () => void {
  tooltipListeners.add(listener);
  listener(activeTooltip);
  return () => tooltipListeners.delete(listener);
}

function showSharedTooltip(next: ActiveTooltip) {
  if (!hasTooltipContent(next.content)) {
    hideSharedTooltip(next.id);
    return;
  }
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }
  activeTooltip = next;
  emitTooltipState();
}

function updateSharedTooltip(next: ActiveTooltip) {
  if (activeTooltip?.id !== next.id) return;
  if (!hasTooltipContent(next.content)) {
    hideSharedTooltip(next.id);
    return;
  }
  activeTooltip = next;
  emitTooltipState();
}

function isTooltipTreeHovered(
  id: number,
  wrapper?: HTMLElement | null,
  anchor?: HTMLElement | null,
): boolean {
  if (wrapper?.isConnected && wrapper.matches(':hover')) return true;
  if (anchor?.isConnected && anchor !== wrapper && anchor.matches(':hover')) return true;
  const surfaces = document.querySelectorAll(`[data-tooltip-surface="${id}"]`);
  for (let i = 0; i < surfaces.length; i += 1) {
    const el = surfaces[i];
    if (el instanceof HTMLElement && el.isConnected && el.matches(':hover')) {
      return true;
    }
  }
  return false;
}

function scheduleSharedTooltipHide(id: number, delayMs: number) {
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
  }
  tooltipHideTimer = setTimeout(() => {
    tooltipHideTimer = null;
    if (activeTooltip?.id !== id) return;
    // Pointer may still be over the trigger, bubble, or a nested portal after
    // crossing the gap between surfaces; keep the tree open in that case.
    if (isTooltipTreeHovered(id, activeTooltip.wrapperElement, activeTooltip.anchorElement)) {
      return;
    }
    activeTooltip = null;
    emitTooltipState();
  }, delayMs);
}

function hideSharedTooltip(id: number) {
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }
  if (activeTooltip?.id === id) {
    activeTooltip = null;
    emitTooltipState();
  }
}

function cancelSharedTooltipHide(id: number) {
  if (activeTooltip?.id !== id || !tooltipHideTimer) {
    return;
  }
  clearTimeout(tooltipHideTimer);
  tooltipHideTimer = null;
}

function isElementHovered(...elements: Array<HTMLElement | null | undefined>): boolean {
  return elements.some(el => Boolean(el?.isConnected && el.matches(':hover')));
}

function TooltipHostContent({ active }: { active: ActiveTooltip }) {
  const tooltipPositionerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const placementFrameRef = useRef<number | null>(null);
  const placementFrameCountRef = useRef(0);

  const cancelPlacementFrames = useCallback(() => {
    if (placementFrameRef.current !== null) {
      cancelAnimationFrame(placementFrameRef.current);
      placementFrameRef.current = null;
    }
    placementFrameCountRef.current = 0;
  }, []);

  const placeTooltip = useCallback(() => {
    if (!tooltipPositionerRef.current || !tooltipRef.current || !active.wrapperElement.isConnected) {
      return;
    }

    const anchor = active.anchorElement?.isConnected ? active.anchorElement : active.wrapperElement;
    const anchorRect = rectFromBounds(anchor.getBoundingClientRect());
    const wrapperRect = rectFromBounds(active.wrapperElement.getBoundingClientRect());
    const avoidRect = anchor === active.wrapperElement ? wrapperRect : unionRects(anchorRect, wrapperRect);
    const positioner = tooltipPositionerRef.current;
    const tt = tooltipRef.current;
    const { width: vw, height: vh } = viewportSize();
    if (vw <= 0 || vh <= 0) return;

    // visibility:hidden clears :hover and fires mouseleave. Only use it for the
    // initial measure; once open, re-place without hiding so nested travel stays stable.
    const alreadyVisible = positioner.style.visibility === 'visible' && tt.style.visibility === 'visible';
    if (!alreadyVisible) {
      positioner.style.visibility = 'hidden';
      positioner.style.top = '0';
      positioner.style.left = '0';
      positioner.style.right = 'auto';
      positioner.style.bottom = 'auto';
      positioner.style.width = 'auto';
      positioner.style.height = '0';
      beginTooltipMeasurement(tt);
    } else {
      resetViewportConstraints(tt);
    }
    const tooltipSize = constrainElementToViewport(tt, vw, vh);
    const ttW = tooltipSize.width;
    const ttH = tooltipSize.height;
    if (ttW <= 0 || ttH <= 0) return;

    const placement = choosePlacement(active.position, anchorRect, avoidRect, ttW, ttH, vw, vh);

    positioner.style.top = toRootRem(placement.top);
    positioner.style.left = toRootRem(placement.left);
    positioner.style.width = toRootRem(ttW);
    positioner.style.height = toRootRem(ttH);
    positioner.style.visibility = 'visible';
    tt.style.visibility = 'visible';

    const origins: Record<TooltipSide, string> = {
      top: 'center bottom',
      bottom: 'center top',
      left: 'right center',
      right: 'left center',
    };
    tt.style.transformOrigin = origins[placement.side];
  }, [active]);

  const schedulePlacement = useCallback(() => {
    cancelPlacementFrames();
    const step = () => {
      placementFrameRef.current = null;
      placeTooltip();
      placementFrameCountRef.current += 1;
      if (placementFrameCountRef.current < PLACEMENT_STABILISE_FRAMES) {
        placementFrameRef.current = requestAnimationFrame(step);
      } else {
        placementFrameCountRef.current = 0;
      }
    };
    placementFrameRef.current = requestAnimationFrame(step);
  }, [cancelPlacementFrames, placeTooltip]);

  useLayoutEffect(() => {
    placeTooltip();
  });

  useEffect(() => {
    schedulePlacement();
    const target = tooltipRef.current;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && target) {
      observer = new ResizeObserver(schedulePlacement);
      observer.observe(target);
    }
    // Reposition on viewport/layout changes only. Do not listen to mousemove -
    // placement used to hide the bubble while measuring, which fired mouseleave
    // and collapsed nested tooltip chains during normal pointer travel.
    window.addEventListener('resize', schedulePlacement);
    window.addEventListener('scroll', schedulePlacement, true);
    return () => {
      cancelPlacementFrames();
      if (observer) observer.disconnect();
      window.removeEventListener('resize', schedulePlacement);
      window.removeEventListener('scroll', schedulePlacement, true);
    };
  }, [schedulePlacement, cancelPlacementFrames]);

  return (
    <div
      ref={tooltipPositionerRef}
      className="tt-positioner"
      style={{
        position: 'fixed',
        top: 0,
        right: 'auto',
        bottom: 'auto',
        left: 0,
        width: 'auto',
        height: 0,
        visibility: 'hidden',
      }}
    >
      <div
        ref={tooltipRef}
        className={`tt-bubble${active.variant === 'sidebar' ? ' tt-bubble--sidebar' : ''}${active.bubbleClassName ? ` ${active.bubbleClassName}` : ''}`}
        style={{ visibility: 'hidden' }}
        data-tooltip-surface={active.id}
        onMouseEnter={() => cancelSharedTooltipHide(active.id)}
        onMouseLeave={() => scheduleSharedTooltipHide(active.id, HIDE_GRACE_MS)}
        onLoadCapture={schedulePlacement}
      >
        <TooltipNestingContext.Provider value={{
          tooltipId: active.id,
          keepOpen: () => cancelSharedTooltipHide(active.id),
          scheduleHide: (delayMs: number) => scheduleSharedTooltipHide(active.id, delayMs),
        }}>
          <div className="tt-content">
            {isTooltipContent(active.content)
              ? <TooltipBody data={active.content} sidebar={active.variant === 'sidebar'} tooltipId={active.id} />
              : typeof active.content === 'string' || typeof active.content === 'number'
                ? <div className="tt-simple">{active.content}</div>
                : <div className="tt-custom">{active.content}</div>
            }
          </div>
        </TooltipNestingContext.Provider>
      </div>
    </div>
  );
}

function TooltipHost() {
  const [active, setActive] = useState<ActiveTooltip | null>(activeTooltip);

  useEffect(() => subscribeTooltip(setActive), []);

  if (!active) {
    return null;
  }

  return createPortal(<TooltipHostContent key={active.id} active={active} />, document.body);
}

/** Tooltip that usually portals to the document root to escape stacking contexts. */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  open,
  position = 'top',
  delay,
  variant = 'default',
  bubbleClassName,
  inline = false,
  disabled = false,
  onShowIntent,
  wrapperClassName,
  wrapperStyle,
  anchorRef,
}) => {
  const controlled = open !== undefined;
  const effectiveDelay = Math.max(delay ?? globalTooltipDelay(), 0);
  const wrapperRef = useRef<HTMLElement>(null);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabledRef = useRef(disabled);
  const onShowIntentRef = useRef(onShowIntent);
  const hoveredRef = useRef(false);
  const tooltipIdRef = useRef(nextTooltipId++);
  const hoverStartedAtRef = useRef(0);

  useLayoutEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useLayoutEffect(() => {
    onShowIntentRef.current = onShowIntent;
  }, [onShowIntent]);

  const setWrapperRef = useCallback((node: HTMLElement | null) => {
    wrapperRef.current = node;
  }, []);

  const cancelTimers = useCallback(() => {
    if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
  }, []);

  const buildActiveTooltip = useCallback((wrapper: HTMLElement): ActiveTooltip => ({
    id: tooltipIdRef.current,
    content,
    position,
    variant,
    bubbleClassName,
    wrapperElement: wrapper,
    anchorElement: anchorRef?.current ?? wrapper,
  }), [anchorRef, bubbleClassName, content, position, variant]);
  const buildActiveTooltipRef = useRef(buildActiveTooltip);

  useLayoutEffect(() => {
    buildActiveTooltipRef.current = buildActiveTooltip;
  }, [buildActiveTooltip]);

  const scheduleShow = useCallback((delayMs: number) => {
    if (showRef.current) clearTimeout(showRef.current);
    showRef.current = setTimeout(() => {
      showRef.current = null;
      const wrapper = wrapperRef.current;
      if (!disabledRef.current && hoveredRef.current && wrapper) {
        showSharedTooltip(buildActiveTooltipRef.current(wrapper));
      }
    }, delayMs);
  }, []);

  const beginShow = useCallback(() => {
    const alreadyHovered = hoveredRef.current;
    if (!alreadyHovered) {
      onShowIntentRef.current?.();
      hoverStartedAtRef.current = Date.now();
    }
    hoveredRef.current = true;
    cancelSharedTooltipHide(tooltipIdRef.current);
    if (disabledRef.current) return;
    // Controlled `open` re-renders must not re-fire showIntent or re-schedule
    // the open delay once this tooltip is already active or pending.
    if (alreadyHovered && activeTooltip?.id === tooltipIdRef.current) {
      return;
    }
    if (alreadyHovered && showRef.current) {
      return;
    }
    scheduleShow(alreadyHovered ? 0 : effectiveDelay);
  }, [effectiveDelay, scheduleShow]);

  const show = useCallback(() => {
    if (!controlled) beginShow();
  }, [beginShow, controlled]);

  const hide = useCallback(() => {
    hoveredRef.current = false;
    if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
    scheduleSharedTooltipHide(tooltipIdRef.current, HIDE_GRACE_MS);
  }, []);

  useEffect(() => {
    if (!controlled) return;
    if (open) beginShow();
    else hide();
  }, [beginShow, controlled, hide, open]);

  const dismissForPress = useCallback(() => {
    hoveredRef.current = false;
    cancelTimers();
    hideSharedTooltip(tooltipIdRef.current);
  }, [cancelTimers]);

  useEffect(() => {
    if (disabled) {
      if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
      hideSharedTooltip(tooltipIdRef.current);
      return;
    }

    if (hoveredRef.current && activeTooltip?.id !== tooltipIdRef.current && !showRef.current) {
      const elapsed = Date.now() - hoverStartedAtRef.current;
      scheduleShow(Math.max(0, effectiveDelay - elapsed));
    }
  }, [disabled, effectiveDelay, scheduleShow]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !hoveredRef.current || disabledRef.current || activeTooltip?.id !== tooltipIdRef.current) {
      return;
    }
    updateSharedTooltip(buildActiveTooltip(wrapper));
  }, [buildActiveTooltip]);

  useEffect(() => {
    const tooltipId = tooltipIdRef.current;
    return () => {
      cancelTimers();
      hideSharedTooltip(tooltipId);
    };
  }, [cancelTimers]);

  useEffect(() => subscribeTooltipDismissEvent(dismissForPress), [dismissForPress]);

  return (
    <>
      {inline ? (
        <span
          ref={setWrapperRef}
          className={`tooltip-wrapper-inline${wrapperClassName ? ` ${wrapperClassName}` : ''}`}
          style={wrapperStyle}
          onMouseEnter={show}
          onMouseLeave={hide}
          onMouseDownCapture={dismissForPress}
        >
          {children}
        </span>
      ) : (
        <div
          ref={setWrapperRef}
          className={`tooltip-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ''}`}
          style={wrapperStyle}
          onMouseEnter={show}
          onMouseLeave={hide}
          onMouseDownCapture={dismissForPress}
        >
          {children}
        </div>
      )}
    </>
  );
};

export default Tooltip;
export { TooltipHost };
export { NestedTooltip };
export type { TooltipContent, TooltipLine };
