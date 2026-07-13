import type { StatKey } from '../data/types';
import { webUIText } from '../localization/WebUITextContext';
import { formatNumber, formatPercent, formatSignedNumber } from './numberFormat';

export interface CharacterStatEffectLine {
  label: string;
  value: string;
  valueColor: string;
}

function effectColour(statValue: number): string {
  if (statValue > 0) return 'var(--green)';
  if (statValue < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function signedPercent(value: number, maximumFractionDigits = 0): string {
  const formatted = formatPercent(value, maximumFractionDigits);
  return value > 0 ? `+${formatted}` : formatted;
}

/**
 * Current mechanical consequences of a character statistic. Keep these
 * calculations aligned with PersonStats, BattleCombatSystem, DiseaseSubsystem,
 * and RegionGovernorship.
 */
export function characterStatEffectLines(stat: StatKey, value: number): CharacterStatEffectLine[] {
  const valueColor = effectColour(value);

  switch (stat) {
    case 'tactics':
      return [
        {
          label: webUIText('CharacterStats.Effect.CommandDamage'),
          value: signedPercent(value * 2),
          valueColor,
        },
        {
          label: webUIText('CharacterStats.Effect.GovernorLevyEffectiveness'),
          value: signedPercent(value * 0.2, 1),
          valueColor,
        },
      ];
    case 'authority':
      return [
        {
          label: webUIText('CharacterStats.Effect.CommandUnitsInfluenced'),
          value: formatNumber(Math.max(0, Math.floor(value / 2))),
          valueColor,
        },
        {
          label: webUIText('CharacterStats.Effect.GovernorUnrest'),
          value: signedPercent(value * -0.3, 1),
          valueColor,
        },
      ];
    case 'cunning':
      return [
        {
          label: webUIText('CharacterStats.Effect.IntrigueAptitude'),
          value: formatSignedNumber(value * 0.5, { maximumFractionDigits: 1 }),
          valueColor,
        },
        {
          label: webUIText('CharacterStats.Effect.GovernorCorruption'),
          value: signedPercent(value * -0.01, 2),
          valueColor,
        },
      ];
    case 'governance':
      return [
        {
          label: webUIText('CharacterStats.Effect.GovernorTaxIncome'),
          value: signedPercent(Math.max(-15, Math.min(15, value * 0.5)), 1),
          valueColor,
        },
        {
          label: webUIText('CharacterStats.Effect.GovernorCorruption'),
          value: signedPercent(value * -0.015, 2),
          valueColor,
        },
        {
          label: webUIText('CharacterStats.Effect.GovernedRegions'),
          value: formatNumber(Math.max(2, Math.min(10, Math.trunc(value / 10)))),
          valueColor,
        },
      ];
    case 'loyalty':
      return [
        {
          label: webUIText('CharacterStats.Effect.Compliance'),
          value: formatSignedNumber(value * 3, { maximumFractionDigits: 1 }),
          valueColor,
        },
      ];
    case 'constitution': {
      const infectionChanceChange = (Math.max(0.3, Math.min(1.2, 1 - value / 50)) - 1) * 100;
      return [
        {
          label: webUIText('CharacterStats.Effect.DiseaseInfectionChance'),
          value: signedPercent(infectionChanceChange, 1),
          valueColor,
        },
        {
          label: webUIText('CharacterStats.Effect.BattleSurvivalChance'),
          value: webUIText('CharacterStats.PercentagePoints', {
            Value: formatSignedNumber(value * 2, { maximumFractionDigits: 1 }),
          }),
          valueColor,
        },
      ];
    }
  }
}
