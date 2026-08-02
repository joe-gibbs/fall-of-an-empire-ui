import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { percentInteger, signedNumber } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function EconomyTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.MonthlyIncomeLabel')}
        value={signedNumber(data.monthlyIncome)}
        tone={data.monthlyIncome >= 0 ? 'positive' : 'negative'}
        icon="/assets/icons/I_Coins.png"
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.ConstructionLabel')}
        value={data.hasBuilding && data.building
          ? `${data.building.label} ${percentInteger(data.building.progress)}`
          : webUIText('ProvinceTooltip.NoConstruction')}
        tone={data.hasBuilding ? 'warning' : 'muted'}
      />
    </ModeRows>
  );
}
