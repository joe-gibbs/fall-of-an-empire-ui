import type { CultureDevelopmentGate, GetCultureDevelopmentResponse } from '../../../bridge-types.generated';
import type { WebUITextFormatter } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat.ts';
import type { TooltipLine } from '../tooltips/Tooltip';
import { appendTooltipSection } from '../tooltips/tooltipSections.ts';

export function cultureDevelopmentTooltipLines(
  details: GetCultureDevelopmentResponse,
  t: WebUITextFormatter,
  nextUnlock?: CultureDevelopmentGate,
): TooltipLine[] {
  const effects: TooltipLine[] = [
    {
      label: t('CultureDevelopment.MonthlyGrowth'),
      value: formatSignedNumber(details.monthlyChange, { maximumFractionDigits: 3 }),
      subTooltip: { title: t('CultureDevelopment.MonthlyGrowth'), body: details.growthExplanation },
    },
    ...details.sources.map(source => ({
      label: source.name,
      value: formatSignedNumber(source.value, { maximumFractionDigits: 3 }),
      subTooltip: { title: source.name, body: source.explanation },
    })),
  ];
  const requirements: TooltipLine[] = nextUnlock ? [{
    label: nextUnlock.name,
    value: t('Culture.RequiresDevelopment', { Value: formatNumber(nextUnlock.requiredDevelopment) }),
    stacked: true,
    subTooltip: {
      title: nextUnlock.name,
      body: nextUnlock.explanation,
    },
  }] : [];
  const lines: TooltipLine[] = [];
  appendTooltipSection(lines, t('InteractionCard.Effects'), effects);
  appendTooltipSection(lines, t('Common.Requirements'), requirements);
  return lines;
}

export function cultureDevelopmentTooltipFooter(
  t: WebUITextFormatter,
  nextUnlock?: CultureDevelopmentGate,
): string | undefined {
  return nextUnlock ? undefined : t('CultureDevelopment.AllUnlocksReached');
}
