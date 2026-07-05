import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { signedNumber, signedTone } from '../shared/format';
import type { ProvinceTooltipModeData } from '../shared/types';

function complianceState(value: number): string {
  if (value < -30) return 'Defiant';
  if (value < -10) return 'Unreliable';
  if (value < 10) return 'Unsettled';
  return 'Compliant';
}

export default function ComplianceTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const targetName = data.complianceTargetName || (data.complianceTargetIsRuler ? 'No ruler' : 'No governor');
  const targetLabel = data.complianceTargetLabel || (data.complianceTargetIsRuler ? 'Province Ruler:' : 'Governor:');
  const luxuryLabel = data.complianceLuxuryLabel || 'Luxuries:';

  return (
    <ModeRows>
      <ModeRow label={targetLabel} value={targetName} tone={data.complianceTargetName ? undefined : 'muted'} />
      <ModeRow label="Compliance:" value={signedNumber(data.loyalty)} tone={signedTone(data.loyalty)} />
      <ModeRow label="State:" value={complianceState(data.loyalty)} tone={signedTone(data.loyalty)} />
      <ModeRow label={luxuryLabel} value={data.complianceLuxuryStatus} tone="negative" />
    </ModeRows>
  );
}
