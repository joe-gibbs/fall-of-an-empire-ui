import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { oneDecimal } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function TradeTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const tradeTone = data.tradeValue > 0 ? 'warning' : 'muted';

  return (
    <ModeRows>
      <ModeRow label={webUIText('ProvinceTooltip.TradeValueLabel')} value={oneDecimal(data.tradeValue)} tone={tradeTone} />
      <ModeRow
        label={webUIText('ProvinceTooltip.PortLabel')}
        value={data.portStatus || webUIText('ProvinceTooltip.InlandSettlement')}
        tone={data.portStatus ? undefined : 'muted'}
      />
      <ModeRow label={webUIText('ProvinceTooltip.PopulationLabel')} value={data.populationValue} />
    </ModeRows>
  );
}
