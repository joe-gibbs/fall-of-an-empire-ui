import { useCallback } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetBlocInteractionsResponse,
  BlocInteractionEntry,
} from '../../bridge-types.generated.ts';
import type { DisplayTextLine } from '../../data/types';
import { interactionAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type InteractionAvailability = 'available' | 'greyed' | 'hidden';

export interface BlocInteractionView {
  id: string;
  name: string;
  description: string;
  iconUrl: string | undefined;
  backgroundUrl: string | undefined;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  cooldownRemainingDays: number;
  availability: InteractionAvailability;
  inProgress: boolean;
  remainingDays: number;
  bureaucraticLoad: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  successChancePercent: number;
  reasons: { reason: string; status: InteractionAvailability }[];
  successFactors: { name: string; percent: number }[];
  effectLines: DisplayTextLine[];
  needsLoanSelection: boolean;
  grossRevenue: number;
  currentLandownerDebt: number;
  currentLandownerMonthlyInterest: number;
  loanOptions: BlocLoanOptionView[];
}

export interface BlocLoanOptionView {
  index: number;
  revenueMonths: number;
  amount: number;
  monthlyInterest: number;
  name: string;
  description: string;
  iconPath: string;
}

export interface BlocInteractionsState {
  blocId: string;
  interactions: BlocInteractionView[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

function toAvailability(raw: string): InteractionAvailability {
  return raw === 'available' || raw === 'greyed' || raw === 'hidden' ? raw : 'greyed';
}

function interactionAssetUrl(key: string, basePath: string): string | undefined {
  return interactionAssetPath(key, basePath);
}

function iconUrl(key: string): string | undefined {
  return interactionAssetUrl(key, '/assets/bloc-interactions/icons/');
}

function backgroundUrl(key: string): string | undefined {
  return interactionAssetUrl(key, '/assets/bloc-interactions/backgrounds/');
}

function mapEntry(e: BlocInteractionEntry): BlocInteractionView {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    iconUrl: iconUrl(e.iconId),
    backgroundUrl: backgroundUrl(e.backgroundId),
    goldCost: e.goldCost,
    durationDays: e.durationDays,
    cooldownDays: e.cooldownDays,
    cooldownRemainingDays: e.cooldownRemainingDays,
    availability: toAvailability(e.availability),
    inProgress: e.inProgress,
    remainingDays: e.remainingDays,
    bureaucraticLoad: e.bureaucraticLoad,
    bureaucraticRushDaysSaved: e.bureaucraticRushDaysSaved,
    bureaucraticRushLoad: e.bureaucraticRushLoad,
    successChancePercent: e.successChancePercent,
    reasons: e.reasons.map(r => ({ reason: r.reason, status: toAvailability(r.status) })),
    successFactors: e.successFactors.map(f => ({ name: f.name, percent: f.percent })),
    effectLines: e.effectLines ?? [],
    needsLoanSelection: e.needsLoanSelection,
    grossRevenue: e.grossRevenue,
    currentLandownerDebt: e.currentLandownerDebt,
    currentLandownerMonthlyInterest: e.currentLandownerMonthlyInterest,
    loanOptions: e.loanOptions.map(option => ({
      index: option.index,
      revenueMonths: option.revenueMonths,
      amount: option.amount,
      monthlyInterest: option.monthlyInterest,
      name: option.name,
      description: option.description,
      iconPath: option.iconPath,
    })),
  };
}

function mapResponse(data: GetBlocInteractionsResponse): BlocInteractionsState {
  return {
    blocId: data.blocId,
    interactions: data.interactions.map(mapEntry),
    lastCompletedInteractionId: data.lastCompletedInteractionId,
    lastInteractionSucceeded: data.lastInteractionSucceeded,
    lastInteractionCompletedDate: data.lastInteractionCompletedDate,
    lastInteractionOutcomeText: data.lastInteractionOutcomeText,
  };
}

export interface BlocInteractionsBridge {
  state: BlocInteractionsState | null;
  start: (interactionId: string, loanOptionIndex?: number) => Promise<string | null>;
  cancel: () => void;
}

/**
 * Live list of interactions against the given power bloc. Power-bloc actions
 * can be instant (Duration=0) or deferred (Duration>0); both roll for success
 * inside the same Execute() call.
 */
export function useBlocInteractionsBridge(blocId: string | null): BlocInteractionsBridge {
  const queriedState = useBridgeQuery({
    action: 'game.get_bloc_interactions',
    payload: blocId ? { blocId } : null,
    map: mapResponse,
    matchPush: (data) => data.blocId === blocId,
  });
  const state = queriedState?.blocId === blocId ? queriedState : null;

  const start = useCallback(async (interactionId: string, loanOptionIndex = -1): Promise<string | null> => {
    if (!blocId) return null;
    try {
      const response = await bridgeCall('game.start_bloc_interaction', { blocId, interactionId, loanOptionIndex });
      return response.started ? null : response.message;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return 'bridge-error';
    }
  }, [blocId]);

  const cancel = useCallback(() => {
    if (!blocId) return;
    bridgeCall('game.cancel_bloc_interaction', { blocId }).catch(acknowledgeBridgeFailure);
  }, [blocId]);

  return { state, start, cancel };
}
