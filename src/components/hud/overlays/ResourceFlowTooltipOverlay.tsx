import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { GetResourceFlowHoverResponse } from '../../../bridge-types.generated.ts';
import { useResourceFlowHoverBridge } from '../../../bridge/military-map/useResourceFlowHoverBridge';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../../utils/assets';
import { formatResourceNumber } from '../../../utils/numberFormat';
import './ProvinceTooltipOverlay.css';
import './ResourceFlowTooltipOverlay.css';

const OFFSET = 24;
const VIEWPORT_PADDING = 8;

function FlowRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="province-tooltip-mode-row">
      <span className="province-tooltip-mode-label">{label}</span>
      <span className="province-tooltip-mode-value">{value}</span>
    </div>
  );
}

function useCursorPlacement(hover: GetResourceFlowHoverResponse | null) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const place = useCallback((screenX: number, screenY: number) => {
    const element = tooltipRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - bounds.width - VIEWPORT_PADDING);
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - bounds.height - VIEWPORT_PADDING);
    const left = screenX + OFFSET + bounds.width > window.innerWidth
      ? screenX - OFFSET - bounds.width
      : screenX + OFFSET;
    const top = screenY + OFFSET + bounds.height > window.innerHeight
      ? screenY - OFFSET - bounds.height
      : screenY + OFFSET;
    element.style.left = `${Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft))}px`;
    element.style.top = `${Math.max(VIEWPORT_PADDING, Math.min(top, maxTop))}px`;
    element.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (hover?.visible) {
      place(
        hover.screenX / window.devicePixelRatio,
        hover.screenY / window.devicePixelRatio,
      );
    }
  }, [hover, place]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => place(event.clientX, event.clientY);
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [place]);

  return tooltipRef;
}

export default function ResourceFlowTooltipOverlay() {
  const hover = useResourceFlowHoverBridge();
  const tooltipRef = useCursorPlacement(hover);
  const t = useWebUIText();

  if (!hover?.visible) return null;

  const amount = formatResourceNumber(hover.monthlyAmount);
  const shipment = formatResourceNumber(hover.nextShipmentAmount);
  const resourceIcon = WebkilnAssetPath(hover.resourceIcon);

  return (
    <div className="resource-flow-tooltip-overlay" aria-hidden="true">
      <div ref={tooltipRef} className="resource-flow-tooltip">
        <div className="resource-flow-tooltip__card">
          <div className="resource-flow-tooltip__heading">
            {resourceIcon && <img src={resourceIcon} alt="" />}
            <span style={{ color: hover.colour }}>{hover.resourceName}</span>
          </div>
          <div className="province-tooltip-mode-rows resource-flow-tooltip__rows">
            <FlowRow label={t('ResourceFlow.Origin')} value={hover.originName} />
            <FlowRow label={t('ResourceFlow.Destination')} value={hover.destinationName} />
            <FlowRow label={t('ResourceFlow.Role')} value={hover.flowRole} />
            <FlowRow label={t('ResourceFlow.ProjectedFlow')} value={t('ResourceFlow.PerMonth', { Amount: amount })} />
            <FlowRow label={t('ResourceFlow.NextShipment')} value={shipment} />
            <FlowRow label={t('ResourceFlow.Dispatch')} value={t('ResourceFlow.InDays', { Days: hover.dispatchDays })} />
            <FlowRow label={t('ResourceFlow.Arrival')} value={t('ResourceFlow.InDays', { Days: hover.arrivalDays })} />
            <FlowRow label={t('ResourceFlow.Purpose')} value={hover.purpose} />
          </div>
          {hover.purposeDetails && <div className="resource-flow-tooltip__note">{hover.purposeDetails}</div>}
        </div>
      </div>
    </div>
  );
}
