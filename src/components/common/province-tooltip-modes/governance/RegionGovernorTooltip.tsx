import { ModeRow, ModeRows } from '../shared/ModeLayout';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function RegionGovernorTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label="Governor:"
        value={data.governorName || 'No governor'}
        tone={data.governorName ? undefined : 'negative'}
      />
      <ModeRow label="Region:" value={data.regionName || 'Unassigned'} tone={data.regionName ? undefined : 'muted'} />
    </ModeRows>
  );
}
