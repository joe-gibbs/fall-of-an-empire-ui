import type { BattleAfterActionReportPayload } from '../bridge-types.generated.ts';
import { WebkilnAssetPath } from './assets';

export interface BattleAfterActionEnemyFaction {
  factionId?: string;
  factionName: string;
  colour?: string;
  secondaryColour?: string;
  emblem?: string;
  cultureGroup?: string;
}

export function battleAfterActionEnemyFaction(
  report: BattleAfterActionReportPayload,
): BattleAfterActionEnemyFaction {
  const side = report.enemySide;
  const fallback = (report.unitDamage ?? []).find(unit => unit.side === 'enemy');
  return {
    factionId: side.factionId || fallback?.factionId || undefined,
    factionName: side.factionName || fallback?.factionName || '',
    colour: side.factionColour || fallback?.factionColour || undefined,
    secondaryColour: side.factionSecondaryColour || fallback?.factionSecondaryColour || undefined,
    emblem: side.factionEmblem || fallback?.factionEmblem || undefined,
    cultureGroup: side.factionCultureGroup || fallback?.factionCultureGroup || undefined,
  };
}

export function hasBattleAfterActionEnemyRoundel(enemy: BattleAfterActionEnemyFaction): boolean {
  return Boolean(enemy.factionId || enemy.colour || enemy.emblem || enemy.cultureGroup);
}

export function normaliseBattleAfterActionReport(
  report?: BattleAfterActionReportPayload,
): BattleAfterActionReportPayload | undefined {
  if (!report?.available) return undefined;
  return {
    ...report,
    headerImage: WebkilnAssetPath(report.headerImage) ?? '',
    spoilsList: (report.spoilsList ?? []).map(spoil => ({
      ...spoil,
      iconPath: WebkilnAssetPath(spoil.iconPath) ?? '',
    })),
    unitDamage: (report.unitDamage ?? []).map(unit => ({
      ...unit,
      iconPath: WebkilnAssetPath(unit.iconPath) ?? '',
    })),
  };
}
