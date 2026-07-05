import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber, percentInteger, riskTone } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

function unrestState(value: number): string {
  if (value >= 0.6) return 'Open revolt risk';
  if (value >= 0.25) return 'Restive';
  return 'Calm';
}

export default function UnrestTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Unrest:" value={percentInteger(data.unrest)} tone={riskTone(data.unrest)} />
      <ModeRow label="State:" value={unrestState(data.unrest)} tone={riskTone(data.unrest)} />
      <ModeRow label="Garrison:" value={compactNumber(data.garrison)} />
    </ModeRows>
  );
}
