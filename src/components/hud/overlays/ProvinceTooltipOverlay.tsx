import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import type { GetProvinceTooltipResponse } from '../../../bridge-types.generated.ts';
import { useProvinceTooltipBridge } from '../../../bridge/provinces/useProvinceTooltipBridge';
import { WebkilnAssetPath } from '../../../utils/assets';
import { toRootRem } from '../../../utils/cssUnits';
import { formatNumber } from '../../../utils/numberFormat';
import ProvinceTooltipModeRenderer from '../../common/province-tooltip-modes/shared/ProvinceTooltipModeRenderer';
import { provinceTooltipDataFromResponse } from '../../common/province-tooltip-modes/shared/types';
import './ProvinceTooltipOverlay.css';

const TOOLTIP_OFFSET_X = 24;
const TOOLTIP_OFFSET_Y = 24;
const VIEWPORT_PAD = 8;

interface TooltipPosition {
  screenX: number;
  screenY: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface Size {
  width: number;
  height: number;
}

function baseTooltipClass(tooltip: GetProvinceTooltipResponse): string {
  return [
    'province-tooltip',
    tooltip.expanded ? 'province-tooltip--expanded' : 'province-tooltip--compact',
    shouldShowTerrainIcon(tooltip) ? '' : 'province-tooltip--no-terrain-icon',
  ].filter(Boolean).join(' ');
}

function tooltipStyle(position: TooltipPosition): CSSProperties {
  return {
    left: toRootRem(position.screenX + TOOLTIP_OFFSET_X),
    top: toRootRem(position.screenY + TOOLTIP_OFFSET_Y),
    visibility: 'hidden',
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

function viewportLimit(size: number): number {
  return Math.max(1, size - VIEWPORT_PAD * 2);
}

function elementSize(element: HTMLElement): Size {
  const offsetWidth = element.offsetWidth;
  const offsetHeight = element.offsetHeight;
  const scrollWidth = element.scrollWidth;
  const scrollHeight = element.scrollHeight;
  if (offsetWidth > 0 && offsetHeight > 0) {
    return {
      width: Math.max(offsetWidth, scrollWidth),
      height: Math.max(offsetHeight, scrollHeight),
    };
  }

  const bounds = element.getBoundingClientRect();
  const boundsWidth = bounds.width > 0 ? bounds.width : Math.max(0, bounds.right - bounds.left);
  const boundsHeight = bounds.height > 0 ? bounds.height : Math.max(0, bounds.bottom - bounds.top);
  return {
    width: boundsWidth || offsetWidth || scrollWidth,
    height: boundsHeight || offsetHeight || scrollHeight,
  };
}

function clearTooltipExplicitHeights(element: HTMLElement) {
  element.style.height = '';

  const card = element.firstElementChild;
  if (card instanceof HTMLElement && card.classList.contains('province-tooltip-card')) {
    card.style.height = '';
  }
}

function applyTooltipPlacement(
  element: HTMLDivElement,
  position: TooltipPosition,
): boolean {
  const width = position.viewportWidth || viewportWidth();
  const height = position.viewportHeight || viewportHeight();
  if (width <= 0 || height <= 0) {
    return false;
  }

  const maxWidth = viewportLimit(width);
  const maxHeight = viewportLimit(height);

  element.style.maxWidth = '';
  element.style.maxHeight = '';
  element.style.overflowY = '';
  clearTooltipExplicitHeights(element);

  let tooltipSize = elementSize(element);

  if (tooltipSize.width > maxWidth) {
    element.style.maxWidth = toRootRem(maxWidth);
    tooltipSize = elementSize(element);
  }

  if (tooltipSize.height > maxHeight) {
    element.style.maxHeight = toRootRem(maxHeight);
    element.style.overflowY = 'auto';
    tooltipSize = elementSize(element);
  }

  const tooltipWidth = tooltipSize.width;
  const tooltipHeight = tooltipSize.height;
  if (tooltipWidth <= 0 || tooltipHeight <= 0) {
    return false;
  }

  let left = position.screenX + TOOLTIP_OFFSET_X;
  let top = position.screenY + TOOLTIP_OFFSET_Y;

  if (left + tooltipWidth > width - VIEWPORT_PAD) {
    left = position.screenX - TOOLTIP_OFFSET_X - tooltipWidth;
  }

  if (top + tooltipHeight > height - VIEWPORT_PAD) {
    top = position.screenY - TOOLTIP_OFFSET_Y - tooltipHeight;
  }

  element.style.left = toRootRem(clamp(left, VIEWPORT_PAD, width - tooltipWidth - VIEWPORT_PAD));
  element.style.top = toRootRem(clamp(top, VIEWPORT_PAD, height - tooltipHeight - VIEWPORT_PAD));
  element.style.visibility = 'visible';
  return true;
}

function viewportWidth(): number {
  return typeof window !== 'undefined'
    ? window.innerWidth || document.documentElement.clientWidth || 0
    : 0;
}

function viewportHeight(): number {
  return typeof window !== 'undefined'
    ? window.innerHeight || document.documentElement.clientHeight || 0
    : 0;
}

function fallbackPosition(tooltip: GetProvinceTooltipResponse | null): TooltipPosition {
  return {
    screenX: tooltip?.screenX ?? 0,
    screenY: tooltip?.screenY ?? 0,
    viewportWidth: viewportWidth() || tooltip?.viewportWidth || 0,
    viewportHeight: viewportHeight() || tooltip?.viewportHeight || 0,
  };
}

function useWebkilnCursorPlacement(tooltip: GetProvinceTooltipResponse | null) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const currentTooltipRef = useRef<GetProvinceTooltipResponse | null>(tooltip);
  const lastPositionRef = useRef<TooltipPosition | null>(null);
  const placementFrameRef = useRef<number | null>(null);
  const placementRetryFrameRef = useRef<number | null>(null);

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

  const queuePlacement = useCallback((position: TooltipPosition) => {
    cancelPlacementFrames();
    placementFrameRef.current = requestAnimationFrame(() => {
      placementFrameRef.current = null;
      const element = tooltipRef.current;
      const currentTooltip = currentTooltipRef.current;
      if (element && currentTooltip) {
        applyTooltipPlacement(element, position);
      }

      placementRetryFrameRef.current = requestAnimationFrame(() => {
        placementRetryFrameRef.current = null;
        const retryElement = tooltipRef.current;
        const retryTooltip = currentTooltipRef.current;
        if (retryElement && retryTooltip) {
          applyTooltipPlacement(retryElement, position);
        }
      });
    });
  }, [cancelPlacementFrames]);

  useLayoutEffect(() => {
    currentTooltipRef.current = tooltip;

    const element = tooltipRef.current;
    if (element && tooltip) {
      const position = lastPositionRef.current ?? fallbackPosition(tooltip);
      applyTooltipPlacement(element, position);
      queuePlacement(position);
    }
  }, [tooltip, queuePlacement]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const next = {
        screenX: event.clientX,
        screenY: event.clientY,
        viewportWidth: viewportWidth(),
        viewportHeight: viewportHeight(),
      };
      const element = tooltipRef.current;
      const currentTooltip = currentTooltipRef.current;
      lastPositionRef.current = next;

      if (element && currentTooltip) {
        const placed = applyTooltipPlacement(element, next);
        if (!placed) {
          queuePlacement(next);
        } else {
          cancelPlacementFrames();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [queuePlacement, cancelPlacementFrames]);

  useEffect(() => cancelPlacementFrames, [cancelPlacementFrames]);

  return tooltipRef;
}

function TerrainIcon({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  const terrainIcon = WebkilnAssetPath(tooltip.terrainIcon);

  return (
    <div className="province-tooltip-icon-frame">
      <img
        className="province-tooltip-terrain-icon"
        src={terrainIcon}
        alt={tooltip.terrainName || tooltip.terrainType}
      />
    </div>
  );
}

function TerrainSummary({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  const attritionIcon = WebkilnAssetPath(tooltip.attritionIcon);

  return (
    <div className="province-tooltip-terrain-line">
      <span className="province-tooltip-terrain-name">{tooltip.terrainName}</span>
      {attritionIcon && (
        <img
          className="province-tooltip-attrition-icon"
          src={attritionIcon}
          alt=""
        />
      )}
    </div>
  );
}

function isLandscapeMode(tooltip: GetProvinceTooltipResponse): boolean {
  return tooltip.mapModeId === 'landscape';
}

function hasMapModeContent(tooltip: GetProvinceTooltipResponse): boolean {
  return tooltip.kind === 'settlement' && tooltip.mapModeId.length > 0 && !isLandscapeMode(tooltip);
}

function shouldShowTerrainInfo(tooltip: GetProvinceTooltipResponse): boolean {
  if (tooltip.kind === 'convoy') {
    return false;
  }

  if (tooltip.kind !== 'settlement') {
    return true;
  }

  return !hasMapModeContent(tooltip) || isLandscapeMode(tooltip);
}

function shouldShowTerrainIcon(tooltip: GetProvinceTooltipResponse): boolean {
  return !tooltip.expanded || shouldShowTerrainInfo(tooltip);
}

function MapModeContent({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  if (!hasMapModeContent(tooltip)) {
    return null;
  }

  return (
    <div className="province-tooltip-map-mode-content">
      <ProvinceTooltipModeRenderer data={provinceTooltipDataFromResponse(tooltip)} />
    </div>
  );
}

function SettlementMapModeDetails({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  return (
    <div className="province-tooltip-details">
      <div className="province-tooltip-title">{tooltip.settlementName}</div>
      {shouldShowTerrainInfo(tooltip) && <TerrainSummary tooltip={tooltip} />}
      <MapModeContent tooltip={tooltip} />
    </div>
  );
}

function SettlementDetails({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  if (hasMapModeContent(tooltip)) {
    return <SettlementMapModeDetails tooltip={tooltip} />;
  }

  return (
    <div className="province-tooltip-details">
      <div className="province-tooltip-title">{tooltip.settlementName}</div>
      <TerrainSummary tooltip={tooltip} />
    </div>
  );
}

function LandingDetails({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  return (
    <div className="province-tooltip-details">
      <div className="province-tooltip-title">{tooltip.landingTitle}</div>
      <TerrainSummary tooltip={tooltip} />
      {tooltip.landingInstruction && (
        <div className="province-tooltip-action">{tooltip.landingInstruction}</div>
      )}
    </div>
  );
}

function ConvoyRow({ label, value }: { label: string; value: string }) {
  if (!label || !value) {
    return null;
  }

  return (
    <div className="province-tooltip-mode-row">
      <span className="province-tooltip-mode-label">{label}</span>
      <span className="province-tooltip-mode-value">{value}</span>
    </div>
  );
}

function ConvoyDetails({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  const cargo = tooltip.convoyCargo ?? [];

  return (
    <div className="province-tooltip-details province-tooltip-details--convoy">
      <div className="province-tooltip-title">{tooltip.convoyTitle}</div>
      <div className="province-tooltip-mode-rows province-tooltip-convoy-rows">
        {tooltip.hasFaction && (
          <ConvoyRow label={tooltip.convoyFactionLabel} value={tooltip.faction.name} />
        )}
        <ConvoyRow label={tooltip.convoyPurposeLabel} value={tooltip.convoyPurpose} />
        <ConvoyRow label={tooltip.convoyRouteLabel} value={tooltip.convoyRoute} />
        <ConvoyRow label={tooltip.convoyOriginLabel} value={tooltip.convoyOrigin} />
        <ConvoyRow label={tooltip.convoyDestinationLabel} value={tooltip.convoyDestination} />
        <ConvoyRow label={tooltip.convoyProgressLabel} value={tooltip.convoyProgress} />
        <ConvoyRow label={tooltip.convoyEtaLabel} value={tooltip.convoyEta} />
      </div>
      {tooltip.convoyPurposeDetails && (
        <div className="province-tooltip-convoy-note">{tooltip.convoyPurposeDetails}</div>
      )}
      {cargo.length > 0 && (
        <div className="province-tooltip-convoy-cargo">
          <div className="province-tooltip-section-label">{tooltip.convoyCargoLabel}</div>
          <div className="province-tooltip-mode-rows">
            {cargo.map((item, index) => (
              <div key={`${item.label}:${String(index)}`} className="province-tooltip-mode-row">
                {item.icon && <img className="province-tooltip-mode-icon" src={WebkilnAssetPath(item.icon)} alt="" />}
                <span className="province-tooltip-mode-label">{item.label}</span>
                <span className="province-tooltip-mode-value">{formatNumber(item.amount, { maximumFractionDigits: 1 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TerrainDetails({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  return (
    <div className="province-tooltip-details province-tooltip-details--terrain">
      <TerrainSummary tooltip={tooltip} />
    </div>
  );
}

function ExpandedDetails({ tooltip }: { tooltip: GetProvinceTooltipResponse }) {
  if (!tooltip.expanded) {
    return null;
  }

  if (tooltip.kind === 'settlement') {
    return <SettlementDetails tooltip={tooltip} />;
  }

  if (tooltip.kind === 'landing') {
    return <LandingDetails tooltip={tooltip} />;
  }

  if (tooltip.kind === 'convoy') {
    return <ConvoyDetails tooltip={tooltip} />;
  }

  return <TerrainDetails tooltip={tooltip} />;
}

export default function ProvinceTooltipOverlay() {
  const tooltip = useProvinceTooltipBridge();
  const tooltipRef = useWebkilnCursorPlacement(tooltip);

  if (!tooltip || !tooltip.visible) {
    return null;
  }

  if (shouldShowTerrainIcon(tooltip) && !tooltip.terrainIcon) {
    return null;
  }

  const initialPosition = fallbackPosition(tooltip);

  return (
    <div className="province-tooltip-overlay" aria-hidden="true">
      <div ref={tooltipRef} className={baseTooltipClass(tooltip)} style={tooltipStyle(initialPosition)}>
        <div className="province-tooltip-card">
          {shouldShowTerrainIcon(tooltip) && <TerrainIcon tooltip={tooltip} />}
          <ExpandedDetails tooltip={tooltip} />
        </div>
      </div>
    </div>
  );
}
