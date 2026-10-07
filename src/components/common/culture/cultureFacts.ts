import type { CultureInfo } from '../../../bridge-types.generated';
import { formatNumber } from '../../../utils/numberFormat.ts';
import type { WebUITextFormatter } from '../../../localization/WebUITextContext';
import type { TooltipLine } from '../tooltips/Tooltip';
import { appendTooltipSection } from '../tooltips/tooltipSections.ts';

export function cultureFacts(info: CultureInfo, t: WebUITextFormatter, { includeDevelopment = true, includeSettlement = true } = {}): TooltipLine[] {
  const lines: TooltipLine[] = includeDevelopment ? [
    { label: t('CultureDevelopment.Development'), value: formatNumber(info.development, { maximumFractionDigits: 1 }) },
  ] : [];
  if (info.isHybrid) {
    lines.push({ label: t('CultureDevelopment.ParentCultures'), value: info.parentCultures.join(' + '), stacked: true });
  }
  lines.push(
    { label: t('Culture.ArmyRecruitment'), value: t(info.canRecruitArmyUnits ? 'Common.Yes' : 'Common.No') },
    { label: t('Culture.NavyRecruitment'), value: t(info.canRecruitNavyUnits ? 'Common.Yes' : 'Common.No') },
    { label: t('Auto.ComponentsCommonCultureTooltip.48.3'), value: t(info.canRecruitAsAuxiliaries ? 'Common.Yes' : 'Common.No') },
    { label: t('Culture.Patronage'), value: t(info.usesPatronage ? 'Common.Yes' : 'Common.No') },
  );
  const effects: TooltipLine[] = [];
  if (info.group === 'rephsian') {
    effects.push({
      label: t('CultureTooltip.ForeignAdministrationLabel'),
      value: t('CultureTooltip.RephsianForeignAdministration'),
      valueColor: 'var(--red)',
      stacked: true,
    });
  }
  const requirements: TooltipLine[] = [];
  if (includeSettlement) {
    requirements.push({
      label: t('Culture.RaiseSettlement'),
      value: t('Culture.RequiresDevelopment', { Value: formatNumber(info.raiseSettlementDevelopment) }),
      valueColor: info.development >= info.raiseSettlementDevelopment ? 'var(--green)' : 'var(--red)',
    });
  }
  appendTooltipSection(lines, t('InteractionCard.Effects'), effects);
  appendTooltipSection(lines, t('Common.Requirements'), requirements);
  return lines;
}
