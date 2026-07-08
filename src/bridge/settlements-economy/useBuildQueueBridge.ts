import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  BuildQueueCost,
  BuildQueueItemGroup,
  GetBuildQueueResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { FoaeCefUIAssetPath } from '../../utils/assets';

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

function resourceIcon(name: string): string {
  return FoaeCefUIAssetPath(`/assets/resources/${name}.png`);
}

function itemIcon(item: BuildQueueItemGroup): string {
  if (item.itemKind === 'building' && item.assetKey) {
    return FoaeCefUIAssetPath(`/assets/buildings/portraits/${toKebabCase(item.assetKey)}.png`);
  }
  if (item.itemKind === 'navy_unit') {
    return FoaeCefUIAssetPath('/assets/icons/I_NaviesQuickButton.png');
  }
  if (item.itemKind === 'army_unit' || item.itemKind === 'unit') {
    return FoaeCefUIAssetPath('/assets/icons/I_ArmiesQuickButton.png');
  }
  return FoaeCefUIAssetPath('/assets/icons/I_BuildingsQuickButton.png');
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

export function useBuildQueueBridge(): BuildQueueState | null {
  const [live, setLive] = useState<BuildQueueState | null>(() => buildQueueCache);

  useEffect(() => {
    let cancelled = false;

    const applyResponse = (data: GetBuildQueueResponse) => {
      if (cancelled) return;
      buildQueueCache = mapResponse(data);
      setLive(buildQueueCache);
    };

    const unsubscribe = onBridgeEvent('game.get_build_queue', applyResponse);

    bridgeCall('game.get_build_queue', { subscribe: true })
      .then(applyResponse)
      .catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
      unsubscribe();
      bridgeCall('game.get_build_queue', { subscribe: false }).catch(() => undefined);
    };
  }, []);

  return live;
}

export function unqueueBuildQueueItem(settlementId: string, queueIndex: number): Promise<void> {
  return bridgeCall('game.unqueue_build_queue_item', { settlementId, queueIndex });
}
