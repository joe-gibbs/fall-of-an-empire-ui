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

const geographyBorders = new WeakMap<ScenarioOverviewMap, { regions: string; lands: string; domains: string }>();

function victoryGeographyBorders(map: ScenarioOverviewMap) {
  const cached = geographyBorders.get(map);
  if (cached) return cached;
  const geography = new Map(map.provinces.map(province => [province.provinceIndex, province]));
  const paths = { regions: [] as string[], lands: [] as string[], domains: [] as string[] };
  for (const segment of map.borderSegments) {
    const a = geography.get(segment.provinceIndex);
    const b = geography.get(segment.adjacentProvinceIndex);
    if (a?.regionId !== b?.regionId) paths.regions.push(segment.path);
    if (a?.landId !== b?.landId) paths.lands.push(segment.path);
    if (a?.domainId !== b?.domainId) paths.domains.push(segment.path);
  }
  const borders = { regions: paths.regions.join(''), lands: paths.lands.join(''), domains: paths.domains.join('') };
  geographyBorders.set(map, borders);
  return borders;
}

export function victoryMapBorders(map: ScenarioOverviewMap, provinces: readonly VictoryMapProvince[], tierCount: number) {
  const visible = new Map(provinces.map(province => [province.provinceIndex, province]));
  const held: string[] = [];
  const goals = Array.from({ length: tierCount }, () => [] as string[]);
  for (const segment of map.borderSegments) {
    const left = visible.get(segment.provinceIndex);
    const right = visible.get(segment.adjacentProvinceIndex);
    if (!left && !right) continue;
    if (Boolean(left?.isControlled) !== Boolean(right?.isControlled)) held.push(segment.path);
    for (let tier = 0; tier < tierCount; tier++) {
      if (Boolean(left?.tierIndices.includes(tier)) !== Boolean(right?.tierIndices.includes(tier))) {
        goals[tier].push(segment.path);
      }
    }
  }
  return { ...victoryGeographyBorders(map), held: held.join(''), goals: goals.map(paths => paths.join('')) };
}

export function victoryMapBounds(provinces: readonly VictoryMapBounds[]): VictoryMapBounds | null {
  if (provinces.length === 0) return null;
  return {
    minX: Math.min(...provinces.map(province => province.minX)),
    minY: Math.min(...provinces.map(province => province.minY)),
    maxX: Math.max(...provinces.map(province => province.maxX)),
    maxY: Math.max(...provinces.map(province => province.maxY)),
  };
}
