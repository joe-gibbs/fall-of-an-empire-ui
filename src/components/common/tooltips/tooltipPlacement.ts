import { UI_PRESENTATION } from '../../../config/presentation.ts';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TooltipPlacement {
  side: TooltipSide;
  top: number;
  left: number;
  rect: Rect;
  overlapArea: number;
  clampDistance: number;
}

export interface SidebarPanel {
  side: 'left' | 'right';
  rect: Rect;
}

const VIEWPORT_PAD = UI_PRESENTATION.tooltip.viewportPaddingPx;
const TOOLTIP_GAP = UI_PRESENTATION.tooltip.gapPx;

export function rectFromPosition(left: number, top: number, width: number, height: number): Rect {
  return {
    top,
    right: left + width,
    bottom: top + height,
    left,
    width,
    height,
  };
}

export function unionRects(a: Rect, b: Rect): Rect {
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

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
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

export function placeTooltip(
  preferred: TooltipSide,
  trigger: Rect,
  avoid: Rect,
  ttW: number,
  ttH: number,
  vw: number,
  vh: number,
  sidebar?: SidebarPanel | null,
): TooltipPlacement {
  if (!sidebar) {
    return choosePlacement(preferred, trigger, avoid, ttW, ttH, vw, vh);
  }

  const panel = sidebar.rect;
  return choosePlacement(
    sidebar.side === 'left' ? 'right' : 'left',
    {
      top: trigger.top,
      bottom: trigger.bottom,
      height: trigger.height,
      // Horizontal bounds of the sidebar, so a compact cell still clears the panel.
      left: panel.left,
      right: panel.right,
      width: panel.width,
    },
    unionRects(avoid, panel),
    ttW,
    ttH,
    vw,
    vh,
  );
}
