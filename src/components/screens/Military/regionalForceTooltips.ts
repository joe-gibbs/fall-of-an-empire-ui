import type { RegionalForceEntry, RegionalForceSettlement } from '../../../bridge-types.generated';
import { webUIText as t } from '../../../localization/WebUITextContext';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import type { TooltipContent } from '../../common/tooltips/Tooltip';

export function settlementCapacityTooltip(settlement: RegionalForceSettlement): TooltipContent {
  return {
    title: settlement.name,
    lines: [
      { label: t('RegionalForces.PrimaryPopulation'), value: formatNumber(settlement.population) },
      { label: t('RegionalForces.RecruitedPopulation'), value: formatNumber(settlement.committed) },
      { label: t('RegionalForces.LevyRate'), value: formatPercent(settlement.levyRate * settlement.soldiersPerPerson * 100, 2),
        subTooltip: { title: t('RegionalForces.LevyRate'), body: t('RegionalForces.LevyRateHelp') } },
      { label: t('RegionalForces.BuildingBonus'), value: `${formatSignedNumber(settlement.buildingBonus * 100)}%` },
      { label: t('RegionalForces.Capacity'), value: formatNumber(settlement.capacity),
        subTooltip: { title: t('RegionalForces.Capacity'), body: t('RegionalForces.CapacityFormula') } },
    ],
  };
}

export function regionalCapacityTooltip(region: RegionalForceEntry): TooltipContent {
  return {
    title: t('RegionalForces.Capacity'), body: t('RegionalForces.CapacityHelp'),
    lines: region.settlements.map(settlement => ({ label: settlement.name, value: formatNumber(settlement.capacity), subTooltip: settlementCapacityTooltip(settlement) })),
  };
}

export function regionalServiceTooltip(region: RegionalForceEntry): TooltipContent {
  const title = t(region.summoned ? 'RegionalForces.Recall' : 'RegionalForces.Summon');
  const reason = region.summoned ? region.recallReason : region.summonReason;
  return { title, body: t(region.summoned ? 'RegionalForces.RecallHelp' : 'RegionalForces.SummonHelp'),
    footer: reason || undefined };
}

