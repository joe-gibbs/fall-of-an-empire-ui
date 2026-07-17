import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  CancelPersonInteractionResponse,
  GetPersonInteractionOptionsResponse,
  GetPersonInteractionsResponse,
  PersonInteractionEntry,
  StartPersonInteractionResponse,
} from '../../bridge-types.generated.ts';
import type { DisplayTextLine } from '../../data/types';
import { WebkilnAssetPath, interactionAssetPath } from '../../utils/assets';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type InteractionAvailability = 'available' | 'greyed' | 'hidden';

export interface PersonInteractionCandidateView {
  id: string;
  name: string;
  title: string;
  age: number;
  activity: string;
  tactics: number;
  authority: number;
  cunning: number;
  governance: number;
  loyalty: number;
  fame: number;
  successChancePercent: number;
}

export interface PersonInteractionGiftOptionView {
  index: number;
  name: string;
  description: string;
  cost: number;
  relationshipBonus: number;
  iconPath?: string;
}

export interface PersonInteractionView {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  backgroundUrl?: string;
  showInQuickInteractionMenu: boolean;
  category: string;
  difficulty: string;
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
  needsInitiatorSelection: boolean;
  needsGiftSelection: boolean;
  initiatorRequirementDescription: string;
  reasons: { reason: string; status: InteractionAvailability }[];
  successFactors: { name: string; percent: number }[];
  effectLines: DisplayTextLine[];
  initiatorCandidates: PersonInteractionCandidateView[];
  giftOptions: PersonInteractionGiftOptionView[];
}

export interface PersonInteractionsState {
  personId: string;
  playerGold: number;
  interactions: PersonInteractionView[];
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
}

interface PersonInteractionDailyReasonPatch {
  reason: string;
  status: string;
}

interface PersonInteractionDailyEntryPatch {
  id: string;
  availability: string;
  inProgress: boolean;
  remainingDays: number;
  cooldownRemainingDays: number;
  bureaucraticRushDaysSaved: number;
  bureaucraticRushLoad: number;
  reasons: PersonInteractionDailyReasonPatch[];
}

interface PersonInteractionsDailyPatch {
  personId: string;
  playerGold: number;
  lastCompletedInteractionId: string;
  lastInteractionSucceeded: boolean;
  lastInteractionCompletedDate: number;
  lastInteractionOutcomeText: string;
  interactions: PersonInteractionDailyEntryPatch[];
}

export interface StartPersonInteractionOptions {
  initiatorPersonId?: string;
  giftTypeIndex?: number;
}

export interface PersonInteractionsBridge {
  state: PersonInteractionsState | null;
  start: (
    interactionId: string,
    options?: StartPersonInteractionOptions,
  ) => Promise<StartPersonInteractionResponse | null>;
  cancel: () => Promise<CancelPersonInteractionResponse | null>;
  loadOptions: (interactionId: string) => Promise<PersonInteractionView | null>;
  refreshPersonData: () => Promise<void>;
}

const PERSON_INTERACTION_ICON_BASE = '/assets/person-interactions/icons';

function toAvailability(raw: string): InteractionAvailability {
  return raw === 'available' || raw === 'greyed' || raw === 'hidden' ? raw : 'greyed';
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function iconUrl(entry: PersonInteractionEntry): string | undefined {
  const filename = entry.iconId || entry.id;
  return interactionAssetPath(filename, `${PERSON_INTERACTION_ICON_BASE}/`);
}

function backgroundUrl(key: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('/') || key.startsWith('coui://')) return WebkilnAssetPath(key);
  return WebkilnAssetPath(`/assets/events/interaction-${toKebabCase(key)}.png`);
}

