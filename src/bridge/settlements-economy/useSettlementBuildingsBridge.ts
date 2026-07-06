import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetSettlementBuildingsResponse,
  SettlementBuildingBuildState as RawBuildState,
  SettlementBuildingCost as RawCost,
  SettlementBuildingRequirement as RawRequirement,
  SettlementBuiltBuildingEntry,
  SettlementAvailableBuildingEntry,
  SettlementConstructionData as RawConstruction,
  SettlementConstructionQueueItem as RawQueueItem,
} from '../../bridge-types.generated.ts';
import { useBridgeQuery, useBridgeQueryState } from '../core/useBridgeQuery';
import type {
  AvailableBuilding,
  Building,
  BuildingBuildState,
  BuildingCategory,
  ConstructionQueueState,
  BuildingRequirement,
  BuildingResourceCost,
  ConstructionQueueItem,
  SettlementConstruction,
} from '../../data/types';
import { FoaeCefUIAssetPath } from '../../utils/assets';

export interface SettlementBuildingsState {
  settlementId: string;
  buildings: Building[];
  availableBuildings: AvailableBuilding[];
  hasPort: boolean;
  construction: SettlementConstruction;
  canBuild: boolean;
  cannotBuildReason?: string;
}

export interface SettlementBuildingsBridgeState {
  data: SettlementBuildingsState | null;
  pending: boolean;
}

