import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  BuildQueueCost,
  BuildQueueItemGroup,
  GetBuildQueueResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { WebkilnAssetPath } from '../../utils/assets';

export interface BuildQueueCostView extends BuildQueueCost {
  icon: string;
}

export interface BuildQueueItemView extends Omit<BuildQueueItemGroup, 'resourceCost' | 'missingResources'> {
  icon: string;
  resourceCost: BuildQueueCostView[];
  missingResources: BuildQueueCostView[];
}

export interface BuildQueueState extends Omit<GetBuildQueueResponse, 'items'> {
  items: BuildQueueItemView[];
}

let buildQueueCache: BuildQueueState | null = null;

export function clearBuildQueueCache(): void {
  buildQueueCache = null;
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

function resourceIcon(name: string): string {
  return WebkilnAssetPath(`/assets/resources/${name}.png`);
}

function itemIcon(item: BuildQueueItemGroup): string {
  const portrait = WebkilnAssetPath(item.portrait);
  if (portrait) return portrait;
  if (item.itemKind === 'building' && item.assetKey) {
    return WebkilnAssetPath(`/assets/buildings/portraits/${toKebabCase(item.assetKey)}.png`);
  }
  if (item.itemKind === 'navy_unit') {
    return WebkilnAssetPath('/assets/icons/I_NaviesQuickButton.png');
  }
  if (item.itemKind === 'army_unit' || item.itemKind === 'unit') {
    return WebkilnAssetPath('/assets/icons/I_ArmiesQuickButton.png');
  }
  return WebkilnAssetPath('/assets/icons/I_BuildingsQuickButton.png');
}

function mapCost(cost: BuildQueueCost): BuildQueueCostView {
  return {
    ...cost,
    icon: resourceIcon(cost.name),
  };
}

function mapItem(item: BuildQueueItemGroup): BuildQueueItemView {
  return {
    ...item,
    icon: itemIcon(item),
    resourceCost: item.resourceCost.map(mapCost),
    missingResources: item.missingResources.map(mapCost),
  };
}

function mapResponse(data: GetBuildQueueResponse): BuildQueueState {
  return {
    ...data,
    items: data.items.map(mapItem),
  };
}

// Every mounted consumer shares one game-side subscription. The game is told to start
// pushing when the first consumer becomes active and to stop when the last one goes.
type BuildQueueListener = (state: BuildQueueState) => void;

const buildQueueListeners = new Set<BuildQueueListener>();
let stopBuildQueueEvents: (() => void) | null = null;

function applyBuildQueueResponse(data: GetBuildQueueResponse): void {
  if (!stopBuildQueueEvents) return;
  buildQueueCache = mapResponse(data);
  const state = buildQueueCache;
  buildQueueListeners.forEach((listener) => listener(state));
}

function addBuildQueueListener(listener: BuildQueueListener): () => void {
  buildQueueListeners.add(listener);

  if (!stopBuildQueueEvents) {
    stopBuildQueueEvents = onBridgeEvent('game.get_build_queue', applyBuildQueueResponse);
    bridgeCall('game.get_build_queue', { subscribe: true })
      .then(applyBuildQueueResponse)
      .catch(acknowledgeBridgeFailure);
  } else if (buildQueueCache) {
    // A later consumer joins an existing subscription and starts from the latest push.
    const state = buildQueueCache;
    queueMicrotask(() => {
      if (buildQueueListeners.has(listener)) listener(state);
    });
  }

  return () => {
    buildQueueListeners.delete(listener);
    if (buildQueueListeners.size > 0 || !stopBuildQueueEvents) return;

    stopBuildQueueEvents();
    stopBuildQueueEvents = null;
    bridgeCall('game.get_build_queue', { subscribe: false }).catch(() => undefined);
  };
}

export function useBuildQueueBridge(active = true): BuildQueueState | null {
  const [live, setLive] = useState<BuildQueueState | null>(() => buildQueueCache);

  useEffect(() => {
    if (!active) return undefined;
    return addBuildQueueListener(setLive);
  }, [active]);

  return live;
}

export function unqueueBuildQueueItem(settlementId: string, queueIndex: number): Promise<void> {
  return bridgeCall('game.unqueue_build_queue_item', { settlementId, queueIndex });
}
