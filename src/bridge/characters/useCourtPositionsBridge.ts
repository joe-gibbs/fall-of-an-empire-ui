import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { mapPortraitLayers, mapPortraitPath } from './portraitMapping';
import type {
  GetCourtPositionsResponse,
  GetCourtCandidatesResponse,
  CourtCandidate,
} from '../../bridge-types.generated.ts';
import type { Character, PersonActivity } from '../../data/types';

/** One imperial court position, as rendered by the Imperial Court tab. */
export interface CourtPositionView {
  /** Stable backend key - pass back to appoint/dismiss actions. */
  key: string;
  name: string;
  description: string;
  /** Primary stat slug, e.g. 'tactics', 'authority', 'cunning', 'governance'. */
  primaryStat: string;
  bonusLabel: string;
  /** Raw bonus parameters are retained for display context; bonusText is authoritative. */
  bonusMultiplier: number;
  bonusDecimals: number;
  bonusSuffix: string;
  bonusIsNegative: boolean;
  statTotal: number;
  bonusValue: number;
  bonusText: string;
  bureaucraticCapacity: number;
  courtFactionId?: string;
  courtFactionName?: string;
  appointmentTermDays?: number;
  appointmentTermYears?: number;
  appointmentContestWindowDays?: number;
  holderStartDate?: number;
  holderStartDateText?: string;
  holderEndDate?: number;
  holderEndDateText?: string;
  holderDaysRemaining?: number;
  holderTermComplete?: boolean;
  appointmentContestOpen?: boolean;
  earlyReplacementPenaltyActive?: boolean;
  earlyReplacementTermDaysRemaining?: number;
  earlyReplacementHolderOpinionPenalty?: number;
  earlyReplacementFriendOpinionPenalty?: number;
  earlyReplacementFriendCount?: number;
  earlyReplacementPowerBlocHappinessPenalty?: number;
  earlyReplacementPowerBlocName?: string;
  earlyReplacementPenaltyDurationDays?: number;
  canPlayerEnterContest?: boolean;
  playerEnteredContest?: boolean;
  playerContestScore?: number;
  playerContestRank?: number;
  contestCandidateCount?: number;
  leadingContestCandidateName?: string;
  leadingContestCandidateScore?: number;
  holder: {
    id: string;
    name: string;
    portrait: string;
    statValue: number;
    isPlayerCharacter?: boolean;
  } | null;
  subordinates: {
    id: string;
    name: string;
    portrait: string;
    statValue: number;
    statContribution: number;
    isPlayerCharacter?: boolean;
    startDate?: number;
    startDateText?: string;
    endDate?: number;
    endDateText?: string;
    daysRemaining?: number;
    termComplete?: boolean;
    appointmentContestOpen?: boolean;
  }[];
}

export interface CourtPositionsResult {
  positions: CourtPositionView[];
  maxSubordinates: number;
  autoAssignCourtEnabled: boolean;
  courtFactionId: string;
  courtFactionName: string;
}

