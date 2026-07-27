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
import { WebkilnAssetPath } from '../../utils/assets';
import { useGameState } from '../../context/GameContext';

export interface SettlementBuildingsState {
  settlementId: string;
  snapshotDay: number;
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
  const id = value.toLowerCase();
  if (id === 'roadsdirt') {
    return 'dirt-roads';
  }
  if (id === 'roadspaved') {
    return 'paved-roads';
  }
  if (id === 'roadsmetropolitan') {
    return 'metropolitan-roads';
  }
  if (id === 'shabarimdyeworks') {
    return 'dye-works';
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function buildingPortrait(assetKey: string): string | undefined {
  return assetKey ? WebkilnAssetPath(`/assets/buildings/portraits/${toKebabCase(assetKey)}.png`) : undefined;
}

function resourceIcon(name: string): string {
  if (name.toLowerCase() === 'gold') {
    return WebkilnAssetPath('/assets/icons/I_Coins.png');
  }
  return WebkilnAssetPath(`/assets/resources/${name}.png`);
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
    displayName: cost.displayName,
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
    effectsText: entry.effectsText || undefined,
    description: entry.description || undefined,
    condition: entry.condition,
    monthlyConditionChange: entry.monthlyConditionChange,
    maintenanceGovernanceThreshold: entry.maintenanceGovernanceThreshold,
    nextLevelPrice: entry.nextLevelPrice > 0 ? entry.nextLevelPrice : undefined,
    nextLevelBuildTime: entry.nextLevelBuildTime > 0 ? entry.nextLevelBuildTime : undefined,
    upkeep: entry.upkeep,
    resourceCost: entry.resourceCost.map(mapCost),
    dismantleSpoils: entry.dismantleSpoils.map(mapCost),
    nextBuildState: toBuildState(entry.nextBuildState),
    developedFrom: entry.developedFrom || undefined,
    canBeDevelopedInto: entry.canBeDevelopedInto,
    requiredBuildings: entry.requiredBuildings.map(mapRequirement),
    replacesParent: entry.replacesParent,
    blocksConstruction: entry.blocksConstruction,
    canDemolish: entry.canDemolish,
    demolishReason: entry.demolishReason || undefined,
    canDowngrade: entry.canDowngrade,
    downgradeReason: entry.downgradeReason || undefined,
    downgradeTargetName: entry.downgradeTargetName || undefined,
    downgradeTargetLevel: entry.downgradeTargetLevel > 0 ? entry.downgradeTargetLevel : undefined,
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
    effectsText: entry.effectsText || undefined,
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
    kind: item.kind === 'upgrade' || item.kind === 'rebuild' ? item.kind : 'new',
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
    snapshotDay: data.snapshotDay,
    buildings: data.buildings.map(mapBuiltBuilding),
    availableBuildings: data.availableBuildings.map(mapAvailableBuilding),
    hasPort: data.hasPort,
    construction: mapConstruction(data.construction),
    canBuild: data.canBuild,
    cannotBuildReason: data.cannotBuildReason || undefined,
  };
}

export function useSettlementBuildingsBridge(settlementId: string | null): SettlementBuildingsState | null {
  const { gameDay } = useGameState();
  const state = useBridgeQuery({
    action: 'game.get_settlement_buildings',
    payload: settlementId ? { settlementId } : null,
    map: mapResponse,
    matchPush: (data) => data.settlementId === settlementId,
    mergePush: mergeResponse,
  });
  return advanceConstructionProgress(state, gameDay);
}

export function useSettlementBuildingsBridgeState(settlementId: string | null): SettlementBuildingsBridgeState {
  const { gameDay } = useGameState();
  const query = useBridgeQueryState({
    action: 'game.get_settlement_buildings',
    payload: settlementId ? { settlementId } : null,
    map: mapResponse,
    matchPush: (data) => data.settlementId === settlementId,
    mergePush: mergeResponse,
  });

  return {
    data: advanceConstructionProgress(query.value, gameDay),
    pending: query.pending,
  };
}

function mergeResponse(
  current: SettlementBuildingsState | null,
  data: GetSettlementBuildingsResponse,
): SettlementBuildingsState | null {
  if (!data.conditionOnly) {
    return mapResponse(data);
  }
  if (!current || current.settlementId !== data.settlementId) {
    return current;
  }

  const conditions = new Map(data.buildings.map(building => [building.id, building.condition]));
  return {
    ...current,
    buildings: current.buildings.map(building => conditions.has(building.id)
      ? { ...building, condition: conditions.get(building.id)! }
      : building),
  };
}

function advanceConstructionProgress(
  state: SettlementBuildingsState | null,
  gameDay: number,
): SettlementBuildingsState | null {
  if (!state || gameDay <= state.snapshotDay) {
    return state;
  }

  const elapsedDays = gameDay - state.snapshotDay;
  return {
    ...state,
    construction: {
      ...state.construction,
      queue: state.construction.queue.map(item => (
        item.state === 'building' && item.remainingDays !== undefined
          ? { ...item, remainingDays: Math.max(0, item.remainingDays - elapsedDays) }
          : item
      )),
    },
  };
}

export function queueSettlementBuilding(settlementId: string, buildingId: string): Promise<void> {
  return bridgeCall('game.queue_settlement_building', { settlementId, buildingId });
}

export function unqueueSettlementBuilding(settlementId: string, queueIndex: number): Promise<void> {
  return bridgeCall('game.unqueue_settlement_building', { settlementId, queueIndex });
}

export function reorderSettlementBuilding(
  settlementId: string,
  sourceQueueIndex: number,
  targetQueueIndex: number,
): Promise<void> {
  return bridgeCall('game.reorder_settlement_building', { settlementId, sourceQueueIndex, targetQueueIndex });
}

export function demolishSettlementBuilding(settlementId: string, buildingId: string): Promise<void> {
  return bridgeCall('game.demolish_settlement_building', { settlementId, buildingId });
}

export function downgradeSettlementBuilding(settlementId: string, buildingId: string): Promise<void> {
  return bridgeCall('game.downgrade_settlement_building', { settlementId, buildingId });
}
