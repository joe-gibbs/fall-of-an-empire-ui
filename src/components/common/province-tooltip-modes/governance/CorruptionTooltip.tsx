import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { percentInteger, riskTone } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

function corruptionState(value: number): string {
  if (value >= 0.75) return 'Rampant';
  if (value >= 0.5) return 'High';
  if (value >= 0.25) return 'Moderate';
  return 'Low';
}

export default function CorruptionTooltip({ data }: { data: ProvinceTooltipModeData }) {
  return (
    <ModeRows>
      <ModeRow label="Corruption:" value={percentInteger(data.corruption)} tone={riskTone(data.corruption)} icon="/assets/traits/Corrupt.png" />
      <ModeRow label="State:" value={corruptionState(data.corruption)} tone={riskTone(data.corruption)} />
      <ModeRow label="Governor:" value={data.governorName || 'No governor'} tone={data.governorName ? undefined : 'negative'} />
    </ModeRows>
  );
}
