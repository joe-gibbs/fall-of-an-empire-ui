import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import { formatPercent } from '../../../../utils/numberFormat';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

// Unrest arrives on a 0-100 scale.
function unrestTone(value: number): 'positive' | 'warning' | 'negative' {
  if (value < 25) return 'positive';
  if (value < 60) return 'warning';
  return 'negative';
}

function unrestState(value: number): string {
  if (value >= 60) return webUIText('ProvinceTooltip.Unrest.OpenRevolt');
  if (value >= 25) return webUIText('ProvinceTooltip.Unrest.Restive');
  return webUIText('ProvinceTooltip.Unrest.Calm');
}

export default function UnrestTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label={webUIText('ProvinceTooltip.UnrestLabel')} value={formatPercent(data.unrest, 0)} tone={unrestTone(data.unrest)} />
      <ModeRow label={webUIText('ProvinceTooltip.StateLabel')} value={unrestState(data.unrest)} tone={unrestTone(data.unrest)} />
      <ModeRow label={webUIText('ProvinceTooltip.GarrisonLabel')} value={compactNumber(data.garrison)} />
    </ModeRows>
  );
}
