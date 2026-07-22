import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
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

interface SettlementInteractionDailyPatch {
  settlementId: string;
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
  interactions: Array<{
    id: string;
    visible: boolean;
    availability: string;
    inProgress: boolean;
    remainingDays: number;
    cooldownRemainingDays: number;
    bureaucraticRushDaysSaved: number;
    bureaucraticRushLoad: number;
    successChancePercent: number;
    reasons: Array<{ reason: string; status: string }>;
  }>;
}

function isDailyPatch(value: unknown): value is SettlementInteractionDailyPatch {
  if (!value || typeof value !== 'object') return false;
  const patch = value as Partial<SettlementInteractionDailyPatch>;
  return typeof patch.settlementId === 'string' && Array.isArray(patch.interactions);
}

function applyDailyPatch(
  state: SettlementInteractionsState | null,
  patch: SettlementInteractionDailyPatch,
): SettlementInteractionsState | null {
  if (!state || state.settlementId !== patch.settlementId) return state;
  const updates = new Map(patch.interactions.map(entry => [entry.id, entry]));
  return {
    ...state,
    lastCompletedInteractionId: patch.lastCompletedInteractionId,
    lastInteractionSucceeded: patch.lastInteractionSucceeded,
    lastInteractionCompletedDate: patch.lastInteractionCompletedDate,
    lastInteractionOutcomeText: patch.lastInteractionOutcomeText,
    interactions: state.interactions
      .filter(interaction => updates.get(interaction.id)?.visible !== false)
      .map((interaction) => {
        const update = updates.get(interaction.id);
        if (!update) return interaction;
        return {
          ...interaction,
          availability: toAvailability(update.availability),
          inProgress: update.inProgress,
          remainingDays: update.remainingDays,
          cooldownRemainingDays: update.cooldownRemainingDays,
          bureaucraticRushDaysSaved: update.bureaucraticRushDaysSaved,
          bureaucraticRushLoad: update.bureaucraticRushLoad,
          successChancePercent: update.successChancePercent,
          reasons: update.reasons.map(reason => ({
            reason: reason.reason,
            status: toAvailability(reason.status),
          })),
        };
      }),
  };
}

function patchIntroducesVisibleInteraction(
  state: SettlementInteractionsState | null,
  patch: SettlementInteractionDailyPatch,
): boolean {
  if (!state || state.settlementId !== patch.settlementId) return false;
  const knownIds = new Set(state.interactions.map(interaction => interaction.id));
  return patch.interactions.some(interaction => interaction.visible && !knownIds.has(interaction.id));
}

/**
 * Live list of settlement interactions for the given settlement, plus callbacks
 * for starting or cancelling them. Subscribes to bridge pushes so progress
 * updates as game days tick by.
 */
export function useSettlementInteractionsBridge(settlementId: string | null): SettlementInteractionsBridge {
  const [interactionsState, setInteractionsState] = useState<SettlementInteractionsState | null>(null);
  const interactionsStateRef = useRef<SettlementInteractionsState | null>(null);

  useEffect(() => {
    interactionsStateRef.current = interactionsState;
  }, [interactionsState]);

  useEffect(() => {
    if (!settlementId) return undefined;

    let cancelled = false;
    let refreshInFlight = false;
    const unsubscribeFull = onBridgeEvent('game.get_settlement_interactions', (data) => {
      if (!cancelled && data.settlementId === settlementId) {
        setInteractionsState(mapResponse(data));
      }
    });
    const handleDailyPatch = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!cancelled && isDailyPatch(detail) && detail.settlementId === settlementId) {
        if (patchIntroducesVisibleInteraction(interactionsStateRef.current, detail)) {
          if (!refreshInFlight) {
            refreshInFlight = true;
            void bridgeCall('game.get_settlement_interactions', { settlementId })
              .then((data) => {
                if (!cancelled) setInteractionsState(mapResponse(data));
              })
              .catch((error) => {
                if (!cancelled) acknowledgeBridgeFailure(error);
              })
              .finally(() => {
                refreshInFlight = false;
              });
          }
          return;
        }
        setInteractionsState(current => applyDailyPatch(current, detail));
      }
    };
    bridgeEvents.addEventListener('game.settlement_interactions_daily', handleDailyPatch as EventListener);

    void bridgeCall('game.get_settlement_interactions', { settlementId })
      .then((data) => {
        if (!cancelled) setInteractionsState(mapResponse(data));
      })
      .catch((error) => {
        if (!cancelled) acknowledgeBridgeFailure(error);
      });

    return () => {
      cancelled = true;
      unsubscribeFull();
      bridgeEvents.removeEventListener('game.settlement_interactions_daily', handleDailyPatch as EventListener);
    };
  }, [settlementId]);

  const state = interactionsState?.settlementId === settlementId ? interactionsState : null;

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
