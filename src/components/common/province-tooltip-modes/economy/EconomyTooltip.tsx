import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { percentInteger, signedNumber } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function EconomyTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label="Monthly income:"
        value={signedNumber(data.monthlyIncome)}
        tone={data.monthlyIncome >= 0 ? 'positive' : 'negative'}
        icon="/assets/icons/I_Coins.png"
      />
      <ModeRow
        label="Construction:"
        value={data.hasBuilding && data.building ? `${data.building.label} ${percentInteger(data.building.progress)}` : 'No construction'}
        tone={data.hasBuilding ? 'warning' : 'muted'}
      />
    </ModeRows>
  );
}
