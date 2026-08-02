import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

export default function BishopricTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow
        label={webUIText('ProvinceTooltip.BishopLabel')}
        value={data.bishopName || webUIText('ProvinceTooltip.Vacant')}
        tone={data.bishopName ? undefined : 'muted'}
        icon="/assets/icons/I_Bishop.png"
      />
      <ModeRow label={webUIText('ProvinceTooltip.ReligionLabel')} value={data.religion.label} colour={data.religion.colour} />
      <ModeRow
        label={webUIText('ProvinceTooltip.LandLabel')}
        value={data.landName || webUIText('ProvinceTooltip.Unassigned')}
        tone={data.landName ? undefined : 'muted'}
      />
    </ModeRows>
  );
}
