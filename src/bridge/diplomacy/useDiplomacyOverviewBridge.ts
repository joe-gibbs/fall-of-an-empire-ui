import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetDiplomacyOverviewResponse } from '../../bridge-types.generated.ts';
import { dispatchFactionData } from './useFactionBridge';

export type DiplomacyOverviewState = GetDiplomacyOverviewResponse;
export type DiplomacyOverviewScope = 'full' | 'internal' | 'provinces' | 'governors' | 'candidates';

export function useDiplomacyOverviewBridge(scope: DiplomacyOverviewScope = 'full', fetch = true): DiplomacyOverviewState | null {
  return useBridgeQuery({
    action: 'game.get_diplomacy_overview',
    payload: fetch ? { scope } : null,
    cacheResponseMs: 1000,
    map: data => data,
  });
}

export function setProvinceBuildFocusBridge(factionId: string, focus: string): Promise<void> {
  return bridgeCall('game.set_province_build_focus', { factionId, focus }).then(() => {
    clearBridgeQueryCache('game.get_diplomacy_overview');
    return undefined;
  });
}

export function adjustSubjectTaxRateBridge(factionId: string, delta: number): Promise<void> {
  return bridgeCall('game.adjust_subject_tax_rate', { factionId, delta }).then(() => {
    clearBridgeQueryCache('game.get_diplomacy_overview');
    return undefined;
  });
}

export function createProvinceFromCandidateBridge(landId: string, leaderPersonId: string, playAsProvince: boolean): Promise<void> {
  return bridgeCall('game.create_province_from_candidate', { landId, leaderPersonId, playAsProvince }).then(() => {
    clearBridgeQueryCache('game.get_diplomacy_overview');
    return undefined;
  });
}

export async function refreshDiplomacyOverviewBridge(scope: DiplomacyOverviewScope = 'full'): Promise<void> {
  clearBridgeQueryCache('game.get_diplomacy_overview');
  const fresh = await bridgeCall('game.get_diplomacy_overview', { scope });
  bridgeEvents.dispatchEvent(new CustomEvent('game.get_diplomacy_overview', { detail: fresh }));
}

export async function setAutoAssignGovernorsBridge(enabled: boolean): Promise<void> {
  await bridgeCall('game.set_auto_assign_governors', { enabled });
  await refreshDiplomacyOverviewBridge('full');
}

export async function breakTreatyBridge(treatyId: string, refreshFactionId?: string | null): Promise<void> {
  const result = await bridgeCall('game.break_treaty', { treatyId });
  await refreshDiplomacyOverviewBridge('full');

  const factionIds = new Set<string>();
  if (result.otherFactionId) factionIds.add(result.otherFactionId);
  if (refreshFactionId) factionIds.add(refreshFactionId);

  for (const factionId of factionIds) {
    const factionData = await bridgeCall('game.get_faction_data', { factionId, scope: 'full' });
    dispatchFactionData(factionData);
  }
}
