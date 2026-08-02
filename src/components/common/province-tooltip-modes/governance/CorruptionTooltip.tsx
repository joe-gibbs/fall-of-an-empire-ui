import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { percentInteger, riskTone } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function corruptionState(value: number): string {
  if (value >= 0.75) return webUIText('ProvinceTooltip.Corruption.Rampant');
  if (value >= 0.5) return webUIText('ProvinceTooltip.Corruption.High');
  if (value >= 0.25) return webUIText('ProvinceTooltip.Corruption.Moderate');
  return webUIText('ProvinceTooltip.Corruption.Low');
}

export default function CorruptionTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.CorruptionLabel')}
        value={percentInteger(data.corruption)}
        tone={riskTone(data.corruption)}
        icon="/assets/traits/Corrupt.png"
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.StateLabel')}
        value={corruptionState(data.corruption)}
        tone={riskTone(data.corruption)}
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.GovernorLabel')}
        value={data.governorName || webUIText('ProvinceTooltip.NoGovernor')}
        tone={data.governorName ? undefined : 'negative'}
      />
    </ModeRows>
  );
}