function toKebabCase(value: string): string {
  if (value === 'RoadsDirt') {
    return 'dirt-roads';
  }
  if (value === 'RoadsPaved') {
    return 'paved-roads';
  }
  if (value === 'RoadsMetropolitan') {
    return 'metropolitan-roads';
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function buildingPortrait(assetKey: string): string | undefined {
  return assetKey ? FoaeCefUIAssetPath(`/assets/buildings/portraits/${toKebabCase(assetKey)}.png`) : undefined;
}

function resourceIcon(name: string): string {
  return FoaeCefUIAssetPath(`/assets/resources/${name}.png`);
}

function toCategory(raw: string): BuildingCategory {
  switch (raw) {
    case 'economic':
    case 'military':
    case 'defensive':
    case 'infrastructure':
    case 'cultural':
    case 'administrative':
    case 'naval':
    case 'other':
      return raw;
    default:
      return 'other';
  }
}

function toBuildState(raw: RawBuildState): BuildingBuildState {
  return {
    state: raw.state === 'visible' || raw.state === 'greyed' || raw.state === 'hidden'
      ? raw.state
      : 'hidden',
    reason: raw.reason || undefined,
  };
}

function toQueueState(raw: string): ConstructionQueueState | undefined {
  switch (raw) {
    case 'queued':
    case 'awaiting_resources':
    case 'starting':
    case 'building':
      return raw;
    default:
      return undefined;
  }
}

function mapCost(cost: RawCost): BuildingResourceCost {
  return {
    name: cost.name,
    amount: cost.amount,
    icon: resourceIcon(cost.name),
  };
}

function mapRequirement(req: RawRequirement): BuildingRequirement {
  return {
    assetKey: req.assetKey,
    name: req.name,
    icon: buildingPortrait(req.assetKey),
    met: req.met,
  };
}

function mapBuiltBuilding(entry: SettlementBuiltBuildingEntry): Building {
  return {
    id: entry.id,
    assetKey: entry.assetKey || undefined,
    name: entry.name,
    level: entry.level,
    maxLevel: entry.maxLevel,
    category: toCategory(entry.category),
    chainName: entry.chainName || undefined,
    icon: buildingPortrait(entry.assetKey),
    effectsHtml: entry.effectsHtml || undefined,
    description: entry.description || undefined,
    condition: entry.condition,
    nextLevelPrice: entry.nextLevelPrice > 0 ? entry.nextLevelPrice : undefined,
    nextLevelBuildTime: entry.nextLevelBuildTime > 0 ? entry.nextLevelBuildTime : undefined,
    upkeep: entry.upkeep,
    resourceCost: entry.resourceCost.map(mapCost),
    nextBuildState: toBuildState(entry.nextBuildState),
    developedFrom: entry.developedFrom || undefined,
    canBeDevelopedInto: entry.canBeDevelopedInto,
    requiredBuildings: entry.requiredBuildings.map(mapRequirement),
    replacesParent: entry.replacesParent,
    blocksConstruction: entry.blocksConstruction,
  };
}

function mapAvailableBuilding(entry: SettlementAvailableBuildingEntry): AvailableBuilding {
  return {
    id: entry.id,
    assetKey: entry.assetKey,
    name: entry.name,
    maxLevel: entry.maxLevel,
    category: toCategory(entry.category),
    chainName: entry.chainName || undefined,
    icon: buildingPortrait(entry.assetKey),
    description: entry.description || undefined,
    effectsHtml: entry.effectsHtml || undefined,
    price: entry.price,
    buildTime: entry.buildTime,
    upkeep: entry.upkeep,
    resourceCost: entry.resourceCost.map(mapCost),
    developedFrom: entry.developedFrom || undefined,
    canBeDevelopedInto: entry.canBeDevelopedInto,
    requiredBuildings: entry.requiredBuildings.map(mapRequirement),
    buildState: toBuildState(entry.buildState),
  };
}

function mapQueueItem(item: RawQueueItem): ConstructionQueueItem {
  return {
    id: item.id,
    queueIndex: item.queueIndex >= 0 ? item.queueIndex : undefined,
    assetKey: item.assetKey,
    name: item.name,
    icon: buildingPortrait(item.assetKey),
    kind: item.kind === 'upgrade' ? 'upgrade' : 'new',
    toLevel: item.toLevel,
    goldCost: item.goldCost,
    resourceCost: item.resourceCost.map(mapCost),
    durationDays: item.durationDays,
    remainingDays: item.remainingDays >= 0 ? item.remainingDays : undefined,
    state: toQueueState(item.state),
    statusLabel: item.statusLabel || undefined,
    statusReason: item.statusReason || undefined,
    missingResources: item.missingResources.map(mapCost),
  };
}

function mapConstruction(construction: RawConstruction): SettlementConstruction {
  return {
    queue: construction.queue.map(mapQueueItem),
    constructionBlocked: construction.constructionBlocked || undefined,
    constructionBlockerName: construction.constructionBlockerName || undefined,
  };
}

function mapResponse(data: GetSettlementBuildingsResponse): SettlementBuildingsState {
  return {
    settlementId: data.settlementId,
    buildings: data.buildings.map(mapBuiltBuilding),
    availableBuildings: data.availableBuildings.map(mapAvailableBuilding),
    hasPort: data.hasPort,
    construction: mapConstruction(data.construction),
    canBuild: data.canBuild,
    cannotBuildReason: data.cannotBuildReason || undefined,
  };
}

export function useSettlementBuildingsBridge(settlementId: string | null): SettlementBuildingsState | null {
  return useBridgeQuery({
    action: 'game.get_settlement_buildings',
    payload: settlementId ? { settlementId } : null,
    map: mapResponse,
    matchPush: (data) => data.settlementId === settlementId,
  });
}

export function useSettlementBuildingsBridgeState(settlementId: string | null): SettlementBuildingsBridgeState {
  const query = useBridgeQueryState({
    action: 'game.get_settlement_buildings',
    payload: settlementId ? { settlementId } : null,
    map: mapResponse,
    matchPush: (data) => data.settlementId === settlementId,
  });

  return {
    data: query.value,
    pending: query.pending,
  };
}

export function queueSettlementBuilding(settlementId: string, buildingId: string): Promise<void> {
  return bridgeCall('game.queue_settlement_building', { settlementId, buildingId });
}

export function unqueueSettlementBuilding(settlementId: string, queueIndex: number): Promise<void> {
  return bridgeCall('game.unqueue_settlement_building', { settlementId, queueIndex });
}
