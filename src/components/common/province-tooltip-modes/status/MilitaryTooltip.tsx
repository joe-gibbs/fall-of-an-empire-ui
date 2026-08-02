import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber, percentInteger } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function MilitaryTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.GarrisonLabel')}
        value={compactNumber(data.garrison)}
        icon="/assets/icons/I_ArmiesQuickButton.png"
      />
      <ModeRow label={webUIText('ProvinceTooltip.FortificationLabel')} value={percentInteger(data.fortification / 100)} />
      {data.besieged && (
        <ModeRow
          label={webUIText('ProvinceTooltip.SiegeLabel')}
          value={percentInteger(data.siegeProgress)}
          tone="negative"
          icon="/assets/icons/I_Siege.png"
        />
      )}
    </ModeRows>
  );
}
