import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  BattlePoint,
  GetBattleFrameResponse,
  GetBattleDataResponse,
  RequestBattleRetreatResponse,
  SetBattleFormationOrderResponse,
  SetBattleFormationStanceResponse,
  StartBattleActionResponse,
  WithdrawBattleFormationResponse,
} from '../../bridge-types.generated.ts';
import { getruntimeEngine } from '../core/runtimeEngine';
import { useBridgeQuery } from '../core/useBridgeQuery';

const PACKED_BATTLE_FRAME = 'battleFrame';
const BATTLE_FRAME_FORMATION_NUMBER_STRIDE = 10;
const BATTLE_FRAME_AGENT_NUMBER_STRIDE = 4;
const BATTLE_FRAME_FORMATION_MANUAL_TARGET_FLAG = 1 << 0;
const BATTLE_FRAME_FORMATION_ROUTING_FLAG = 1 << 1;
const BATTLE_FRAME_FORMATION_WITHDRAWING_FLAG = 1 << 2;
const BATTLE_FRAME_AGENT_MELEE_FLAG = 1 << 0;
const BATTLE_FRAME_AGENT_DETACHED_FLAG = 1 << 1;

export interface PackedBattleFrameResponse {
  packed: typeof PACKED_BATTLE_FRAME;
  found: true;
  id: string;
  formationIds: string[];
  formationNumbers: number[];
  formationFlags: number[];
  formationTargetIndices: number[];
  waypointCounts: number[];
  waypointNumbers: number[];
  agentCounts: number[];
  agentNumbers: number[];
  agentFlags: number[];
  agentTargetIndices: number[];
}

export type BattleFrameLive = GetBattleFrameResponse | PackedBattleFrameResponse;

export type BattleFormationLive = GetBattleDataResponse['formations'][number] & {
  agents: GetBattleFrameResponse['formations'][number]['agents'];
  liveFrame?: PackedBattleFrameResponse;
  liveFrameFormationIndex?: number;
  liveAgentOffset?: number;
};
export type BattleDataLive = Omit<GetBattleDataResponse, 'formations'> & {
  formations: BattleFormationLive[];
};

const battleCache = new Map<string, BattleDataLive>();

