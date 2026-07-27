import { bridgeCall, type RecruitCharacterForRoleResponse } from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';

export function useRecruitCharacterGoldCost(): number | null {
  return useBridgeQuery({
    action: 'game.get_character_recruitment_config',
    map: data => data.goldCost,
    cacheResponse: true,
  });
}

export type RecruitCharacterRole =
  | 'commander'
  | 'governor'
  | 'bishop'
  | 'diplomat'
  | 'spy'
  | 'court_tactics'
  | 'court_authority'
  | 'court_cunning'
  | 'court_governance'
  | 'court_loyalty'
  | 'court_constitution';

interface RecruitCharacterOptions {
  contextId?: string;
  religionKey?: string;
  positionKey?: string;
}

function dispatchBridgeResponse(action: string, detail: unknown): void {
  bridgeEvents.dispatchEvent(new CustomEvent(action, { detail }));
}

export async function recruitCharacterForRoleBridge(
  role: RecruitCharacterRole,
  options: RecruitCharacterOptions = {},
): Promise<RecruitCharacterForRoleResponse> {
  const response = await bridgeCall('game.recruit_character_for_role', {
    role,
    contextId: options.contextId ?? '',
    religionKey: options.religionKey ?? '',
    positionKey: options.positionKey ?? '',
  });
  if (response.recruited) {
    const resources = await bridgeCall('game.get_resources');
    dispatchBridgeResponse('game.get_resources', resources);
  }
  return response;
}

export async function refreshMilitaryCommanderCandidatesBridge(militaryId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_military_commander_candidates', { militaryId });
  dispatchBridgeResponse('game.get_military_commander_candidates', fresh);
}

export async function refreshRegionGovernorCandidatesBridge(settlementId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_region_governor_candidates', { settlementId });
  dispatchBridgeResponse('game.get_region_governor_candidates', fresh);
}

export async function refreshBishopCandidatesBridge(religionKey: string): Promise<void> {
  const fresh = await bridgeCall('game.get_bishop_candidates', { religionKey });
  dispatchBridgeResponse('game.get_bishop_candidates', fresh);
}

export async function refreshCourtCandidatesBridge(positionKey: string): Promise<void> {
  const fresh = await bridgeCall('game.get_court_candidates', { positionKey });
  dispatchBridgeResponse('game.get_court_candidates', fresh);
}

export async function refreshAgentCandidatesBridge(role: 'diplomat' | 'spy', targetFactionId: string): Promise<void> {
  const fresh = await bridgeCall('game.get_agent_candidates', { role, targetFactionId });
  dispatchBridgeResponse('game.get_agent_candidates', fresh);
}
