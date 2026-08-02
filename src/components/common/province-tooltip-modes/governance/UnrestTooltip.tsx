import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber, percentInteger, riskTone } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function unrestState(value: number): string {
  if (value >= 0.6) return webUIText('ProvinceTooltip.Unrest.OpenRevolt');
  if (value >= 0.25) return webUIText('ProvinceTooltip.Unrest.Restive');
  return webUIText('ProvinceTooltip.Unrest.Calm');
}

export default function UnrestTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label={webUIText('ProvinceTooltip.UnrestLabel')} value={percentInteger(data.unrest)} tone={riskTone(data.unrest)} />
      <ModeRow label={webUIText('ProvinceTooltip.StateLabel')} value={unrestState(data.unrest)} tone={riskTone(data.unrest)} />
      <ModeRow label={webUIText('ProvinceTooltip.GarrisonLabel')} value={compactNumber(data.garrison)} />
    </ModeRows>
  );
}
