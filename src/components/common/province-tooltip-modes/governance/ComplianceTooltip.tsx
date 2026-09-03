import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { signedNumber, signedTone } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function complianceState(value: number): string {
  if (value < -30) return webUIText('ProvinceTooltip.Compliance.Defiant');
  if (value < -10) return webUIText('ProvinceTooltip.Compliance.Unreliable');
  if (value < 10) return webUIText('ProvinceTooltip.Compliance.Unsettled');
  return webUIText('ProvinceTooltip.Compliance.Compliant');
}

function opinionState(value: number): string {
  if (value < -60) return webUIText('ProvinceTooltip.Opinion.Hostile');
  if (value < -20) return webUIText('ProvinceTooltip.Opinion.Unfriendly');
  if (value < 20) return webUIText('ProvinceTooltip.Opinion.Neutral');
  if (value < 60) return webUIText('ProvinceTooltip.Opinion.Friendly');
  return webUIText('ProvinceTooltip.Opinion.VeryFriendly');
}

export default function ComplianceTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const targetName = data.complianceTargetName
    || (data.complianceTargetIsRuler
      ? webUIText('ProvinceTooltip.NoRuler')
      : webUIText('ProvinceTooltip.NoGovernor'));
  const targetLabel = data.complianceTargetLabel
    || (data.complianceTargetIsRuler
      ? webUIText('ProvinceTooltip.ProvinceRulerLabel')
      : webUIText('ProvinceTooltip.GovernorLabel'));
  const luxuryLabel = data.complianceLuxuryLabel || webUIText('ProvinceTooltip.LuxuriesLabel');
  const valueLabel = data.complianceUsesFactionOpinion
    ? webUIText('ProvinceTooltip.OpinionLabel')
    : webUIText('ProvinceTooltip.ComplianceLabel');
  const state = data.complianceUsesFactionOpinion
    ? opinionState(data.loyalty)
    : complianceState(data.loyalty);

  return (
    <ModeRows>
      <ModeRow label={targetLabel} value={targetName} tone={data.complianceTargetName ? undefined : 'muted'} />
      <ModeRow label={valueLabel} value={signedNumber(data.loyalty)} tone={signedTone(data.loyalty)} />
      <ModeRow label={webUIText('ProvinceTooltip.StateLabel')} value={state} tone={signedTone(data.loyalty)} />
      {!data.complianceUsesFactionOpinion && (
        <ModeRow label={luxuryLabel} value={data.complianceLuxuryStatus} tone="negative" />
      )}
    </ModeRows>
  );
}
