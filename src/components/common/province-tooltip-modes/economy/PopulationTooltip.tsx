import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function PopulationTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label={webUIText('ProvinceTooltip.PopulationLabel')} value={data.populationValue || compactNumber(data.population)} />
      <ModeRow label={webUIText('ProvinceTooltip.TypeLabel')} value={data.typeValue || data.settlementType} />
      <ModeRow label={webUIText('ProvinceTooltip.LocationLabel')} value={data.locationValue} />
    </ModeRows>
  );
}
