import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  BureaucraticThroughputSourceDetail as BureaucraticThroughputSourceDetailDto,
  BureaucraticThroughputSourceEntry,
  GetBureaucraticThroughputResponse,
  RushBureaucraticActionResponse,
} from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { dispatchFactionData } from '../diplomacy/useFactionBridge';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { useGameState } from '../../context/GameContext';

export type BureaucraticThroughputStateName = 'stable' | 'strained' | 'overloaded';
export type BureaucraticThroughputSourceKind = 'capacity' | 'load';

export interface BureaucraticThroughputSourceDetail {
  id: string;
  label: string;
  kind: BureaucraticThroughputSourceKind;
  value: number;
}

export interface BureaucraticThroughputSource {
  id: string;
  label: string;
  kind: BureaucraticThroughputSourceKind;
  category: string;
  value: number;
  expiresInDays: number;
  expiresOnDate: number;
  details: BureaucraticThroughputSourceDetail[];
}

export interface BureaucraticThroughputState {
  capacity: number;
  currentLoad: number;
  overload: number;
  overloadPenaltyPercent: number;
  state: BureaucraticThroughputStateName;
  policyChanges: number;
  activeEdicts: number;
  activeInteractions: number;
  directAdministration: number;
  provincePressure: number;
  vacantOffices: number;
  rushPressure: number;
  sources: BureaucraticThroughputSource[];
}

export interface RushBureaucraticActionRequest {
  targetFactionId?: string;
  targetId?: string;
  actionKind: 'policy' | 'edict' | 'interaction' | 'spy' | 'person' | 'settlement' | 'bloc';
  actionId: string;
}

function sourceKind(kind: string): BureaucraticThroughputSourceKind {
  return kind === 'capacity' ? 'capacity' : 'load';
}

function stateName(state: string): BureaucraticThroughputStateName {
  if (state === 'strained' || state === 'overloaded') return state;
  return 'stable';
}

function mapSourceDetail(detail: BureaucraticThroughputSourceDetailDto): BureaucraticThroughputSourceDetail {
  return {
    id: detail.sourceId,
    label: detail.label,
    kind: sourceKind(detail.kind),
    value: detail.value,
  };
}

function mapSource(source: BureaucraticThroughputSourceEntry): BureaucraticThroughputSource {
  return {
    id: source.sourceId,
    label: source.label,
    kind: sourceKind(source.kind),
    category: source.category,
    value: source.value,
    expiresInDays: source.expiresInDays,
    expiresOnDate: source.expiresOnDate,
    details: source.details.map(mapSourceDetail),
  };
}

function mapResponse(data: GetBureaucraticThroughputResponse): BureaucraticThroughputState {
  return {
    capacity: data.capacity,
    currentLoad: data.currentLoad,
    overload: data.overload,
    overloadPenaltyPercent: data.overloadPenaltyPercent,
    state: stateName(data.state),
    policyChanges: data.policyChanges,
    activeEdicts: data.activeEdicts,
    activeInteractions: data.activeInteractions,
    directAdministration: data.directAdministration,
    provincePressure: data.provincePressure,
    vacantOffices: data.vacantOffices,
    rushPressure: data.rushPressure,
    sources: data.sources.map(mapSource),
  };
}

export function useBureaucraticThroughputBridge(): BureaucraticThroughputState | null {
  const { gameDay } = useGameState();
  const state = useBridgeQuery({
    action: 'game.get_bureaucratic_throughput',
    map: mapResponse,
  });
  if (!state) return null;

  return {
    ...state,
    sources: state.sources.map(source => ({
      ...source,
      expiresInDays: source.expiresOnDate > 0
        ? Math.max(0, source.expiresOnDate - gameDay)
        : 0,
    })),
  };
}

export async function rushBureaucraticAction({
  targetFactionId = '',
  targetId = '',
  actionKind,
  actionId,
}: RushBureaucraticActionRequest): Promise<RushBureaucraticActionResponse | null> {
  try {
    const response = await bridgeCall('game.rush_bureaucratic_action', {
      targetFactionId,
      targetId,
      actionKind,
      actionId,
    });
    if (response.rushed && targetFactionId) {
      const freshFaction = await bridgeCall('game.get_faction_data', { factionId: targetFactionId, scope: 'full' });
      dispatchFactionData(freshFaction);
    }
    return response;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return null;
  }
}
