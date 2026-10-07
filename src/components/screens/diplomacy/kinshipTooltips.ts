import type { KinshipFeudEntry, KinshipGroupEntry, KinshipGroupMember } from '../../../bridge-types.generated';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import { warbandFameLines } from '../../common/tooltips/warbandFameTooltip';
import { webUIText as t } from '../../../localization/WebUITextContext';
import { formatNumber, formatOrdinal, formatSignedNumber } from '../../../utils/numberFormat';

export function kinshipStrengthTooltip(group: KinshipGroupEntry): TooltipContent {
  return {
    title: t('KinshipGroups.Strength'),
    lines: [
      { label: t('KinshipGroups.Warriors'), value: formatNumber(group.warriors) },
      {
        label: t('KinshipGroups.Fame'),
        value: formatNumber(group.strength - group.warriors),
        subTooltip: {
          title: t('KinshipGroups.Fame'),
          lines: group.members.filter(member => member.fame > 0).map(member => ({ label: member.name, value: formatNumber(member.fame) })),
        },
      },
    ],
  };
}

export function kinshipSuccessionTooltip(group: KinshipGroupEntry): TooltipContent {
  const rank = formatOrdinal(group.successionRank);
  return {
    title: t('Kinship.Succession'),
    body: t('Kinship.SuccessionHelp', { Head: group.headName, Rank: rank }),
  };
}

export function kinshipMusterTooltip(group: KinshipGroupEntry): TooltipContent {
  return {
    title: t('Kinship.Muster'),
    lines: [
      { label: t('Kinship.Ready'), value: formatNumber(group.availableStrength), valueColor: 'var(--green)' },
      { label: t('Kinship.Serving'), value: formatNumber(group.musteredStrength) },
      { label: t('Kinship.Refusing'), value: formatNumber(group.refusedStrength), valueColor: group.refusedStrength ? 'var(--red)' : undefined },
      ...(group.feudOpponentId ? [{
        label: t('ClanFeud.Withheld', { Clan: group.feudOpponentName }),
        value: formatNumber(group.feudWithheldStrength),
        valueColor: 'var(--red)',
        subTooltip: { title: t('ClanFeud.Withholding'), body: t('ClanFeud.MusterHelp') },
      }] : []),
    ],
  };
}

export function kinshipWarbandTooltip(member: KinshipGroupMember): TooltipContent {
  return {
    title: t('Kinship.Capacity'),
    body: t('Kinship.CapacityFormula'),
    lines: [
      { label: t('Kinship.CapacityBase'), value: formatSignedNumber(member.capacityBase) },
      { label: t('KinshipGroups.Fame'), value: formatSignedNumber(member.capacityFame) },
      { label: t('Kinship.Capacity'), value: formatNumber(member.warbandCapacity), isHeader: true },
    ],
  };
}

export function kinshipFameTooltip(member: KinshipGroupMember): TooltipContent {
  return {
    title: t('KinshipGroups.Fame'),
    lines: warbandFameLines(member.monthlyLandFame),
  };
}

export function reconciliationTooltip(feud: KinshipFeudEntry): TooltipContent {
  return {
    title: t('ClanFeud.Reconcile'),
    body: t('ClanFeud.ReconcileHelp'),
    lines: [
      { label: t('KinshipGroups.Fame'), value: formatNumber(feud.reconciliationFameCost), valueIcon: '/assets/icons/I_Fame.png' },
    ],
    footer: feud.reconcileReason,
  };
}

