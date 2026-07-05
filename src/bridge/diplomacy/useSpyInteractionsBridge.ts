import { useCallback } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  BridgeFactionInteractionProvidedInput,
  GetSpyInteractionsResponse,
  SpyInteractionEntry,
  StartSpyInteractionResponse,
} from '../../bridge-types.generated.ts';
import type { DisplayTextLine } from '../../data/types';
import { interactionAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type InteractionAvailability = 'available' | 'greyed' | 'hidden';

export interface SpyInteractionView {
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
  needsInputSelection: boolean;
  canStartInputSelection: boolean;
  reasons: { reason: string; status: InteractionAvailability }[];
  successFactors: { name: string; percent: number }[];
  effectLines: DisplayTextLine[];
}

export interface SpyInteractionsState {
  targetFactionId: string;
  interactions: SpyInteractionView[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

function toAvailability(raw: string): InteractionAvailability {
  return raw === 'available' || raw === 'greyed' || raw === 'hidden' ? raw : 'greyed';
}

function iconUrl(key: string): string | undefined {
  return interactionAssetPath(key, '/assets/spy-interactions/icons/');
}

function backgroundUrl(key: string): string | undefined {
  return interactionAssetPath(key, '/assets/spy-interactions/backgrounds/');
}

function mapEntry(e: SpyInteractionEntry): SpyInteractionView {
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
    needsInputSelection: e.needsInputSelection,
    canStartInputSelection: e.canStartInputSelection,
    reasons: e.reasons.map(r => ({ reason: r.reason, status: toAvailability(r.status) })),
    successFactors: e.successFactors.map(f => ({ name: f.name, percent: f.percent })),
    effectLines: e.effectLines ?? [],
  };
}

function mapResponse(data: GetSpyInteractionsResponse): SpyInteractionsState {
  return {
    targetFactionId: data.targetFactionId,
    interactions: data.interactions.map(mapEntry),
    lastCompletedInteractionId: data.lastCompletedInteractionId,
    lastInteractionSucceeded: data.lastInteractionSucceeded,
    lastInteractionCompletedDate: data.lastInteractionCompletedDate,
    lastInteractionOutcomeText: data.lastInteractionOutcomeText,
  };
}

export interface SpyInteractionsBridge {
  state: SpyInteractionsState | null;
  start: (
    interactionId: string,
    providedInputs?: BridgeFactionInteractionProvidedInput[],
  ) => Promise<StartSpyInteractionResponse | null>;
  cancel: () => void;
}

/**
 * Live list of spy interactions against the given target faction, plus
 * callbacks for starting or cancelling them. Spy interactions live on a
 * separate slot (FactionCharacterComponent::CurrentSpyInteraction) from
 * diplomacy, so this hook is deliberately distinct from
 * useFactionInteractionsBridge.
 */
export function useSpyInteractionsBridge(targetFactionId: string | null): SpyInteractionsBridge {
  const queriedState = useBridgeQuery({
    action: 'game.get_spy_interactions',
    payload: targetFactionId ? { targetFactionId } : null,
    map: mapResponse,
    matchPush: (data) => data.targetFactionId === targetFactionId,
  });
  const state = queriedState?.targetFactionId === targetFactionId ? queriedState : null;

  const start = useCallback(async (
    interactionId: string,
    providedInputs: BridgeFactionInteractionProvidedInput[] = [],
  ): Promise<StartSpyInteractionResponse | null> => {
    if (!targetFactionId) return null;
    try {
      return await bridgeCall('game.start_spy_interaction', { targetFactionId, interactionId, providedInputs });
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [targetFactionId]);

  const cancel = useCallback(() => {
    if (!targetFactionId) return;
    bridgeCall('game.cancel_spy_interaction', { targetFactionId }).catch(acknowledgeBridgeFailure);
  }, [targetFactionId]);

  return { state, start, cancel };
}
