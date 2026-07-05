import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function PopulationTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Population:" value={data.populationValue || compactNumber(data.population)} />
      <ModeRow label="Type:" value={data.typeValue || data.settlementType} />
      <ModeRow label="Location:" value={data.locationValue} />
    </ModeRows>
  );
}
