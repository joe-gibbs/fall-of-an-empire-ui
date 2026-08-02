import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function GarrisonsTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const units = Math.max(0, Math.round(data.garrison / 100));

  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.GarrisonStrengthLabel')}
        value={compactNumber(data.garrison)}
        icon="/assets/icons/I_ArmiesQuickButton.png"
      />
      <ModeRow label={webUIText('ProvinceTooltip.UnitsLabel')} value={compactNumber(units)} />
    </ModeRows>
  );
}
