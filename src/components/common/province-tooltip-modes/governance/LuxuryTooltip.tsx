import { ModeRow, ModeRows } from '../shared/ModeLayout';
import { compactNumber } from '../shared/format';
import { webUIText } from '../../../../localization/WebUITextContext';
import type { ProvinceTooltipModeData } from '../shared/types';

function luxuryTone(required: number, provided: number): 'positive' | 'negative' | 'muted' {
  if (required <= 0) return 'muted';
  return provided >= required ? 'positive' : 'negative';
}

function luxuryValue(data: ProvinceTooltipModeData): string {
  if (data.luxurySlotsRequired <= 0) {
    return webUIText('ProvinceTooltip.Luxury.None');
  }
  return `${compactNumber(data.luxurySlotsProvided)}/${compactNumber(data.luxurySlotsRequired)}`;
}

export default function LuxuryTooltip({ data }: { data: ProvinceTooltipModeData }) {
  const targetName = data.complianceTargetName
    || (data.complianceTargetIsRuler
      ? webUIText('ProvinceTooltip.NoRuler')
      : webUIText('ProvinceTooltip.NoGovernor'));
  const targetLabel = data.complianceTargetLabel
    || (data.complianceTargetIsRuler
      ? webUIText('ProvinceTooltip.ProvinceRulerLabel')
      : webUIText('ProvinceTooltip.GovernorLabel'));
  const luxuryLabel = data.complianceLuxuryLabel || webUIText('ProvinceTooltip.LuxuriesLabel');

  return (
    <ModeRows>
      <ModeRow label={targetLabel} value={targetName} tone={data.complianceTargetName ? undefined : 'muted'} />
      <ModeRow
        label={luxuryLabel}
        value={luxuryValue(data)}
        tone={luxuryTone(data.luxurySlotsRequired, data.luxurySlotsProvided)}
      />
      <ModeRow label={webUIText('ProvinceTooltip.StateLabel')} value={data.complianceLuxuryStatus} tone="negative" />
    </ModeRows>
  );
}
