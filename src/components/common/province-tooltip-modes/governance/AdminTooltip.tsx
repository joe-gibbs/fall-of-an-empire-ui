import { ModeRow, ModeRows } from '../shared/ModeLayout';
import type { ProvinceTooltipModeData } from '../shared/types';

function focusedTone(mapModeId: string, rowId: string): 'warning' | undefined {
  return mapModeId === rowId ? 'warning' : undefined;
}

export default function AdminTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Region:" value={data.regionName || 'Unassigned'} tone={focusedTone(data.mapModeId, 'adminRegion') || (data.regionName ? undefined : 'muted')} />
      <ModeRow label="Land:" value={data.landName || 'Unassigned'} tone={focusedTone(data.mapModeId, 'adminLand') || (data.landName ? undefined : 'muted')} />
      <ModeRow label="Domain:" value={data.domainName || 'Unassigned'} tone={focusedTone(data.mapModeId, 'adminDomain') || (data.domainName ? undefined : 'muted')} />
    </ModeRows>
  );
}
