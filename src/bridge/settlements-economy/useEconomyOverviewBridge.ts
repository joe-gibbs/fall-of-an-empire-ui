import type { GetEconomyOverviewResponse, GetEconomyResourceDetailsResponse } from '../../bridge-types.generated.ts';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';

let economyOverviewCache: GetEconomyOverviewResponse | null = null;

type EconomyOverviewScope = 'overview' | 'resources' | 'food' | 'settlements' | 'military' | 'provinces';

export function clearEconomyOverviewCache(): void {
  economyOverviewCache = null;
  clearBridgeQueryCache('game.get_economy_overview');
}

function mergeEconomyOverview(value: GetEconomyOverviewResponse, scope: EconomyOverviewScope): GetEconomyOverviewResponse {
  const previous = economyOverviewCache;
  const merged: GetEconomyOverviewResponse = {
    ...(previous ?? value),
    ...value,
    resources: previous?.resources ?? [],
    foodRows: previous?.foodRows ?? [],
    history: previous?.history ?? [],
    taxRows: previous?.taxRows ?? [],
    settlements: previous?.settlements ?? [],
    militaries: previous?.militaries ?? [],
    vassals: previous?.vassals ?? [],
  };

  if (scope === 'overview' || scope === 'resources' || scope === 'food') {
    merged.resources = value.resources;
  }
  if (scope === 'overview') {
    merged.history = value.history;
  }
  if (scope === 'food') {
    merged.foodRows = value.foodRows;
    merged.militaries = value.militaries;
  }
  if (scope === 'settlements') {
    merged.settlements = value.settlements;
  }
  if (scope === 'military') {
    merged.militaries = value.militaries;
  }
  if (scope === 'provinces') {
    merged.taxRows = value.taxRows;
    merged.vassals = value.vassals;
  }

  economyOverviewCache = merged;
  return merged;
}

export function useEconomyOverviewBridge(scope: EconomyOverviewScope = 'overview', fetch = true): GetEconomyOverviewResponse | null {
  const live = useBridgeQuery({
    action: 'game.get_economy_overview',
    payload: fetch ? { scope } : null,
    cacheResponseMs: 1000,
    map: (data) => {
      return mergeEconomyOverview(data, scope);
    },
  });

  return live ?? economyOverviewCache;
}

export function useEconomyResourceDetailsBridge(resourceId: string | null): GetEconomyResourceDetailsResponse | null {
  return useBridgeQuery({
    action: 'game.get_economy_resource_details',
    payload: resourceId ? { resourceId } : null,
    cacheResponseMs: 1000,
    map: data => data,
  });
}

export function buyEconomyResourceBridge(resourceId: string, amount: number): Promise<void> {
  return bridgeCall('game.buy_resource', { resourceId, amount }).then(() => {
    clearEconomyOverviewCache();
    return undefined;
  });
}

export function sellEconomyResourceBridge(resourceId: string, amount: number): Promise<void> {
  return bridgeCall('game.sell_resource', { resourceId, amount }).then(() => {
    clearEconomyOverviewCache();
    return undefined;
  });
}

export function setEconomyAutoBuyBridge(enabled: boolean): Promise<void> {
  return bridgeCall('game.set_economy_auto_buy', { enabled }).then(() => {
    clearEconomyOverviewCache();
    return undefined;
  });
}

export function setResourceAutoSellBridge(resourceId: string, enabled: boolean, threshold: number): Promise<void> {
  return bridgeCall('game.set_resource_auto_sell', { resourceId, enabled, threshold }).then(() => {
    clearEconomyOverviewCache();
    return undefined;
  });
}

export function setResourcePriorityBridge(targetType: string, targetId: string, priority: string): Promise<void> {
  return bridgeCall('game.set_resource_priority', { targetType, targetId, priority }).then(() => {
    clearEconomyOverviewCache();
    return undefined;
  });
}

export function adjustEconomySubjectTaxRateBridge(factionId: string, delta: number): Promise<void> {
  return bridgeCall('game.adjust_subject_tax_rate', { factionId, delta }).then(() => {
    clearEconomyOverviewCache();
    return undefined;
  });
}
