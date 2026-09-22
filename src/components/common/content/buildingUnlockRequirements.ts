import type { WebUITextFormatter } from '../../../localization/WebUITextContext';
import type { TooltipLine } from '../tooltips/Tooltip';
import { appendTooltipSection } from '../tooltips/tooltipSections.ts';

export function appendBuildingUnlockRequirements(
  lines: TooltipLine[],
  building: {
    religionName?: string;
    religionIcon?: string;
    requiredSettlementName?: string;
  },
  t: WebUITextFormatter,
) {
  if (building.religionName) {
    lines.push({
      label: t('Encyclopedia.Faith'),
      value: building.religionName,
      labelIcon: building.religionIcon,
    });
  }
  const requirements: TooltipLine[] = [];
  if (building.religionName) {
    requirements.push({ label: t('Encyclopedia.FaithRequirement') });
  }
  if (building.requiredSettlementName) {
    requirements.push({
      label: t('Encyclopedia.RequiredSettlement', { Name: building.requiredSettlementName }),
    });
  }
  appendTooltipSection(lines, t('Common.Requirements'), requirements);
}
