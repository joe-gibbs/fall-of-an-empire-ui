import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function statusValue(data: ProvinceTooltipModeData): string {
  if (data.faction.isRebel) return webUIText('Ledger.Status.Rebel');
  return data.independent
    ? webUIText('Auto.ComponentsBottombarMapModeTooltipContent.42.20')
    : webUIText('Ledger.Status.Subject');
}

export default function OverlordTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const controller = data.occupier ?? data.faction;

  return (
    <ModeRows>
      <ModeRow label={webUIText('ProvinceTooltip.ControllerLabel')} value={controller.name} colour={controller.colour} />
      {data.occupier && <ModeRow label={webUIText('ProvinceTooltip.OwnerLabel')} value={data.faction.name} colour={data.faction.colour} />}
      {!data.independent && <ModeRow label={webUIText('ProvinceTooltip.OverlordLabel')} value={data.overlordName} />}
      <ModeRow label={webUIText('ProvinceTooltip.StatusLabel')} value={statusValue(data)} />
    </ModeRows>
  );
}
