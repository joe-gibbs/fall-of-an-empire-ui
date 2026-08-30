import React, { useState, useRef, useCallback, useContext, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { toRootRem } from '../../../utils/cssUnits';
import { WebkilnAssetPath } from '../../../utils/assets';
import { renderRichText } from '../../../utils/richText';
import { readableFactionTextColour } from '../../../utils/colorFormatters';
import { UI_PRESENTATION } from '../../../config/presentation';
import { dismissSharedTooltips, subscribeTooltipDismissEvent } from './tooltipEvents';
import './Tooltip.css';

interface TooltipLine {
  label: React.ReactNode;
  labelColor?: string;
  labelIcon?: string;
  value?: React.ReactNode;
  valueColor?: string;
  valueIcon?: string;
  subTooltip?: TooltipContent;
  isHeader?: boolean;
  stacked?: boolean;
}

interface TooltipContent {
  header?: React.ReactNode;
  title?: string;
  /** Keycap or other control shown on the title row, top-right. */
  titleAccessory?: React.ReactNode;
  body?: React.ReactNode;
  lines?: TooltipLine[];
  afterLines?: React.ReactNode;
  /** Plain help text, or a keycap row via ActionKeyGlyph / actionBindingFooter. */
  footer?: React.ReactNode;
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

let lastPointerNode: EventTarget | null = null;

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

function hasFooterContent(footer: React.ReactNode): boolean {
  if (footer === null || footer === undefined || footer === false) return false;
  if (typeof footer === 'string') return footer.trim().length > 0;
  return true;
}

function hasTooltipContent(content: React.ReactNode | TooltipContent): boolean {
  if (content === null || content === undefined || content === false) return false;
  if (!isTooltipContent(content)) return true;
  return Boolean(
    content.title
    || content.titleAccessory
    || content.header
    || content.body
    || content.afterLines
    || hasFooterContent(content.footer)
    || (content.lines && content.lines.length > 0),
  );
}

function isWebkilnPointerOnWorld(): boolean {
  const policy = (window as Window & { __webkilnInputPolicy?: { lastKey?: string } }).__webkilnInputPolicy;
  return typeof policy?.lastKey === 'string' && policy.lastKey.startsWith('0');
}

function isNodeInTooltipTree(
  id: number,
  node: EventTarget | null | undefined,
  wrapper?: HTMLElement | null,
  anchor?: HTMLElement | null,
): boolean {
  if (!(node instanceof Node)) return false;
  if (wrapper?.contains(node)) return true;
  if (anchor && anchor !== wrapper && anchor.contains(node)) return true;
  return node instanceof Element && Boolean(node.closest(`[data-tooltip-surface="${id}"]`));
}

function isPointerOverTooltipSurface(id: number): boolean {
  return lastPointerNode instanceof Element
    && Boolean(lastPointerNode.closest(`[data-tooltip-surface="${id}"]`));
}

function isPointerOverTooltipInteraction(): boolean {
  return lastPointerNode instanceof Element
    && Boolean(lastPointerNode.closest('.tooltip-wrapper, .tooltip-wrapper-inline, [data-tooltip-surface]'));
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
      {(data.title || data.titleAccessory) && (
        <div className={data.titleAccessory ? 'tt-title tt-title--with-accessory' : 'tt-title'}>
          {data.title && <span className="tt-title-text">{data.title}</span>}
          {data.titleAccessory}
        </div>
      )}
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
      {sidebar && hasFooterContent(data.footer) && <GoldRule />}
      {hasFooterContent(data.footer) && (
        <div className={sidebar ? 'tt-footer tt-footer--sidebar' : 'tt-footer'}>{data.footer}</div>
      )}
    </>
  );
}

function TooltipHeaderValue({ line }: { line: TooltipLine }) {
  if (line.value === undefined && !line.valueIcon) return null;
  return (
    <span
      className="tt-line-value tt-line-value--header"
      style={line.valueColor ? { color: readableFactionTextColour(line.valueColor) } : undefined}
    >
      {line.valueIcon && <img src={WebkilnAssetPath(line.valueIcon)} alt="" className="tt-line-icon" draggable={false} />}
      {line.value !== undefined && <span>{line.value}</span>}
    </span>
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
      if (lineRef.current?.contains(lastPointerNode as Node) || subRef.current?.contains(lastPointerNode as Node)) {
        return;
      }
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
          <TooltipHeaderValue line={line} />
        </div>
      );
    }
    return (
      <div className="tt-line tt-line--header">
        <span className="tt-line-header-label">
          {line.labelIcon && <img src={WebkilnAssetPath(line.labelIcon)} alt="" className="tt-line-label-icon" draggable={false} />}
          {line.label}
        </span>
        <TooltipHeaderValue line={line} />
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
  wrapperStyle?: React.CSSProperties;
  bubbleClassName?: string;
  onShowIntent?: () => void;
}

function NestedTooltip({
  content,
  children,
  delay = 180,
  inline = false,
  disabled = false,
  wrapperClassName,
  wrapperStyle,
  bubbleClassName,
  onShowIntent,
}: NestedTooltipProps) {
  const nesting = useContext(TooltipNestingContext);
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placementFrameRef = useRef<number | null>(null);
  const placementRetryFrameRef = useRef<number | null>(null);
  const onShowIntentRef = useRef(onShowIntent);
  const hoveredRef = useRef(false);
  const contentRef = useRef(content);
  const canShow = !disabled && hasTooltipContent(content);

  useLayoutEffect(() => {
    onShowIntentRef.current = onShowIntent;
  }, [onShowIntent]);

  useLayoutEffect(() => {
    contentRef.current = content;
  }, [content]);

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
    hoveredRef.current = true;
    keepOpen();
    onShowIntentRef.current?.();
    if (disabled || !hasTooltipContent(contentRef.current)) return;
    clearShow();
    showRef.current = setTimeout(() => {
      showRef.current = null;
      if (!hoveredRef.current || !hasTooltipContent(contentRef.current)) return;
      nesting?.keepOpen();
      setVisible(true);
    }, delay);
  }, [clearShow, delay, disabled, keepOpen, nesting]);

  const hide = useCallback(() => {
    clearShow();
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      hideRef.current = null;
      if (wrapperRef.current?.contains(lastPointerNode as Node) || subRef.current?.contains(lastPointerNode as Node)) {
        return;
      }
      hoveredRef.current = false;
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

  useEffect(() => subscribeTooltipDismissEvent(() => {
    hoveredRef.current = false;
    clearShow();
    clearHide();
    setVisible(false);
  }), [clearHide, clearShow]);

  useEffect(() => {
    if (!hoveredRef.current || visible || !canShow) {
      return;
    }
    show();
  }, [canShow, show, visible]);

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
        style={wrapperStyle}
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
    && ('header' in c || 'title' in c || 'titleAccessory' in c || 'body' in c || 'lines' in c || 'afterLines' in c || 'footer' in c);
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
  controlled: boolean;
}

type TooltipListener = (active: ActiveTooltip | null) => void;

let activeTooltip: ActiveTooltip | null = null;
let tooltipHideTimer: ReturnType<typeof setTimeout> | null = null;
// After a tooltip has opened, later triggers skip the open delay until the
// pointer leaves for a non-tooltip area and the current tooltip closes.
let skipOpenDelay = false;
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
  skipOpenDelay = true;
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

function isTooltipTriggerAvailable(element: HTMLElement | null | undefined): boolean {
  if (!element || !element.isConnected) {
    return false;
  }

  let node: HTMLElement | null = element;
  while (node) {
    if (node.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    node = node.parentElement;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isPointerOverTooltipTree(id: number): boolean {
  const active = activeTooltip;
  if (!active || active.id !== id) return false;
  if (!isTooltipTriggerAvailable(active.wrapperElement)) return false;
  return isNodeInTooltipTree(id, lastPointerNode, active.wrapperElement, active.anchorElement);
}

function dismissOpenTooltips() {
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }
  skipOpenDelay = false;
  if (activeTooltip) {
    activeTooltip = null;
    emitTooltipState();
  }
  dismissSharedTooltips();
}

function scheduleSharedTooltipHide(id: number, delayMs: number) {
  if (activeTooltip?.id === id && activeTooltip.controlled) {
    return;
  }
  if (delayMs <= 0) {
    hideSharedTooltip(id);
    return;
  }
  if (tooltipHideTimer) return;
  tooltipHideTimer = setTimeout(() => {
    tooltipHideTimer = null;
    if (activeTooltip?.id !== id) return;
    // Nested rows live on the bubble. If the pointer made it onto a tooltip
    // surface, keep the tree open even if Webkiln's last world-input bit flickered.
    if (isPointerOverTooltipSurface(id)) return;
    // Over the map, Chromium can keep the last HUD node as the pointer target.
    // Trust Webkiln's world-input bit rather than that stale trigger node.
    if (isWebkilnPointerOnWorld()) {
      dismissOpenTooltips();
      return;
    }
    if (isPointerOverTooltipTree(id)) return;
    // Close only this tooltip. A global dismiss also resets every other
    // trigger's hover state and pending show timer, so moving A → B would
    // hide A and then never open B.
    hideSharedTooltip(id);
  }, delayMs);
}

function hideSharedTooltip(id: number) {
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }
  if (activeTooltip?.id === id) {
    activeTooltip = null;
    if (!isPointerOverTooltipInteraction()) {
      skipOpenDelay = false;
    }
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
    if (!tooltipPositionerRef.current || !tooltipRef.current) {
      return;
    }
    if (!isTooltipTriggerAvailable(active.wrapperElement)) {
      hideSharedTooltip(active.id);
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
    const wrapper = active.wrapperElement;
    const hideIfTriggerGone = () => {
      if (!isTooltipTriggerAvailable(wrapper)) {
        hideSharedTooltip(active.id);
      }
    };
    hideIfTriggerGone();
    const observer = new MutationObserver(hideIfTriggerGone);
    let node: HTMLElement | null = wrapper;
    while (node) {
      observer.observe(node, { attributes: true, attributeFilter: ['aria-hidden', 'class', 'style'] });
      node = node.parentElement;
    }
    return () => observer.disconnect();
  }, [active.id, active.wrapperElement]);

  useEffect(() => {
    schedulePlacement();
    const target = tooltipRef.current;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && target) {
      observer = new ResizeObserver(schedulePlacement);
      observer.observe(target);
    }
    // Reposition on viewport/layout changes only. Mousemove placement hides the
    // bubble while measuring and collapses nested tooltip chains.
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
        onMouseLeave={() => {
          if (!active.controlled) {
            scheduleSharedTooltipHide(active.id, HIDE_GRACE_MS);
          }
        }}
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

function handleTooltipPointerEvent(event: Event) {
  lastPointerNode = event.target;
  if (!activeTooltip && !tooltipHideTimer && !isPointerOverTooltipInteraction()) {
    skipOpenDelay = false;
  }
  const active = activeTooltip;
  if (!active || active.controlled) return;

  const inTree = isNodeInTooltipTree(
    active.id,
    event.target,
    active.wrapperElement,
    active.anchorElement,
  );

  if (event.type === 'pointerdown' || event.type === 'mousedown') {
    if (!inTree) dismissOpenTooltips();
    return;
  }

  if (inTree) {
    cancelSharedTooltipHide(active.id);
    return;
  }

  scheduleSharedTooltipHide(active.id, HIDE_GRACE_MS);
}

function TooltipHost() {
  const [active, setActive] = useState<ActiveTooltip | null>(activeTooltip);

  useEffect(() => subscribeTooltip(setActive), []);

  useEffect(() => {
    const onLeaveDocument = (event: Event) => {
      if ('relatedTarget' in event && event.relatedTarget) return;
      dismissOpenTooltips();
    };
    document.addEventListener('pointermove', handleTooltipPointerEvent, true);
    document.addEventListener('pointerover', handleTooltipPointerEvent, true);
    document.addEventListener('pointerdown', handleTooltipPointerEvent, true);
    document.addEventListener('mouseleave', onLeaveDocument);
    window.addEventListener('blur', onLeaveDocument);
    return () => {
      document.removeEventListener('pointermove', handleTooltipPointerEvent, true);
      document.removeEventListener('pointerover', handleTooltipPointerEvent, true);
      document.removeEventListener('pointerdown', handleTooltipPointerEvent, true);
      document.removeEventListener('mouseleave', onLeaveDocument);
      window.removeEventListener('blur', onLeaveDocument);
    };
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    let frame = 0;
    const step = () => {
      frame = requestAnimationFrame(step);
      if (!activeTooltip || activeTooltip.id !== active.id || activeTooltip.controlled) return;
      if (isPointerOverTooltipSurface(activeTooltip.id)) return;
      if (!isWebkilnPointerOnWorld()) return;
      scheduleSharedTooltipHide(activeTooltip.id, HIDE_GRACE_MS);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) {
    return null;
  }

  return createPortal(<TooltipHostContent key={active.id} active={active} />, document.body);
}

function toNestedTooltipContent(content: React.ReactNode | TooltipContent): TooltipContent {
  if (isTooltipContent(content)) return content;
  if (content === null || content === undefined || content === false) return {};
  if (typeof content === 'string' || typeof content === 'number') {
    return { body: String(content) };
  }
  return { afterLines: content };
}

function NestedFromSharedTooltip({
  content,
  children,
  delay,
  variant = 'default',
  bubbleClassName,
  inline = false,
  disabled = false,
  onShowIntent,
  wrapperClassName,
  wrapperStyle,
}: TooltipProps) {
  const nestedClass = [variant === 'sidebar' ? 'tt-bubble--sidebar' : '', bubbleClassName]
    .filter(Boolean)
    .join(' ');
  return (
    <NestedTooltip
      content={toNestedTooltipContent(content)}
      delay={delay ?? 180}
      inline={inline}
      disabled={disabled}
      wrapperClassName={wrapperClassName}
      wrapperStyle={wrapperStyle}
      bubbleClassName={nestedClass || undefined}
      onShowIntent={onShowIntent}
    >
      {children}
    </NestedTooltip>
  );
}

/** Tooltip that usually portals to the document root to escape stacking contexts. */
const SharedTooltip: React.FC<TooltipProps> = ({
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
  const focusedRef = useRef(false);
  const pointerDismissedRef = useRef(false);
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
    controlled,
  }), [anchorRef, bubbleClassName, content, controlled, position, variant]);
  const buildActiveTooltipRef = useRef(buildActiveTooltip);

  useLayoutEffect(() => {
    buildActiveTooltipRef.current = buildActiveTooltip;
  }, [buildActiveTooltip]);

  const scheduleShow = useCallback((delayMs: number) => {
    if (showRef.current) clearTimeout(showRef.current);
    showRef.current = setTimeout(() => {
      showRef.current = null;
      const wrapper = wrapperRef.current;
      if (!disabledRef.current && (hoveredRef.current || focusedRef.current) && wrapper) {
        showSharedTooltip(buildActiveTooltipRef.current(wrapper));
      }
    }, delayMs);
  }, []);

  const beginShow = useCallback((source: 'hover' | 'focus') => {
    const alreadyActive = hoveredRef.current || focusedRef.current;
    if (!alreadyActive) {
      onShowIntentRef.current?.();
      hoverStartedAtRef.current = Date.now();
    }
    if (source === 'hover') hoveredRef.current = true;
    else focusedRef.current = true;
    cancelSharedTooltipHide(tooltipIdRef.current);
    if (disabledRef.current) return;
    // Controlled `open` re-renders must not re-fire showIntent or re-schedule
    // the open delay once this tooltip is already active or pending.
    if (alreadyActive && activeTooltip?.id === tooltipIdRef.current) {
      return;
    }
    if (alreadyActive && showRef.current) {
      return;
    }
    const wrapper = wrapperRef.current;
    if (skipOpenDelay && wrapper) {
      if (showRef.current) {
        clearTimeout(showRef.current);
        showRef.current = null;
      }
      showSharedTooltip(buildActiveTooltipRef.current(wrapper));
      return;
    }
    scheduleShow(alreadyActive ? 0 : effectiveDelay);
  }, [effectiveDelay, scheduleShow]);

  const show = useCallback(() => {
    pointerDismissedRef.current = false;
    if (!controlled) beginShow('hover');
  }, [beginShow, controlled]);

  const showFromFocus = useCallback(() => {
    if (pointerDismissedRef.current) return;
    if (!controlled) beginShow('focus');
  }, [beginShow, controlled]);

  const finishHide = useCallback(() => {
    if (hoveredRef.current) return;
    if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
    scheduleSharedTooltipHide(tooltipIdRef.current, HIDE_GRACE_MS);
  }, []);

  const hide = useCallback(() => {
    hoveredRef.current = false;
    finishHide();
  }, [finishHide]);

  const hideFromFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    pointerDismissedRef.current = false;
    focusedRef.current = false;
    finishHide();
  }, [finishHide]);

  const forceHide = useCallback(() => {
    hoveredRef.current = false;
    focusedRef.current = false;
    if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
    hideSharedTooltip(tooltipIdRef.current);
  }, []);

  useEffect(() => {
    if (!controlled) return;
    if (open) beginShow('hover');
    else forceHide();
  }, [beginShow, controlled, forceHide, open]);

  const dismissOpenState = useCallback(() => {
    hoveredRef.current = false;
    focusedRef.current = false;
    cancelTimers();
    hideSharedTooltip(tooltipIdRef.current);
  }, [cancelTimers]);

  const dismissForPress = useCallback(() => {
    pointerDismissedRef.current = true;
    dismissOpenState();
  }, [dismissOpenState]);

  useEffect(() => {
    if (disabled) {
      if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
      hideSharedTooltip(tooltipIdRef.current);
      return;
    }

    if ((hoveredRef.current || focusedRef.current) && activeTooltip?.id !== tooltipIdRef.current && !showRef.current) {
      const elapsed = Date.now() - hoverStartedAtRef.current;
      scheduleShow(skipOpenDelay ? 0 : Math.max(0, effectiveDelay - elapsed));
    }
  }, [disabled, effectiveDelay, scheduleShow]);

  useEffect(() => {
    // Keep the open portal in sync when content changes. Native glance tooltips
    // start empty while a bridge fetch is in flight; if the delay fires first,
    // showSharedTooltip hides them. Re-schedule once content exists so hover
    // that is already past the delay still opens on the HUD.
    const wrapper = wrapperRef.current;
    if (!wrapper || disabledRef.current) {
      return;
    }

    const next = buildActiveTooltip(wrapper);
    if (!hasTooltipContent(next.content)) {
      if (activeTooltip?.id === tooltipIdRef.current) {
        hideSharedTooltip(tooltipIdRef.current);
      }
      return;
    }

    if (activeTooltip?.id === tooltipIdRef.current) {
      updateSharedTooltip(next);
      return;
    }

    if (hoveredRef.current || focusedRef.current) {
      const elapsed = Date.now() - hoverStartedAtRef.current;
      scheduleShow(skipOpenDelay ? 0 : Math.max(0, effectiveDelay - elapsed));
    }
  }, [buildActiveTooltip, effectiveDelay, scheduleShow]);

  useEffect(() => {
    const tooltipId = tooltipIdRef.current;
    return () => {
      cancelTimers();
      hideSharedTooltip(tooltipId);
    };
  }, [cancelTimers]);

  useEffect(() => subscribeTooltipDismissEvent(dismissOpenState), [dismissOpenState]);

  return (
    <>
      {inline ? (
        <span
          ref={setWrapperRef}
          className={`tooltip-wrapper-inline${wrapperClassName ? ` ${wrapperClassName}` : ''}`}
          style={wrapperStyle}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocusCapture={showFromFocus}
          onBlurCapture={hideFromFocus}
          onPointerDownCapture={dismissForPress}
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
          onFocusCapture={showFromFocus}
          onBlurCapture={hideFromFocus}
          onPointerDownCapture={dismissForPress}
          onMouseDownCapture={dismissForPress}
        >
          {children}
        </div>
      )}
    </>
  );
};

const Tooltip: React.FC<TooltipProps> = (props) => {
  const nesting = useContext(TooltipNestingContext);
  if (nesting && props.open === undefined) {
    return <NestedFromSharedTooltip {...props} />;
  }
  return <SharedTooltip {...props} />;
};

export default Tooltip;
export { TooltipHost };
export { NestedTooltip };
export type { TooltipContent, TooltipLine };
