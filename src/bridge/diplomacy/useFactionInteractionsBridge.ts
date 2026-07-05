import { useCallback, useEffect, useRef, useState } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  BridgeFactionInteractionProvidedInput,
  GetFactionInteractionsResponse,
  FactionInteractionEntry,
  StartFactionInteractionResponse,
} from '../../bridge-types.generated.ts';
import type { DisplayTextLine } from '../../data/types';
import { interactionAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type InteractionAvailability = 'available' | 'greyed' | 'hidden';

export interface FactionInteractionView {
  id: string;
  name: string;
  description: string;
  descriptionLines?: DisplayTextLine[];
  /** Small icon rendered on the left of the card. */
  iconUrl: string | undefined;
  /** Scenic background image for the confirmation modal. */
  backgroundUrl: string | undefined;
  showInQuickInteractionMenu: boolean;
  /** True if this is an edict (self-targeted) rather than diplomacy. */
  isEdict: boolean;
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
  needsSettlementSelection: boolean;
  canStartSettlementSelection: boolean;
  settlementSelectionPrompt: string;
  needsInputSelection: boolean;
  canStartInputSelection: boolean;
  reasons: { reason: string; status: InteractionAvailability }[];
  successFactors: { name: string; percent: number }[];
  effectLines: DisplayTextLine[];
}

export interface FactionInteractionsState {
  targetFactionId: string;
  interactions: FactionInteractionView[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

export interface FactionInteractionSelectionState {
  targetFactionId: string;
  interactionId: string;
  interactionName: string;
  prompt: string;
  message: string;
  selectedSettlementCount: number;
  hasSuccessChance: boolean;
  successChancePercent: number;
  impactText: string;
  successEffect: string;
  failureEffect: string;
  riskText: string;
}

function toAvailability(raw: string): InteractionAvailability {
  return raw === 'available' || raw === 'greyed' || raw === 'hidden' ? raw : 'greyed';
}

function iconUrl(key: string, isEdict: boolean): string | undefined {
  if (!key) return undefined;
  const folder = isEdict ? 'edicts' : 'diplomatic-interactions';
  return interactionAssetPath(key, `/assets/${folder}/icons/`);
}

function backgroundUrl(key: string, isEdict: boolean): string | undefined {
  if (!key) return undefined;
  const folder = isEdict ? 'edicts' : 'diplomatic-interactions';
  return interactionAssetPath(key, `/assets/${folder}/backgrounds/`);
}

function mapEntry(e: FactionInteractionEntry): FactionInteractionView {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    descriptionLines: e.descriptionLines ?? [],
    iconUrl: iconUrl(e.iconId, e.isEdict),
    backgroundUrl: backgroundUrl(e.backgroundId, e.isEdict),
    showInQuickInteractionMenu: e.showInQuickInteractionMenu,
    isEdict: e.isEdict,
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
    needsSettlementSelection: e.needsSettlementSelection,
    canStartSettlementSelection: e.canStartSettlementSelection,
    settlementSelectionPrompt: e.settlementSelectionPrompt,
    needsInputSelection: e.needsInputSelection,
    canStartInputSelection: e.canStartInputSelection,
    reasons: e.reasons.map(r => ({ reason: r.reason, status: toAvailability(r.status) })),
    successFactors: e.successFactors.map(f => ({ name: f.name, percent: f.percent })),
    effectLines: e.effectLines ?? [],
  };
}

function mapResponse(data: GetFactionInteractionsResponse): FactionInteractionsState {
  return {
    targetFactionId: data.targetFactionId,
    interactions: data.interactions.map(mapEntry),
    lastCompletedInteractionId: data.lastCompletedInteractionId,
    lastInteractionSucceeded: data.lastInteractionSucceeded,
    lastInteractionCompletedDate: data.lastInteractionCompletedDate,
    lastInteractionOutcomeText: data.lastInteractionOutcomeText,
  };
}

export interface FactionInteractionsBridge {
  state: FactionInteractionsState | null;
  selection: FactionInteractionSelectionState | null;
  start: (
    interactionId: string,
    selectedPersonId?: string,
    providedInputs?: BridgeFactionInteractionProvidedInput[],
  ) => Promise<StartFactionInteractionResponse | null>;
  confirmSelection: () => Promise<StartFactionInteractionResponse | null>;
  cancelSelection: () => Promise<StartFactionInteractionResponse | null>;
  cancel: () => void;
}

function mapSelectionResponse(data: StartFactionInteractionResponse): FactionInteractionSelectionState | null {
  if (!data.selectionActive) return null;
  return {
    targetFactionId: data.targetFactionId,
    interactionId: data.interactionId,
    interactionName: data.interactionName,
    prompt: data.selectionPrompt,
    message: data.message,
    selectedSettlementCount: data.selectedSettlementCount,
    hasSuccessChance: data.hasSuccessChance,
    successChancePercent: data.successChancePercent,
    impactText: data.selectionImpactText,
    successEffect: data.selectionSuccessEffect,
    failureEffect: data.selectionFailureEffect,
    riskText: data.selectionRiskText,
  };
}

/**
 * Live list of faction interactions (diplomacy + edicts) against the given
 * target faction, plus callbacks for starting or cancelling them.
 */
export function useFactionInteractionsBridge(targetFactionId: string | null): FactionInteractionsBridge {
  const [selection, setSelection] = useState<FactionInteractionSelectionState | null>(null);
  const selectionRef = useRef<FactionInteractionSelectionState | null>(null);
  const queriedState = useBridgeQuery({
    action: 'game.get_faction_interactions',
    payload: targetFactionId ? { targetFactionId } : null,
    map: mapResponse,
    matchPush: (data) => data.targetFactionId === targetFactionId,
  });
  const state = queriedState?.targetFactionId === targetFactionId ? queriedState : null;
  const scopedSelection = selection?.targetFactionId === targetFactionId ? selection : null;

  const applySelectionResponse = useCallback((response: StartFactionInteractionResponse | null) => {
    if (!response) return null;
    setSelection(mapSelectionResponse(response));
    return response;
  }, []);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    if (!targetFactionId) return undefined;

    return onBridgeEvent('game.start_faction_interaction', (data) => {
      if (data.targetFactionId && data.targetFactionId !== targetFactionId) return;
      setSelection(mapSelectionResponse(data));
    });
  }, [applySelectionResponse, targetFactionId]);

  useEffect(() => () => {
    const activeSelection = selectionRef.current;
    if (!targetFactionId || !activeSelection) return;
    bridgeCall('game.start_faction_interaction', {
      targetFactionId,
      interactionId: activeSelection.interactionId,
      selectedPersonId: '',
      confirmSettlementSelection: false,
      cancelSettlementSelection: true,
      providedInputs: [],
    }).catch(acknowledgeBridgeFailure);
  }, [targetFactionId]);

  const start = useCallback(async (
    interactionId: string,
    selectedPersonId = '',
    providedInputs: BridgeFactionInteractionProvidedInput[] = [],
  ): Promise<StartFactionInteractionResponse | null> => {
    if (!targetFactionId) return null;
    try {
      const response = await bridgeCall('game.start_faction_interaction', {
        targetFactionId,
        interactionId,
        selectedPersonId,
        confirmSettlementSelection: false,
        cancelSettlementSelection: false,
        providedInputs,
      });
      return applySelectionResponse(response);
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [applySelectionResponse, targetFactionId]);

  const confirmSelection = useCallback(async (): Promise<StartFactionInteractionResponse | null> => {
    if (!targetFactionId || !scopedSelection) return null;
    try {
      const response = await bridgeCall('game.start_faction_interaction', {
        targetFactionId,
        interactionId: scopedSelection.interactionId,
        selectedPersonId: '',
        confirmSettlementSelection: true,
        cancelSettlementSelection: false,
        providedInputs: [],
      });
      return applySelectionResponse(response);
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [applySelectionResponse, scopedSelection, targetFactionId]);

  const cancelSelection = useCallback(async (): Promise<StartFactionInteractionResponse | null> => {
    if (!targetFactionId || !scopedSelection) return null;
    try {
      const response = await bridgeCall('game.start_faction_interaction', {
        targetFactionId,
        interactionId: scopedSelection.interactionId,
        selectedPersonId: '',
        confirmSettlementSelection: false,
        cancelSettlementSelection: true,
        providedInputs: [],
      });
      return applySelectionResponse(response);
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [applySelectionResponse, scopedSelection, targetFactionId]);

  const cancel = useCallback(() => {
    if (!targetFactionId) return;
    bridgeCall('game.cancel_faction_interaction', { targetFactionId }).catch(acknowledgeBridgeFailure);
  }, [targetFactionId]);

  return { state, selection: scopedSelection, start, confirmSelection, cancelSelection, cancel };
}