export function mapPersonInteractionEntry(entry: PersonInteractionEntry): PersonInteractionView {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    iconUrl: iconUrl(entry),
    backgroundUrl: backgroundUrl(entry.backgroundId),
    showInQuickInteractionMenu: entry.showInQuickInteractionMenu,
    category: entry.category,
    difficulty: entry.difficulty,
    goldCost: entry.goldCost,
    durationDays: entry.durationDays,
    cooldownDays: entry.cooldownDays,
    cooldownRemainingDays: entry.cooldownRemainingDays,
    availability: toAvailability(entry.availability),
    inProgress: entry.inProgress,
    remainingDays: entry.remainingDays,
    bureaucraticLoad: entry.bureaucraticLoad,
    bureaucraticRushDaysSaved: entry.bureaucraticRushDaysSaved,
    bureaucraticRushLoad: entry.bureaucraticRushLoad,
    successChancePercent: entry.successChancePercent,
    needsInitiatorSelection: entry.needsInitiatorSelection,
    needsGiftSelection: entry.needsGiftSelection,
    initiatorRequirementDescription: entry.initiatorRequirementDescription,
    reasons: entry.reasons.map((reason) => ({
      reason: reason.reason,
      status: toAvailability(reason.status),
    })),
    successFactors: entry.successFactors.map((factor) => ({
      name: factor.name,
      percent: factor.percent,
    })),
    effectLines: entry.effectLines ?? [],
    initiatorCandidates: entry.initiatorCandidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      title: candidate.title,
      age: candidate.age,
      activity: candidate.activity,
      tactics: candidate.tactics,
      authority: candidate.authority,
      cunning: candidate.cunning,
      governance: candidate.governance,
      loyalty: candidate.loyalty,
      fame: candidate.fame,
      successChancePercent: candidate.successChancePercent,
    })),
    giftOptions: entry.giftOptions.map((option) => ({
      index: option.index,
      name: option.name,
      description: option.description,
      cost: option.cost,
      relationshipBonus: option.relationshipBonus,
      iconPath: WebkilnAssetPath(option.iconPath) || undefined,
    })),
  };
}

function mapResponse(data: GetPersonInteractionsResponse): PersonInteractionsState {
  return {
    personId: data.personId,
    playerGold: data.playerGold,
    interactions: data.interactions.map(mapPersonInteractionEntry),
    lastCompletedInteractionId: data.lastCompletedInteractionId,
    lastInteractionSucceeded: data.lastInteractionSucceeded,
    lastInteractionCompletedDate: data.lastInteractionCompletedDate,
    lastInteractionOutcomeText: data.lastInteractionOutcomeText,
  };
}

function mapOptionsResponse(data: GetPersonInteractionOptionsResponse): PersonInteractionView {
  return mapPersonInteractionEntry(data.interaction);
}

function isDailyPatch(value: unknown): value is PersonInteractionsDailyPatch {
  if (!value || typeof value !== 'object') return false;
  const patch = value as Partial<PersonInteractionsDailyPatch>;
  return typeof patch.personId === 'string' && Array.isArray(patch.interactions);
}

function applyDailyPatch(
  state: PersonInteractionsState | null,
  patch: PersonInteractionsDailyPatch,
): PersonInteractionsState | null {
  if (!state || state.personId !== patch.personId) return state;

  const updates = new Map(patch.interactions.map(entry => [entry.id, entry]));
  return {
    ...state,
    playerGold: patch.playerGold,
    lastCompletedInteractionId: patch.lastCompletedInteractionId,
    lastInteractionSucceeded: patch.lastInteractionSucceeded,
    lastInteractionCompletedDate: patch.lastInteractionCompletedDate,
    lastInteractionOutcomeText: patch.lastInteractionOutcomeText,
    interactions: state.interactions.map((interaction) => {
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
        reasons: update.reasons.map(reason => ({
          reason: reason.reason,
          status: toAvailability(reason.status),
        })),
      };
    }),
  };
}

function dispatchBridgeEvent<A extends keyof WindowEventMap | string>(action: A, detail: unknown) {
  window.dispatchEvent(new CustomEvent(`bridge:${action}`, { detail }));
}

