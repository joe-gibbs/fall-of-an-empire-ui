import { bridgeCall } from '../../bridge-types.generated.ts';
import type { ProvinceEmperorTakeoverResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { mapPortraitLayers, mapPortraitPath } from '../characters/portraitMapping';
import { useBridgeQuery } from '../core/useBridgeQuery';

export interface ProvinceEmperorTakeoverCandidateView {
  id: string;
  name: string;
  title: string;
  sourceFactionName: string;
  portrait: string;
  portraitLayers?: ReturnType<typeof mapPortraitLayers>;
  age: number;
  governance: number;
  loyalty: number;
  fame: number;
  support: number;
  threat: number;
  isSelected: boolean;
}

export interface ProvinceEmperorTakeoverView {
  active: boolean;
  provinceFactionId: string;
  provinceFactionName: string;
  imperialFactionId: string;
  imperialFactionName: string;
  selectedPersonId: string;
  candidates: ProvinceEmperorTakeoverCandidateView[];
}

function mapResponse(data: ProvinceEmperorTakeoverResponse): ProvinceEmperorTakeoverView {
  return {
    active: data.active,
    provinceFactionId: data.provinceFactionId,
    provinceFactionName: data.provinceFactionName,
    imperialFactionId: data.imperialFactionId,
    imperialFactionName: data.imperialFactionName,
    selectedPersonId: data.selectedPersonId,
    candidates: data.candidates.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      title: candidate.title,
      sourceFactionName: candidate.sourceFactionName,
      portrait: mapPortraitPath(candidate.portrait),
      portraitLayers: mapPortraitLayers(candidate.portraitLayers),
      age: candidate.age,
      governance: candidate.governance,
      loyalty: candidate.loyalty,
      fame: candidate.fame,
      support: candidate.support,
      threat: candidate.threat,
      isSelected: candidate.isSelected,
    })),
  };
}

export function useProvinceEmperorTakeoverBridge(enabled: boolean): ProvinceEmperorTakeoverView | null {
  return useBridgeQuery({
    action: 'game.province_emperor_takeover',
    payload: enabled ? { command: 'state', personId: '' } : null,
    map: mapResponse,
  });
}

export async function refreshProvinceEmperorTakeover(): Promise<void> {
  const fresh = await bridgeCall('game.province_emperor_takeover', { command: 'state', personId: '' });
  window.dispatchEvent(new CustomEvent('bridge:game.province_emperor_takeover', { detail: fresh }));
}

export async function selectProvinceEmperorTakeoverCandidate(personId: string): Promise<boolean> {
  try {
    await bridgeCall('game.province_emperor_takeover', { command: 'select', personId });
    await refreshProvinceEmperorTakeover();
    return true;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function confirmProvinceEmperorTakeoverCandidate(personId: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.province_emperor_takeover', { command: 'confirm', personId });
    window.dispatchEvent(new CustomEvent('bridge:game.province_emperor_takeover', { detail: response }));
    try {
      const playerFaction = await bridgeCall('game.get_player_faction');
      window.dispatchEvent(new CustomEvent('bridge:game.get_player_faction', { detail: playerFaction }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }
    return !response.active;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}
