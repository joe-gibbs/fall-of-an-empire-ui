import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function PoliticalTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const controller = data.occupier ?? data.faction;

  return (
    <ModeRows>
      <ModeRow label="Controller:" value={controller.name} colour={controller.colour} />
      {data.occupier && <ModeRow label="Owner:" value={data.faction.name} colour={data.faction.colour} />}
      <ModeRow label="Type:" value={data.typeValue || data.settlementType} />
      <ModeRow label="Population:" value={data.populationValue || compactNumber(data.population)} />
    </ModeRows>
  );
}
