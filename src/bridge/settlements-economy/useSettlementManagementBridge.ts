import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { mapPortraitPath } from '../characters/portraitMapping';
import type {
  GetRegionGovernorCandidatesResponse,
  RegionGovernorCandidate,
} from '../../bridge-types.generated.ts';
import type { Character, PersonActivity } from '../../data/types';

export interface RegionGovernorCandidateView extends Character {
  currentRegionCount: number;
  maxRegionCount: number;
  isCurrentGovernor: boolean;
}

function dispatchBridgeResponse(action: string, detail: unknown): void {
  bridgeEvents.dispatchEvent(new CustomEvent(action, { detail }));
}

export async function refreshSettlementBridge(settlementId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_settlement_data', { settlementId });
  dispatchBridgeResponse('game.get_settlement_data', fresh);
}

async function refreshGameStateBridge(): Promise<void> {
  try {
    const fresh = await bridgeCall('game.get_game_state');
    dispatchBridgeResponse('game.get_game_state', fresh);
  } catch (error) {
    acknowledgeBridgeFailure(error);
  }
}

function mapGovernorCandidate(c: RegionGovernorCandidate): RegionGovernorCandidateView {
  return {
    id: c.id,
    name: c.name,
    title: c.title,
    shortTitle: c.title,
    age: c.age,
    portrait: mapPortraitPath(c.portrait),
    portraitLayers: undefined,
    faction: '',
    culture: '',
    religion: '',
    stats: {
      tactics: c.tactics,
      authority: c.authority,
      cunning: c.cunning,
      governance: c.governance,
      loyalty: c.loyalty,
      constitution: c.constitution,
    },
    traits: [],
    honourDread: 0,
    fame: c.fame,
    activity: c.activity as PersonActivity,
    roleExperience: { military: 0, administrative: 0, diplomatic: 0, intrigue: 0 },
    compliance: 0,
    governedRegions: [],
    relationships: [],
    isAlive: true,
    currentRegionCount: c.currentRegionCount,
    maxRegionCount: c.maxRegionCount,
    isCurrentGovernor: c.isCurrentGovernor,
  };
}

export function useRegionGovernorCandidatesBridge(settlementId: string | null): RegionGovernorCandidateView[] | null {
  return useBridgeQuery({
    action: 'game.get_region_governor_candidates',
    payload: settlementId ? { settlementId } : null,
    map: (data: GetRegionGovernorCandidatesResponse) => data.candidates.map(mapGovernorCandidate),
  });
}

export async function renameSettlementBridge(settlementId: string, name: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.rename_settlement', { settlementId, name });
    await refreshSettlementBridge(settlementId);
    return response.renamed;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function setSettlementCapitalBridge(settlementId: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.set_settlement_capital', { settlementId });
    await refreshSettlementBridge(settlementId);
    await refreshGameStateBridge();
    return response.moved;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function navigateSettlementBridge(settlementId: string, direction: -1 | 1): Promise<string | null> {
  try {
    const response = await bridgeCall('game.navigate_settlement', { settlementId, direction });
    return response.selectedSettlementId || null;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return null;
  }
}

export async function appointRegionGovernorBridge(settlementId: string, personId: string | null): Promise<boolean> {
  try {
    const response = await bridgeCall('game.appoint_region_governor', {
      settlementId,
      personId: personId ?? '',
    });
    await refreshSettlementBridge(settlementId);
    return response.appointed || response.removed || personId === null;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}
