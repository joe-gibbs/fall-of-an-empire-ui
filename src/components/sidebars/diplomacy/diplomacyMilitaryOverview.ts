export type DiplomacyMilitaryOverviewKind = 'warbands' | 'levies' | 'armies';

export interface DiplomacyMilitaryOverviewFaction {
  usesWarbands?: boolean;
  warbandStrength?: number;
  usesLevies?: boolean;
  levyStrength?: number;
  armyCount: number;
}

export function diplomacyMilitaryOverview(faction: DiplomacyMilitaryOverviewFaction): {
  kind: DiplomacyMilitaryOverviewKind;
  value: number;
} {
  if (faction.usesWarbands) {
    return { kind: 'warbands', value: faction.warbandStrength ?? 0 };
  }
  if (faction.usesLevies) {
    return { kind: 'levies', value: faction.levyStrength ?? 0 };
  }
  return { kind: 'armies', value: faction.armyCount };
}
