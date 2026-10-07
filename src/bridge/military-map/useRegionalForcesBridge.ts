import { bridgeCall } from '../../bridge-types.generated';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { refreshFactionData } from '../diplomacy/useFactionBridge';

export function useRegionalForcesBridge() {
  return useBridgeQuery({
    action: 'game.get_regional_forces', map: data => data,
    refreshOn: ['game.appoint_region_governor', 'game.set_auto_assign_governors'],
    mergePush: (current, update) => {
      if (!update.isNumericUpdate) return update;
      if (!current || !update.enabled) return current;
      const numbers = new Map(update.numbers.map(region => [region.id, region]));
      return { ...current, regions: current.regions.map(region => {
        const next = numbers.get(region.id);
        return next ? { ...region, capacity: next.capacity, available: next.available, deployed: next.deployed, recruiting: next.recruiting } : region;
      }) };
    },
  });
}

export async function refreshMilitaryInstitutionViews(): Promise<void> {
  const [player, resources] = await Promise.all([bridgeCall('game.get_player_faction'), bridgeCall('game.get_resources')]);
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_player_faction', { detail: player }));
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_resources', { detail: resources }));
  if (player.id) await refreshFactionData(player.id);
}
