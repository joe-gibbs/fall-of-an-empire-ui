/**
 * Bridge-backed data-access layer.
 */
import { useSettlementBridge } from '../bridge/settlements-economy/useSettlementBridge';
import { usePersonBridge } from '../bridge/characters/usePersonBridge';
import { useFactionBridge, type FactionBridgeScope } from '../bridge/diplomacy/useFactionBridge';
import { usePlayerFactionBridge, usePlayerFactionSummaryBridge } from '../bridge/app/usePlayerFactionBridge';
import { useMilitaryBridge, useMilitaryOverviewBridge, useSelectedMilitariesBridge } from '../bridge/military-map/useMilitaryBridge';
import {
  useAgentCandidatesBridge,
  type AgentCandidatesResult,
} from '../bridge/characters/useAgentCandidatesBridge';
import {
  useCourtPositionsBridge,
  useCourtCandidatesBridge,
  type CourtPositionsResult,
} from '../bridge/characters/useCourtPositionsBridge';
import {
  useCourtAppointmentContestsBridge,
  type CourtAppointmentContestsResult,
} from '../bridge/characters/useCourtAppointmentContestsBridge';
import {
  useDiocesesBridge,
  useBishopCandidatesBridge,
  type DiocesesResult,
} from '../bridge/settlements-economy/useDiocesesBridge';
import {
  useRegionGovernorCandidatesBridge,
  type RegionGovernorCandidateView,
} from '../bridge/settlements-economy/useSettlementManagementBridge';
import {
  useProvinceModeOverviewBridge,
  type ProvinceModeOverview,
} from '../bridge/provinces/useProvinceModeOverviewBridge';
import type { Settlement, Character, Faction, Army, MilitaryOverview } from '../data/types';
import type { PlayerFactionSummary } from '../bridge/app/usePlayerFactionBridge';

export function useSettlement(id: string | null | undefined): Settlement | null {
  return useSettlementBridge(id ?? null);
}

export function usePerson(id: string | null | undefined): Character | null {
  return usePersonBridge(id);
}

export function useMilitary(id: string | null | undefined): Army | null {
  return useMilitaryBridge(id);
}

export function useMilitaryOverview(fetch = true): MilitaryOverview | null {
  return useMilitaryOverviewBridge(fetch);
}

export function useSelectedMilitaries(): MilitaryOverview['forces'] | null {
  return useSelectedMilitariesBridge();
}

export function useFaction(id: string | null | undefined, scope: FactionBridgeScope = 'full', fetch = true): Faction | null {
  return useFactionBridge(id, scope, fetch);
}

export function usePlayerFactionId(): string | null {
  return usePlayerFactionBridge();
}

export function usePlayerFactionSummary(): PlayerFactionSummary | null {
  return usePlayerFactionSummaryBridge();
}

export function useAgentCandidates(role: 'diplomat' | 'spy' | null, targetFactionId: string | null): AgentCandidatesResult | null {
  return useAgentCandidatesBridge(role, targetFactionId);
}

export function useCourtPositions(enabled: boolean): CourtPositionsResult | null {
  return useCourtPositionsBridge(enabled);
}

export function useCourtCandidates(positionKey: string | null): Character[] | null {
  return useCourtCandidatesBridge(positionKey);
}

export function useCourtAppointmentContests(enabled: boolean): CourtAppointmentContestsResult | null {
  return useCourtAppointmentContestsBridge(enabled);
}

export function useDioceses(religionKey: string | null): DiocesesResult | null {
  return useDiocesesBridge(religionKey);
}

export function useBishopCandidates(religionKey: string | null): Character[] | null {
  return useBishopCandidatesBridge(religionKey);
}

export function useRegionGovernorCandidates(settlementId: string | null): RegionGovernorCandidateView[] | null {
  return useRegionGovernorCandidatesBridge(settlementId);
}

export function useProvinceModeOverview(enabled: boolean): ProvinceModeOverview | null {
  return useProvinceModeOverviewBridge(enabled);
}
