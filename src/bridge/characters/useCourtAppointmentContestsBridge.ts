import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { mapPortraitLayers, mapPortraitPath } from './portraitMapping';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import type { GetCourtAppointmentContestsResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export interface AppointmentContestCandidateView {
  id: string;
  name: string;
  provinceName: string;
  portrait: string;
  portraitLayers?: ReturnType<typeof mapPortraitLayers>;
  rank: number;
  totalScore: number;
  opinionScore: number;
  primaryStatScore: number;
  patronageScore: number;
  threatScore: number;
  multiContestMalus: number;
  isPlayerCharacter: boolean;
}

export interface AppointmentContestView {
  positionKey: string;
  title: string;
  description: string;
  category: string;
  primaryStat: string;
  icon: string;
  currentHolderId: string;
  currentHolderName: string;
  daysRemaining: number;
  availableInDays: number;
  contestWindowDays: number;
  termYears: number;
  isOpen: boolean;
  canPlayerEnter: boolean;
  playerEntryBlockReason: string;
  playerEntered: boolean;
  playerRank: number;
  candidates: AppointmentContestCandidateView[];
}

export interface CourtAppointmentContestsResult {
  courtFactionId: string;
  courtFactionName: string;
  contests: AppointmentContestView[];
}

function mapResponse(data: GetCourtAppointmentContestsResponse): CourtAppointmentContestsResult {
  return {
    courtFactionId: data.courtFactionId,
    courtFactionName: data.courtFactionName,
    contests: data.contests.map(contest => ({
      positionKey: contest.positionKey,
      title: contest.title,
      description: contest.description,
      category: contest.category,
      primaryStat: contest.primaryStat,
      icon: FoaeCefUIAssetPath(contest.icon) ?? '',
      currentHolderId: contest.currentHolderId,
      currentHolderName: contest.currentHolderName,
      daysRemaining: contest.daysRemaining,
      availableInDays: contest.availableInDays,
      contestWindowDays: contest.contestWindowDays,
      termYears: contest.termYears,
      isOpen: contest.isOpen,
      canPlayerEnter: contest.canPlayerEnter,
      playerEntryBlockReason: contest.playerEntryBlockReason,
      playerEntered: contest.playerEntered,
      playerRank: contest.playerRank,
      candidates: contest.candidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        provinceName: candidate.provinceName,
        portrait: mapPortraitPath(candidate.portrait),
        portraitLayers: mapPortraitLayers(candidate.portraitLayers),
        rank: candidate.rank,
        totalScore: candidate.totalScore,
        opinionScore: candidate.opinionScore,
        primaryStatScore: candidate.primaryStatScore,
        patronageScore: candidate.patronageScore,
        threatScore: candidate.threatScore,
        multiContestMalus: candidate.multiContestMalus,
        isPlayerCharacter: candidate.isPlayerCharacter,
      })),
    })),
  };
}

function mergeLightweightResponse(
  previous: CourtAppointmentContestsResult | null,
  incoming: CourtAppointmentContestsResult,
): CourtAppointmentContestsResult {
  if (!previous) return incoming;

  const previousByPosition = new Map(previous.contests.map(contest => [contest.positionKey, contest]));
  return {
    ...incoming,
    contests: incoming.contests.map(contest => {
      const previousContest = previousByPosition.get(contest.positionKey);
      if (!previousContest) return contest;
      return {
        ...contest,
        playerRank: contest.playerRank > 0 ? contest.playerRank : previousContest.playerRank,
        candidates: previousContest.candidates,
      };
    }),
  };
}

export function useCourtAppointmentContestsBridge(enabled: boolean): CourtAppointmentContestsResult | null {
  const [data, setData] = useState<CourtAppointmentContestsResult | null>(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;
    const unsubscribe = onBridgeEvent('game.get_court_appointment_contests', (raw) => {
      if (cancelled) return;
      const incoming = mapResponse(raw);
      setData(previous => raw.candidateDetailsIncluded ? incoming : mergeLightweightResponse(previous, incoming));
    });

    bridgeCall('game.get_court_appointment_contests')
      .then(raw => {
        if (cancelled) return;
        setData(mapResponse(raw));
      })
      .catch(error => {
        if (cancelled) return;
        acknowledgeBridgeFailure(error);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled]);

  return enabled ? data : null;
}