export function clearBattleCache(): void {
  battleCache.clear();
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function isPackedBattleFrame(value: unknown): value is PackedBattleFrameResponse {
  return !!value
    && typeof value === 'object'
    && (value as { packed?: unknown }).packed === PACKED_BATTLE_FRAME
    && Array.isArray((value as Partial<PackedBattleFrameResponse>).formationIds)
    && Array.isArray((value as Partial<PackedBattleFrameResponse>).formationNumbers)
    && Array.isArray((value as Partial<PackedBattleFrameResponse>).agentCounts)
    && Array.isArray((value as Partial<PackedBattleFrameResponse>).agentNumbers);
}

export function battleFrameAgentCount(formation: BattleFormationLive): number {
  const frame = formation.liveFrame;
  const formationIndex = formation.liveFrameFormationIndex;
  if (frame && formationIndex !== undefined) {
    return Math.max(frame.agentCounts[formationIndex] ?? 0, 0);
  }

  return formation.agents.length;
}

export interface BattleAgentFrameView {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  inMelee: boolean;
  detached: boolean;
  targetFormationId: string;
}

export function readBattleAgentFrame(
  formation: BattleFormationLive,
  localIndex: number,
  out: BattleAgentFrameView,
): BattleAgentFrameView | null {
  const frame = formation.liveFrame;
  if (!frame || formation.liveFrameFormationIndex === undefined || formation.liveAgentOffset === undefined) {
    const agent = formation.agents[localIndex];
    if (!agent) return null;
    out.x = agent.x;
    out.y = agent.y;
    out.velocityX = agent.velocityX ?? 0;
    out.velocityY = agent.velocityY ?? 0;
    out.inMelee = agent.inMelee;
    out.detached = agent.detached;
    out.targetFormationId = agent.targetFormationId;
    return out;
  }

  const agentIndex = formation.liveAgentOffset + localIndex;
  const numberOffset = agentIndex * BATTLE_FRAME_AGENT_NUMBER_STRIDE;
  const flags = frame.agentFlags[agentIndex] ?? 0;
  const targetFormationIndex = frame.agentTargetIndices[agentIndex] ?? -1;
  out.x = frame.agentNumbers[numberOffset] ?? 0;
  out.y = frame.agentNumbers[numberOffset + 1] ?? 0;
  out.velocityX = frame.agentNumbers[numberOffset + 2] ?? 0;
  out.velocityY = frame.agentNumbers[numberOffset + 3] ?? 0;
  out.inMelee = (flags & BATTLE_FRAME_AGENT_MELEE_FLAG) !== 0;
  out.detached = (flags & BATTLE_FRAME_AGENT_DETACHED_FLAG) !== 0;
  out.targetFormationId = targetFormationIndex >= 0 && targetFormationIndex < frame.formationIds.length
    ? frame.formationIds[targetFormationIndex]
    : '';
  return out;
}

function normaliseBattleData(data: GetBattleDataResponse): BattleDataLive {
  if (!data.found) {
    return { ...data, formations: [] };
  }

  return {
    ...data,
    attacker: {
      ...data.attacker,
      participants: arrayOrEmpty(data.attacker?.participants),
    },
    defender: {
      ...data.defender,
      participants: arrayOrEmpty(data.defender?.participants),
    },
    obstacles: arrayOrEmpty(data.obstacles),
    heightMap: arrayOrEmpty(data.heightMap),
    formations: arrayOrEmpty(data.formations).map(formation => ({
      ...formation,
      agents: [],
      waypoints: arrayOrEmpty(formation.waypoints),
      actions: arrayOrEmpty(formation.actions),
    })),
  };
}

function normaliseBattleFrame(data: BattleFrameLive): BattleFrameLive {
  if (isPackedBattleFrame(data)) {
    return data;
  }

  if (!data.found) {
    return data;
  }

  return {
    ...data,
    formations: arrayOrEmpty(data.formations).map(formation => ({
      ...formation,
      agents: arrayOrEmpty(formation.agents),
      waypoints: arrayOrEmpty(formation.waypoints),
    })),
  };
}

function applyBattleFrame(
  battle: BattleDataLive,
  frame: BattleFrameLive | null,
): BattleDataLive {
  if (!frame?.found || !battle.found || frame.id !== battle.id) {
    return battle;
  }

  const existingFormations = new Map(battle.formations.map(formation => [formation.id, formation]));
  const mergedFormations: BattleFormationLive[] = [];

  if (isPackedBattleFrame(frame)) {
    let waypointOffset = 0;
    let agentOffset = 0;
    for (let formationIndex = 0; formationIndex < frame.formationIds.length; formationIndex += 1) {
      const formationId = frame.formationIds[formationIndex];
      const formation = existingFormations.get(formationId);
      const waypointCount = Math.max(frame.waypointCounts[formationIndex] ?? 0, 0);
      const currentWaypointOffset = waypointOffset;
      waypointOffset += waypointCount * 2;
      const currentAgentOffset = agentOffset;
      agentOffset += Math.max(frame.agentCounts[formationIndex] ?? 0, 0);
      if (!formation) continue;

      const numberOffset = formationIndex * BATTLE_FRAME_FORMATION_NUMBER_STRIDE;
      const flags = frame.formationFlags[formationIndex] ?? 0;
      const targetFormationIndex = frame.formationTargetIndices[formationIndex] ?? -1;
      const targetFormationId = targetFormationIndex >= 0 && targetFormationIndex < frame.formationIds.length
        ? frame.formationIds[targetFormationIndex]
        : '';
      const waypoints = [];
      for (let index = 0; index < waypointCount; index += 1) {
        const offset = currentWaypointOffset + index * 2;
        waypoints.push({
          x: frame.waypointNumbers[offset] ?? 0,
          y: frame.waypointNumbers[offset + 1] ?? 0,
        });
      }

      const isRouting = (flags & BATTLE_FRAME_FORMATION_ROUTING_FLAG) !== 0;
      const isWithdrawing = (flags & BATTLE_FRAME_FORMATION_WITHDRAWING_FLAG) !== 0;
      mergedFormations.push({
        ...formation,
        strength: frame.formationNumbers[numberOffset] ?? 0,
        maxStrength: frame.formationNumbers[numberOffset + 1] ?? 0,
        losses: frame.formationNumbers[numberOffset + 2] ?? 0,
        healthPercent: frame.formationNumbers[numberOffset + 3] ?? 0,
        morale: frame.formationNumbers[numberOffset + 4] ?? formation.morale,
        positionX: frame.formationNumbers[numberOffset + 5] ?? 0,
        positionY: frame.formationNumbers[numberOffset + 6] ?? 0,
        rotation: frame.formationNumbers[numberOffset + 7] ?? 0,
        zIndex: frame.formationNumbers[numberOffset + 8] ?? 0,
        attackChargePercent: frame.formationNumbers[numberOffset + 9] ?? 0,
        hasManualTarget: (flags & BATTLE_FRAME_FORMATION_MANUAL_TARGET_FLAG) !== 0,
        isRouting,
        isWithdrawing,
        agents: [],
        liveFrame: frame,
        liveFrameFormationIndex: formationIndex,
        liveAgentOffset: currentAgentOffset,
        isCommandable: formation.isPlayerControlled && !isRouting && !isWithdrawing,
        targetFormationId,
        targetFormationName: targetFormationId ? existingFormations.get(targetFormationId)?.name ?? formation.targetFormationName : '',
        waypoints,
      });
    }

    return mergeBattleSideSummaries(battle, mergedFormations);
  }

  for (const next of frame.formations) {
    const formation = existingFormations.get(next.id);
    if (!formation) continue;

    const isRouting = next.isRouting;
    const isWithdrawing = next.isWithdrawing;

    mergedFormations.push({
      ...formation,
      strength: next.strength,
      maxStrength: next.maxStrength,
      losses: next.losses,
      healthPercent: next.healthPercent,
      morale: Number.isFinite(next.morale) ? next.morale : formation.morale,
      positionX: next.positionX,
      positionY: next.positionY,
      rotation: next.rotation,
      zIndex: next.zIndex,
      attackChargePercent: next.attackChargePercent,
      hasManualTarget: next.hasManualTarget,
      isRouting,
      isWithdrawing,
      agents: next.agents,
      isCommandable: formation.isPlayerControlled && !isRouting && !isWithdrawing,
      targetFormationId: next.targetFormationId,
      targetFormationName: next.targetFormationName
        || (next.targetFormationId ? existingFormations.get(next.targetFormationId)?.name ?? formation.targetFormationName : ''),
      waypoints: next.waypoints,
    });
  }

  return mergeBattleSideSummaries(battle, mergedFormations);
}

function mergeBattleSideSummaries(
  battle: BattleDataLive,
  mergedFormations: BattleFormationLive[],
): BattleDataLive {
  const sideMorale = (side: string): number | null => {
    let weightedMorale = 0;
    let totalWeight = 0;
    for (const formation of mergedFormations) {
      if (formation.side !== side || formation.strength <= 0 || !Number.isFinite(formation.morale)) {
        continue;
      }
      const weight = Math.max(formation.strength, 1);
      weightedMorale += formation.morale * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedMorale / totalWeight * 100 : null;
  };

  const attackerMorale = sideMorale('attacker');
  const defenderMorale = sideMorale('defender');
  const sideStrength = (side: string): number => mergedFormations.reduce(
    (total, formation) => formation.side === side ? total + formation.strength : total,
    0,
  );
  const participantStrengths = (side: string): Map<string, number> => {
    const totals = new Map<string, number>();
    for (const formation of mergedFormations) {
      if (formation.side !== side || !formation.militaryId) continue;
      totals.set(formation.militaryId, (totals.get(formation.militaryId) ?? 0) + formation.strength);
    }
    return totals;
  };
  const refreshParticipants = (
    participants: typeof battle.attacker.participants,
    strengths: Map<string, number>,
  ): typeof battle.attacker.participants => participants.map(participant => {
    const strength = strengths.get(participant.id);
    if (strength === undefined) return participant;
    return {
      ...participant,
      strength,
      losses: Math.max(participant.maxStrength - strength, 0),
    };
  });
  const attackerParticipantStrengths = participantStrengths('attacker');
  const defenderParticipantStrengths = participantStrengths('defender');
  const attackerStrength = sideStrength('attacker');
  const defenderStrength = sideStrength('defender');

  return {
    ...battle,
    attacker: {
      ...battle.attacker,
      participants: refreshParticipants(battle.attacker.participants, attackerParticipantStrengths),
      totalStrength: attackerStrength,
      losses: Math.max(battle.attacker.totalMaxStrength - attackerStrength, 0),
      morale: attackerMorale === null ? battle.attacker.morale : attackerMorale,
    },
    defender: {
      ...battle.defender,
      participants: refreshParticipants(battle.defender.participants, defenderParticipantStrengths),
      totalStrength: defenderStrength,
      losses: Math.max(battle.defender.totalMaxStrength - defenderStrength, 0),
      morale: defenderMorale === null ? battle.defender.morale : defenderMorale,
    },
    formations: mergedFormations,
  };
}

export function useBattleBridge(battleId?: string | null): BattleDataLive | null {
  const live = useBridgeQuery({
    action: 'game.get_battle_data',
    payload: { battleId: battleId ?? '' },
    map: (data) => {
      const next = normaliseBattleData(data);
      if (next.found) battleCache.set(next.id, next);
      else if (next.id) battleCache.delete(next.id);
      return next;
    },
    fetch: !getruntimeEngine(),
    matchPush: (data) => !battleId || data.id === battleId,
  });

  const frame = useBridgeQuery({
    action: 'game.get_battle_frame',
    payload: { battleId: battleId ?? '' },
    map: data => normaliseBattleFrame(data),
    fetch: !getruntimeEngine(),
    matchPush: (data) => !battleId || data.id === battleId,
  });

  if (live && !live.found) return live;

  const cached = battleId ? battleCache.get(battleId) ?? null : null;
  const base = live ?? cached;
  return base ? applyBattleFrame(base, frame) : null;
}

export function startBattleActionBridge(
  battleId: string,
  formationId: string,
  actionId: string,
): Promise<StartBattleActionResponse> {
  return bridgeCall('game.start_battle_action', { battleId, formationId, actionId });
}

export function setBattleFormationStanceBridge(
  battleId: string,
  formationId: string,
  stance: string,
): Promise<SetBattleFormationStanceResponse> {
  return bridgeCall('game.set_battle_formation_stance', { battleId, formationId, stance });
}

export function setBattleFormationOrderBridge(
  battleId: string,
  formationId: string,
  order: { waypoints?: BattlePoint[]; targetFormationId?: string },
): Promise<SetBattleFormationOrderResponse> {
  return bridgeCall('game.set_battle_formation_order', {
    battleId,
    formationId,
    targetFormationId: order.targetFormationId ?? '',
    waypoints: order.waypoints ?? [],
  });
}

export function requestBattleRetreatBridge(
  battleId: string,
  militaryId: string,
): Promise<RequestBattleRetreatResponse> {
  return bridgeCall('game.request_battle_retreat', { battleId, militaryId });
}

export function withdrawBattleFormationBridge(
  battleId: string,
  formationId: string,
): Promise<WithdrawBattleFormationResponse> {
  return bridgeCall('game.withdraw_battle_formation', { battleId, formationId });
}

export function hideBattleScreenBridge(): Promise<void> {
  return bridgeCall('ui.show_screen', { screen: '' }).then(() => undefined);
}
