import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function PoliticalTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const controller = data.occupier ?? data.faction;

  return (
    <ModeRows>
      <ModeRow label={webUIText('ProvinceTooltip.ControllerLabel')} value={controller.name} colour={controller.colour} />
      {data.occupier && <ModeRow label={webUIText('ProvinceTooltip.OwnerLabel')} value={data.faction.name} colour={data.faction.colour} />}
      <ModeRow label={webUIText('ProvinceTooltip.TypeLabel')} value={data.typeValue || data.settlementType} />
      <ModeRow label={webUIText('ProvinceTooltip.PopulationLabel')} value={data.populationValue || compactNumber(data.population)} />
    </ModeRows>
  );
}