function mapResponse(data: GetCourtPositionsResponse): CourtPositionsResult {
  return {
    autoAssignCourtEnabled: data.autoAssignCourtEnabled,
    maxSubordinates: data.maxSubordinates,
    courtFactionId: data.courtFactionId,
    courtFactionName: data.courtFactionName,
    positions: data.positions.map(p => ({
      key: p.key,
      name: p.name,
      description: p.description,
      primaryStat: p.primaryStat,
      bonusLabel: p.bonusLabel,
      bonusMultiplier: p.bonusMultiplier,
      bonusDecimals: p.bonusDecimals,
      bonusSuffix: p.bonusSuffix,
      bonusIsNegative: p.bonusIsNegative,
      statTotal: p.statTotal,
      bonusValue: p.bonusValue,
      bonusText: p.bonusText,
      bureaucraticCapacity: p.bureaucraticCapacity,
      appointmentTermDays: p.appointmentTermDays,
      appointmentTermYears: p.appointmentTermYears,
      appointmentContestWindowDays: p.appointmentContestWindowDays,
      holderStartDate: p.holderStartDate,
      holderStartDateText: p.holderStartDateText,
      holderEndDate: p.holderEndDate,
      holderEndDateText: p.holderEndDateText,
      holderDaysRemaining: p.holderDaysRemaining,
      holderTermComplete: p.holderTermComplete,
      appointmentContestOpen: p.appointmentContestOpen,
      earlyReplacementPenaltyActive: p.earlyReplacementPenaltyActive,
      earlyReplacementTermDaysRemaining: p.earlyReplacementTermDaysRemaining,
      earlyReplacementHolderOpinionPenalty: p.earlyReplacementHolderOpinionPenalty,
      earlyReplacementFriendOpinionPenalty: p.earlyReplacementFriendOpinionPenalty,
      earlyReplacementFriendCount: p.earlyReplacementFriendCount,
      earlyReplacementPowerBlocHappinessPenalty: p.earlyReplacementPowerBlocHappinessPenalty,
      earlyReplacementPowerBlocName: p.earlyReplacementPowerBlocName,
      earlyReplacementPenaltyDurationDays: p.earlyReplacementPenaltyDurationDays,
      canPlayerEnterContest: p.canPlayerEnterContest,
      playerEnteredContest: p.playerEnteredContest,
      playerContestScore: p.playerContestScore,
      playerContestRank: p.playerContestRank,
      contestCandidateCount: p.contestCandidateCount,
      leadingContestCandidateName: p.leadingContestCandidateName,
      leadingContestCandidateScore: p.leadingContestCandidateScore,
      courtFactionId: data.courtFactionId,
      courtFactionName: data.courtFactionName,
      holder: p.holderId
        ? { id: p.holderId, name: p.holderName, portrait: '', statValue: p.holderStatValue, isPlayerCharacter: p.holderIsPlayerCharacter }
        : null,
      subordinates: p.subordinates.map(s => ({
        id: s.id,
        name: s.name,
        portrait: '',
        statValue: s.statValue,
        statContribution: s.statContribution,
        isPlayerCharacter: s.isPlayerCharacter,
        startDate: s.startDate,
        startDateText: s.startDateText,
        endDate: s.endDate,
        endDateText: s.endDateText,
        daysRemaining: s.daysRemaining,
        termComplete: s.termComplete,
        appointmentContestOpen: s.appointmentContestOpen,
      })),
    })),
  };
}

export function useCourtPositionsBridge(enabled: boolean): CourtPositionsResult | null {
  return useBridgeQuery({
    action: 'game.get_court_positions',
    payload: enabled ? undefined : null,
    map: mapResponse,
  });
}

function mapCandidate(c: CourtCandidate): Character {
  return {
    id: c.id,
    name: c.name,
    title: c.title,
    shortTitle: c.title,
    age: c.age,
    portrait: mapPortraitPath(c.portrait),
    portraitLayers: mapPortraitLayers(c.portraitLayers),
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
    traits: c.traits.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.id,
      description: t.description,
      isPositive: t.isPositive,
    })),
    honourDread: 0,
    fame: c.fame,
    activity: c.activity as PersonActivity,
    roleExperience: { military: 0, administrative: 0, diplomatic: 0, intrigue: 0 },
    compliance: 0,
    governedRegions: [],
    relationships: [],
    isAlive: true,
  };
}

export function useCourtCandidatesBridge(positionKey: string | null): Character[] | null {
  return useBridgeQuery({
    action: 'game.get_court_candidates',
    payload: positionKey ? { positionKey } : null,
    map: (data: GetCourtCandidatesResponse) => data.candidates.map(mapCandidate),
  });
}

/** Appoint a person (or dismiss by passing null/empty). Returns true on success. */
export async function appointToCourtPosition(positionKey: string, personId: string | null): Promise<boolean> {
  try {
    const response = await bridgeCall('game.appoint_to_court_position', {
      positionKey,
      personId: personId ?? '',
    });
    // Refresh the court positions so the UI picks up the change without a manual re-open.
    try {
      const fresh = await bridgeCall('game.get_court_positions');
      window.dispatchEvent(new CustomEvent('bridge:game.get_court_positions', { detail: fresh }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }
    return response.appointed || personId === null || personId === '';
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}

export async function setAutoAssignCourt(enabled: boolean): Promise<void> {
  await bridgeCall('game.set_auto_assign_court', { enabled });
  const fresh = await bridgeCall('game.get_court_positions');
  window.dispatchEvent(new CustomEvent('bridge:game.get_court_positions', { detail: fresh }));
}

export async function enterCourtAppointmentContest(positionKey: string): Promise<boolean> {
  try {
    const response = await bridgeCall('game.enter_court_appointment_contest', { positionKey });
    const fresh = await bridgeCall('game.get_court_positions');
    window.dispatchEvent(new CustomEvent('bridge:game.get_court_positions', { detail: fresh }));
    try {
      const contests = await bridgeCall('game.get_court_appointment_contests');
      window.dispatchEvent(new CustomEvent('bridge:game.get_court_appointment_contests', { detail: contests }));
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }
    return response.entered;
  } catch (error) {
    acknowledgeBridgeFailure(error);
    return false;
  }
}
