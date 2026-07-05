import { useCallback } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetSettlementInteractionsResponse,
  SettlementInteractionEntry,
} from '../../bridge-types.generated.ts';
import type { DisplayTextLine } from '../../data/types';
import { interactionAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type InteractionAvailability = 'available' | 'greyed' | 'hidden';
export type InteractionScope = 'settlement' | 'region';

export interface SettlementInteractionView {
  id: string;
  name: string;
  description: string;
  /** Small icon rendered on the left of the card. */
  iconUrl: string | undefined;
  /** Scenic background image for the card. */
  backgroundUrl: string | undefined;
  scope: InteractionScope;
  goldCost: number;
  durationDays: number;
  cooldownDays: number;
  /** Days remaining until this action comes off cooldown, 0 if ready. */
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
  needsDestinationSelection: boolean;
}

export interface SettlementInteractionsState {
  settlementId: string;
  interactions: SettlementInteractionView[];
  /** Id of the most recently completed interaction, or empty string if none. */
  lastCompletedInteractionId: string;
  /** Whether the most recent completion succeeded. */
  lastInteractionSucceeded: boolean;
  /** Game-date (day index) of the most recent completion. */
  lastInteractionCompletedDate: number;
  /** Short result text for the most recent completion. */
  lastInteractionOutcomeText: string;
}

function toAvailability(raw: string): InteractionAvailability {
  return raw === 'available' || raw === 'greyed' || raw === 'hidden' ? raw : 'greyed';
}

function toScope(raw: string): InteractionScope {
  return raw === 'region' ? 'region' : 'settlement';
}

function iconUrl(iconId: string): string | undefined {
  return interactionAssetPath(iconId, '/assets/settlement-interactions/icons/');
}

function backgroundUrl(bgId: string): string | undefined {
  return interactionAssetPath(bgId, '/assets/settlement-interactions/backgrounds/');
}

function mapEntry(e: SettlementInteractionEntry): SettlementInteractionView {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    iconUrl: iconUrl(e.iconId),
    backgroundUrl: backgroundUrl(e.backgroundId),
    scope: toScope(e.scope),
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
    needsDestinationSelection: e.needsDestinationSelection,
  };
}

function mapResponse(data: GetSettlementInteractionsResponse): SettlementInteractionsState {
  return {
    settlementId: data.settlementId,
    interactions: data.interactions.map(mapEntry),
    lastCompletedInteractionId: data.lastCompletedInteractionId,
    lastInteractionSucceeded: data.lastInteractionSucceeded,
    lastInteractionCompletedDate: data.lastInteractionCompletedDate,
    lastInteractionOutcomeText: data.lastInteractionOutcomeText,
  };
}

export interface SettlementInteractionsBridge {
  state: SettlementInteractionsState | null;
  start: (interactionId: string) => void;
  cancel: () => void;
}

/**
 * Live list of settlement interactions for the given settlement, plus callbacks
 * for starting or cancelling them. Subscribes to bridge pushes so progress
 * updates as game days tick by.
 */
export function useSettlementInteractionsBridge(settlementId: string | null): SettlementInteractionsBridge {
  const queriedState = useBridgeQuery({
    action: 'game.get_settlement_interactions',
    payload: settlementId ? { settlementId } : null,
    map: mapResponse,
    matchPush: (data) => data.settlementId === settlementId,
  });
  const state = queriedState?.settlementId === settlementId ? queriedState : null;

  const start = useCallback((interactionId: string) => {
    if (!settlementId) return;
    bridgeCall('game.start_settlement_interaction', { settlementId, interactionId }).catch(acknowledgeBridgeFailure);
  }, [settlementId]);

  const cancel = useCallback(() => {
    if (!settlementId) return;
    bridgeCall('game.cancel_settlement_interaction', { settlementId }).catch(acknowledgeBridgeFailure);
  }, [settlementId]);

  return { state, start, cancel };
}
