import type { TooltipLine } from './Tooltip';
import { webUIText as t } from '../../../localization/WebUITextContext';
import { formatSignedNumber } from '../../../utils/numberFormat';

export function warbandFameLines(monthlyLandFame?: number): TooltipLine[] {
  return [
    {
      label: t('WarbandRecruitment.LandFame'),
      value: monthlyLandFame === undefined
        ? t('WarbandRecruitment.FameLandRate')
        : `${formatSignedNumber(monthlyLandFame)} ${t('Warbands.PerMonth')}`,
      subTooltip: { title: t('WarbandRecruitment.LandFame'), body: t('WarbandRecruitment.FameLandHelp') },
    },
    { label: t('WarbandRecruitment.FameVictory'), value: t('WarbandRecruitment.FameVictoryValue'), valueColor: 'var(--green)' },
    { label: t('WarbandRecruitment.FameDefeat'), value: t('WarbandRecruitment.FameDefeatValue'), valueColor: 'var(--red)' },
    { label: t('GovernmentTooltip.Raiding'), value: t('WarbandRecruitment.FameRaidValue'), valueColor: 'var(--green)' },
  ];
}
