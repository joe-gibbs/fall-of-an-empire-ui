import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { oneDecimal } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function TradeTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const tradeTone = data.tradeValue > 0 ? 'warning' : 'muted';

  return (
    <ModeRows>
      <ModeRow label="Trade value:" value={oneDecimal(data.tradeValue)} tone={tradeTone} />
      <ModeRow label="Port:" value={data.portStatus || 'Inland settlement'} tone={data.portStatus ? undefined : 'muted'} />
      <ModeRow label="Population:" value={data.populationValue} />
    </ModeRows>
  );
}