export function usePersonInteractionsBridge(personId: string | null): PersonInteractionsBridge {
  const [personInteractionsState, setPersonInteractionsState] = useState<PersonInteractionsState | null>(null);

  useEffect(() => {
    if (!personId) return undefined;

    let cancelled = false;

    const unsubscribeFull = onBridgeEvent('game.get_person_interactions', (data) => {
      if (cancelled || data.personId !== personId) return;
      setPersonInteractionsState(mapResponse(data));
    });

    const handleDailyPatch = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDailyPatch(detail) || detail.personId !== personId) return;
      setPersonInteractionsState(current => applyDailyPatch(current, detail));
    };

    window.addEventListener('bridge:game.person_interactions_daily', handleDailyPatch as EventListener);

    void bridgeCall('game.get_person_interactions', { personId })
      .then((data) => {
        if (cancelled) return;
        setPersonInteractionsState(mapResponse(data));
      })
      .catch((error) => {
        if (cancelled) return;
        acknowledgeBridgeFailure(error);
      });

    return () => {
      cancelled = true;
      unsubscribeFull();
      window.removeEventListener('bridge:game.person_interactions_daily', handleDailyPatch as EventListener);
    };
  }, [personId]);

  const state = personInteractionsState?.personId === personId ? personInteractionsState : null;

  const refreshPersonData = useCallback(async () => {
    if (!personId) return;
    try {
      const fresh = await bridgeCall('game.get_person_data', { personId, scope: 'full' });
      dispatchBridgeEvent('game.get_person_data', fresh);
    } catch (error) {
      acknowledgeBridgeFailure(error);
    }
  }, [personId]);

  const start = useCallback(async (
    interactionId: string,
    options: StartPersonInteractionOptions = {},
  ): Promise<StartPersonInteractionResponse | null> => {
    if (!personId) return null;
    try {
      const response = await bridgeCall('game.start_person_interaction', {
        personId,
        interactionId,
        initiatorPersonId: options.initiatorPersonId ?? '',
        giftTypeIndex: options.giftTypeIndex ?? -1,
      });
      if (response.started) {
        void refreshPersonData();
      }
      return response;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [personId, refreshPersonData]);

  const cancel = useCallback(async (): Promise<CancelPersonInteractionResponse | null> => {
    if (!personId) return null;
    try {
      const response = await bridgeCall('game.cancel_person_interaction', { personId });
      if (response.cancelled) {
        void refreshPersonData();
      }
      return response;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [personId, refreshPersonData]);

  const loadOptions = useCallback(async (interactionId: string): Promise<PersonInteractionView | null> => {
    if (!personId) return null;
    try {
      const data = await bridgeCall('game.get_person_interaction_options', { personId, interactionId });
      const interaction = mapOptionsResponse(data);
      setPersonInteractionsState(current => {
        if (!current || current.personId !== personId) return current;
        return {
          ...current,
          playerGold: data.playerGold,
          interactions: current.interactions.map(existing =>
            existing.id === interaction.id ? interaction : existing,
          ),
        };
      });
      return interaction;
    } catch (error) {
      acknowledgeBridgeFailure(error);
      return null;
    }
  }, [personId]);

  const previousCompletionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !personId) {
      previousCompletionKeyRef.current = null;
      return;
    }

    const nextKey = state.lastCompletedInteractionId
      ? [
          Math.round(state.lastInteractionCompletedDate).toString(),
          state.lastCompletedInteractionId,
          state.lastInteractionSucceeded ? 'success' : 'failure',
        ].join(':')
      : '';

    if (previousCompletionKeyRef.current === null) {
      previousCompletionKeyRef.current = nextKey;
      return;
    }

    if (nextKey && nextKey !== previousCompletionKeyRef.current) {
      previousCompletionKeyRef.current = nextKey;
      void refreshPersonData();
      return;
    }

    previousCompletionKeyRef.current = nextKey;
  }, [personId, refreshPersonData, state]);

  return { state, start, cancel, loadOptions, refreshPersonData };
}
