import { ModeRow, ModeRows } from '../shared/ModeLayout';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function BishopricTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Bishop:" value={data.bishopName || 'Vacant'} tone={data.bishopName ? undefined : 'muted'} icon="/assets/icons/I_Bishop.png" />
      <ModeRow label="Religion:" value={data.religion.label} colour={data.religion.colour} />
      <ModeRow label="Land:" value={data.landName || 'Unassigned'} tone={data.landName ? undefined : 'muted'} />
    </ModeRows>
  );
}
