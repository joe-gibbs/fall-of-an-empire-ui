import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetHeirCandidatesResponse,
  HeirCandidateEntry,
  StartPersonInteractionResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export function useHeirCandidates(enabled: boolean): HeirCandidateEntry[] | null {
  return useTargetedHeirCandidates(enabled, '');
}

export function useTargetedHeirCandidates(enabled: boolean, factionId: string | null | undefined): HeirCandidateEntry[] | null {
  const targetFactionId = factionId ?? '';
  return useBridgeQuery({
    action: 'game.get_heir_candidates',
    payload: enabled ? { factionId: targetFactionId } : null,
    map: (data: GetHeirCandidatesResponse) => data.candidates,
    matchPush: data => !targetFactionId || data.factionId === targetFactionId,
  });
}

export async function setDesignatedHeir(personId: string, factionId?: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.set_designated_heir', { personId, factionId: factionId ?? '' });
    if (!response.success) return false;

    try {
      const targetFactionId = response.factionId || factionId || '';

      if (!factionId) {
        const familyTree = await bridgeCall('game.get_family_tree', { personId: '', scope: 'lineage' });
        bridgeEvents.dispatchEvent(new CustomEvent('game.get_family_tree', { detail: familyTree }));

        const factionDataId = targetFactionId || familyTree.factionId;
        if (factionDataId) {
          const faction = await bridgeCall('game.get_faction_data', { factionId: factionDataId, scope: 'full' });
          bridgeEvents.dispatchEvent(new CustomEvent('game.get_faction_data', { detail: faction }));
        }
      } else if (targetFactionId) {
        const faction = await bridgeCall('game.get_faction_data', { factionId: targetFactionId, scope: 'full' });
        bridgeEvents.dispatchEvent(new CustomEvent('game.get_faction_data', { detail: faction }));
      }

      const candidates = await bridgeCall('game.get_heir_candidates', { factionId: targetFactionId });
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_heir_candidates', { detail: candidates }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }

    return true;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function requestProvinceSuccessionApproval(personId: string): Promise<StartPersonInteractionResponse | null> {
  try {
    const response = await bridgeCall('game.start_person_interaction', {
      personId,
      interactionId: 'RequestProvinceSuccession',
      initiatorPersonId: '',
      giftTypeIndex: -1,
    });
    if (!response.started) return response;

    try {
      const overview = await bridgeCall('game.get_province_mode_overview');
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_province_mode_overview', { detail: overview }));

      const candidates = await bridgeCall('game.get_heir_candidates', { factionId: overview.province.id });
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_heir_candidates', { detail: candidates }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }

    return response;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return null;
  }
}
