import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function RegionGovernorTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.GovernorLabel')}
        value={data.governorName || webUIText('ProvinceTooltip.NoGovernor')}
        tone={data.governorName ? undefined : 'negative'}
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.RegionLabel')}
        value={data.regionName || webUIText('ProvinceTooltip.Unassigned')}
        tone={data.regionName ? undefined : 'muted'}
      />
    </ModeRows>
  );
}
