import type { SettlementGlanceData } from './WorldGlanceTypes';
import { webUIText } from '../../localization/WebUITextContext';
import { formatNumber } from '../../utils/numberFormat';
import { WebkilnAssetPath } from '../../utils/assets';
import './PeaceSettlementGlance.css';

export default function PeaceSettlementGlance({ data, typeIcon, debugMode }: {
  data: SettlementGlanceData;
  typeIcon: string;
  debugMode: boolean;
}) {
  const direction = data.peaceConcession ? 'concession' : 'demand';
  return (
    <div className={`glance glance--settlement glance--peace-pick peace-pick--${direction}${data.selected ? ' is-selected' : ''}`}>
      {debugMode && data.debugShortId !== undefined && <div className="glance-debug-id">#{formatNumber(data.debugShortId)}</div>}
      <span className="peace-pick-type">
        <img
          className={data.selected ? 'peace-pick-check' : undefined}
          src={WebkilnAssetPath(data.selected ? '/assets/ui/I_TickIcon.png' : typeIcon)}
          alt=""
        />
      </span>
      <span className="peace-pick-name">{data.name}</span>
      <span className="peace-pick-cost" aria-label={webUIText('PeaceNegotiation.GlanceWarScore')}>
        {data.peaceConcession ? '−' : '+'}{formatNumber(data.warScoreCost)}
      </span>
    </div>
  );
}
