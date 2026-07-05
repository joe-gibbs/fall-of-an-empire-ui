import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber, percentInteger } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function MilitaryTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Garrison:" value={compactNumber(data.garrison)} icon="/assets/icons/I_ArmiesQuickButton.png" />
      <ModeRow label="Fortification:" value={percentInteger(data.fortification / 100)} />
      {data.besieged && <ModeRow label="Siege:" value={percentInteger(data.siegeProgress)} tone="negative" icon="/assets/icons/I_Siege.png" />}
    </ModeRows>
  );
}
