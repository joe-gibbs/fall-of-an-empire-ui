import type { PendingFormationUnitEntry } from '../../../bridge-types.generated';
import type { ArmyUnitType, RecruitableUnit, UnitTier } from '../../../data/types';

export interface PendingFormationUnitGroup {
  key: string;
  definition: RecruitableUnit;
  locationLabel: string;
  count: number;
  progressTotal: number;
  hasFullDefinition: boolean;
}

function normaliseUnitType(type: string): ArmyUnitType {
  if (type === 'infantry' || type === 'cavalry' || type === 'ranged' || type === 'siege') return type;
  return 'navy';
}

function clampTier(tier: number): UnitTier {
  if (tier <= 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  return 4;
}

function displayDefinition(unit: PendingFormationUnitEntry): RecruitableUnit {
  return {
    id: unit.unitId,
    assetKey: unit.unitId,
    name: unit.name,
    description: '',
    portrait: unit.portrait,
    type: normaliseUnitType(unit.type),
    tier: clampTier(unit.tier),
    price: 0,
    buildTime: 0,
    upkeep: 0,
    foodConsumption: 0,
    maxStrength: 0,
    speed: 0,
    attackSpeed: 0,
    damage: { pierce: 0, crush: 0, slash: 0 },
    armour: { pierce: 0, crush: 0, slash: 0 },
    resourceCost: [],
  };
}

export function resolvePendingFormationUnit(
  unit: PendingFormationUnitEntry,
  unitByKey: Map<string, RecruitableUnit>,
): { definition: RecruitableUnit; hasFullDefinition: boolean } {
  const existing = unitByKey.get(unit.unitId);
  if (existing) {
    return { definition: existing, hasFullDefinition: true };
  }
  return { definition: displayDefinition(unit), hasFullDefinition: false };
}

export function projectedPendingUnitProgress(unit: PendingFormationUnitEntry, gameDay: number): number {
  const elapsedDays = unit.snapshotDate > 0 ? Math.max(0, gameDay - unit.snapshotDate) : 0;
  return Math.max(0, Math.min(1, unit.progressAtSnapshot + elapsedDays * unit.dailyProgress));
}

export function groupPendingFormationUnits(
  units: readonly PendingFormationUnitEntry[],
  unitByKey: Map<string, RecruitableUnit>,
  gameDay: number,
): PendingFormationUnitGroup[] {
  const groups = new Map<string, PendingFormationUnitGroup>();
  for (const unit of units) {
    const resolved = resolvePendingFormationUnit(unit, unitByKey);
    const key = `${unit.unitId}:${unit.settlementId}`;
    const existing = groups.get(key);
    const progress = projectedPendingUnitProgress(unit, gameDay);
    if (existing) {
      existing.count += 1;
      existing.progressTotal += progress;
      if (unit.dailyProgress > 0) existing.locationLabel = unit.locationLabel;
      continue;
    }
    groups.set(key, {
      key,
      definition: resolved.definition,
      locationLabel: unit.locationLabel,
      count: 1,
      progressTotal: progress,
      hasFullDefinition: resolved.hasFullDefinition,
    });
  }
  return Array.from(groups.values());
}
