import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function focusedTone(mapModeId: string, rowId: string): 'warning' | undefined {
  return mapModeId === rowId ? 'warning' : undefined;
}

export default function AdminTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const unassigned = webUIText('ProvinceTooltip.Unassigned');
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.RegionLabel')}
        value={data.regionName || unassigned}
        tone={focusedTone(data.mapModeId, 'adminRegion') || (data.regionName ? undefined : 'muted')}
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.LandLabel')}
        value={data.landName || unassigned}
        tone={focusedTone(data.mapModeId, 'adminLand') || (data.landName ? undefined : 'muted')}
      />
      <ModeRow
        label={webUIText('ProvinceTooltip.DomainLabel')}
        value={data.domainName || unassigned}
        tone={focusedTone(data.mapModeId, 'adminDomain') || (data.domainName ? undefined : 'muted')}
      />
    </ModeRows>
  );
}
