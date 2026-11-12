import type { GetVictoryConditionsResponse, ScenarioOverviewMap, ScenarioOverviewProvince } from '../../../bridge-types.generated.ts';

export interface VictoryMapProvince extends ScenarioOverviewProvince {
  name: string;
  isControlled: boolean;
  tierIndices: number[];
  conditionIds: string[];
}

export function victoryMapProvinces(victory: GetVictoryConditionsResponse, map: ScenarioOverviewMap): VictoryMapProvince[] {
  const settlements = new Map(victory.settlements.map(settlement => [settlement.provinceIndex, settlement]));
  const targets = new Map<number, { tierIndices: number[]; conditionIds: string[] }>();
  victory.tiers.forEach((tier, tierIndex) => {
    if (tier.isAchieved) return;
    for (const condition of tier.conditions) {
      for (const domain of condition.domains) {
        for (const index of domain.provinceIndices) {
          let target = targets.get(index);
          if (!target) {
            target = { tierIndices: [], conditionIds: [] };
            targets.set(index, target);
          }
          if (!target.tierIndices.includes(tierIndex)) target.tierIndices.push(tierIndex);
          if (!target.conditionIds.includes(condition.id)) target.conditionIds.push(condition.id);
        }
      }
    }
  });
  return map.provinces.flatMap(province => {
    const settlement = settlements.get(province.provinceIndex);
    const target = targets.get(province.provinceIndex);
    if (!target && !settlement?.isControlled) return [];
    return [{ ...province, name: settlement!.name, isControlled: settlement!.isControlled,
      tierIndices: target?.tierIndices ?? [], conditionIds: target?.conditionIds ?? [] }];
  });
}

export interface VictoryMapBounds { minX: number; minY: number; maxX: number; maxY: number }

/** Border segment indices for each layer the victory map strokes. */
export interface VictoryMapBorders {
  regions: number[];
  lands: number[];
  domains: number[];
  held: number[];
  goals: number[][];
}

const geographyBorders = new WeakMap<ScenarioOverviewMap, Pick<VictoryMapBorders, 'regions' | 'lands' | 'domains'>>();

function victoryGeographyBorders(map: ScenarioOverviewMap) {
  const cached = geographyBorders.get(map);
  if (cached) return cached;
  const geography = new Map(map.provinces.map(province => [province.provinceIndex, province]));
  const borders = { regions: [] as number[], lands: [] as number[], domains: [] as number[] };
  map.borderSegments.forEach((segment, index) => {
    const a = geography.get(segment.provinceIndex);
    const b = geography.get(segment.adjacentProvinceIndex);
    if (a?.regionId !== b?.regionId) borders.regions.push(index);
    if (a?.landId !== b?.landId) borders.lands.push(index);
    if (a?.domainId !== b?.domainId) borders.domains.push(index);
  });
  geographyBorders.set(map, borders);
  return borders;
}

export function victoryMapBorders(map: ScenarioOverviewMap, provinces: readonly VictoryMapProvince[], tierCount: number): VictoryMapBorders {
  const visible = new Map(provinces.map(province => [province.provinceIndex, province]));
  const held: number[] = [];
  const goals = Array.from({ length: tierCount }, () => [] as number[]);
  map.borderSegments.forEach((segment, index) => {
    const left = visible.get(segment.provinceIndex);
    const right = visible.get(segment.adjacentProvinceIndex);
    if (!left && !right) return;
    if (Boolean(left?.isControlled) !== Boolean(right?.isControlled)) held.push(index);
    for (let tier = 0; tier < tierCount; tier++) {
      if (Boolean(left?.tierIndices.includes(tier)) !== Boolean(right?.tierIndices.includes(tier))) {
        goals[tier].push(index);
      }
    }
  });
  return { ...victoryGeographyBorders(map), held, goals };
}

export function victoryMapBounds(provinces: readonly VictoryMapBounds[]): VictoryMapBounds | null {
  if (provinces.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const province of provinces) {
    minX = Math.min(minX, province.minX);
    minY = Math.min(minY, province.minY);
    maxX = Math.max(maxX, province.maxX);
    maxY = Math.max(maxY, province.maxY);
  }
  return { minX, minY, maxX, maxY };
}
