import { useCallback, useState } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetCurrentEventResponse } from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { dispatchFactionData } from '../diplomacy/useFactionBridge';
import { dispatchPersonData } from '../characters/usePersonBridge';
import type { Event as GameEvent, EventChoiceInputs, EventPersonNameInput, EventRegnalNameInput } from '../../data/types';
import { WebkilnAssetPath } from '../../utils/assets';

function dispatchBridgeEvent(action: string, detail: unknown): void {
  bridgeEvents.dispatchEvent(new CustomEvent(action, { detail }));
}

type RegnalNameRefreshAction =
  | 'game.get_court_positions'
  | 'game.get_diplomacy_overview'
  | 'game.get_economy_overview'
  | 'game.get_military_overview'
  | 'game.get_pinned_items'
  | 'game.get_power_blocs';

function refreshVoidAction(action: Exclude<RegnalNameRefreshAction, 'game.get_diplomacy_overview'>): Promise<void> {
  return bridgeCall(action).then(data => dispatchBridgeEvent(action, data));
}

function refreshDiplomacyOverviewAction(): Promise<void> {
  return bridgeCall('game.get_diplomacy_overview', { scope: 'full' }).then(data => dispatchBridgeEvent('game.get_diplomacy_overview', data));
}

function refreshEconomyOverviewAction(): Promise<void> {
  return bridgeCall('game.get_economy_overview', { scope: 'overview' }).then(data => dispatchBridgeEvent('game.get_economy_overview', data));
}

function refreshFamilyTreeAction(personId: string): Promise<void> {
  return bridgeCall('game.get_family_tree', { personId, scope: 'lineage' }).then(data => dispatchBridgeEvent('game.get_family_tree', data));
}

function refreshHeirCandidatesAction(factionId: string): Promise<void> {
  return bridgeCall('game.get_heir_candidates', { factionId }).then(data => dispatchBridgeEvent('game.get_heir_candidates', data));
}

function refreshCharacterListAction(factionId: string): Promise<void> {
  return bridgeCall('game.get_character_list', { factionId, scope: 'faction' }).then(data => dispatchBridgeEvent('game.get_character_list', data));
}

async function refreshEventNameViews(input: EventRegnalNameInput | EventPersonNameInput): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (input.targetPersonId) {
    tasks.push(
      bridgeCall('game.get_person_data', { personId: input.targetPersonId, scope: 'full' })
        .then(dispatchPersonData),
    );
  }

  if (input.targetFactionId) {
    tasks.push(
      bridgeCall('game.get_faction_data', { factionId: input.targetFactionId, scope: 'full' })
        .then(dispatchFactionData),
    );
  }

  tasks.push(refreshCharacterListAction(input.targetFactionId || ''));
  tasks.push(refreshVoidAction('game.get_court_positions'));
  tasks.push(refreshDiplomacyOverviewAction());
  tasks.push(refreshEconomyOverviewAction());
  tasks.push(refreshFamilyTreeAction(input.targetPersonId || ''));
  tasks.push(refreshHeirCandidatesAction(input.targetFactionId || ''));
  tasks.push(refreshVoidAction('game.get_military_overview'));
  tasks.push(refreshVoidAction('game.get_pinned_items'));
  tasks.push(refreshVoidAction('game.get_power_blocs'));

  await Promise.all(tasks);
}

function mapEvent(data: GetCurrentEventResponse): GameEvent | null {
  if (!data.hasEvent) return null;
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    image: data.imageId ? WebkilnAssetPath(`/assets/events/${data.imageId}.png`) ?? null : null,
    presentationStyle: data.presentationStyle as GameEvent['presentationStyle'],
    regnalNameInput: data.regnalNameInput && data.regnalNameInput.isRequired
      ? {
          label: data.regnalNameInput.label,
          value: data.regnalNameInput.value,
          randomButtonText: data.regnalNameInput.randomButtonText,
          randomOptions: data.regnalNameInput.randomOptions || [],
          targetPersonId: data.regnalNameInput.targetPersonId || undefined,
          targetFactionId: data.regnalNameInput.targetFactionId || undefined,
          previousNameCounts: data.regnalNameInput.previousNameCounts || [],
        }
      : undefined,
    personNameInput: data.personNameInput && data.personNameInput.isRequired
      ? {
          label: data.personNameInput.label,
          value: data.personNameInput.value,
          randomButtonText: data.personNameInput.randomButtonText,
          randomOptions: data.personNameInput.randomOptions || [],
          targetPersonId: data.personNameInput.targetPersonId || undefined,
          targetFactionId: data.personNameInput.targetFactionId || undefined,
        }
      : undefined,
    options: data.options.map(o => ({
      text: o.text,
      tooltip: o.tooltip,
      objective: o.objective || undefined,
      isLocked: o.isLocked,
      effects: o.effects && o.effects.length > 0
        ? o.effects.map(e => ({
            kind: e.kind,
            parameter: e.parameter || undefined,
            amount: e.amount || undefined,
            description: e.description || undefined,
            icon: e.icon || undefined,
          }))
        : undefined,
    })),
    previousEvents: data.previousEvents.map(previousEvent => ({
      id: previousEvent.id,
      title: previousEvent.title,
      body: previousEvent.body,
      image: previousEvent.imageId
        ? WebkilnAssetPath(`/assets/events/${previousEvent.imageId}.png`) ?? null
        : null,
      presentationStyle: previousEvent.presentationStyle as GameEvent['presentationStyle'],
      chosenOptionText: previousEvent.chosenOptionText,
    })),
  };
}

/**
 * Subscribes to the current event pushed from the game. Returns the event
 * to display (or null) plus a `chooseOption` callback to submit the player's
 * choice back to the game.
 */
export function useEventBridge(): {
  event: GameEvent | null;
  chooseOption: (optionIndex: number, inputs?: EventChoiceInputs) => void;
} {
  const bridgeEvent = useBridgeQuery({
    action: 'game.get_current_event',
    map: mapEvent,
  });
  const [dismissedEventId, setDismissedEventId] = useState<string | null>(null);

  const event = bridgeEvent && bridgeEvent.id !== dismissedEventId ? bridgeEvent : null;

  const chooseOption = useCallback((optionIndex: number, inputs?: EventChoiceInputs) => {
    if (!event) return;
    setDismissedEventId(event.id);
    bridgeCall('game.choose_event_option', {
      eventId: event.id,
      optionIndex,
      regnalName: inputs?.regnalName || '',
      personName: inputs?.personName || '',
    })
      .then((response) => {
        if (!response.success) {
          setDismissedEventId(null);
          return;
        }

        if (event.regnalNameInput) {
          void refreshEventNameViews(event.regnalNameInput).catch(acknowledgeBridgeFailure);
        }
        if (event.personNameInput) {
          void refreshEventNameViews(event.personNameInput).catch(acknowledgeBridgeFailure);
        }
      })
      .catch(error => {
        acknowledgeBridgeFailure(error);
        setDismissedEventId(null);
      });
  }, [event]);

  return { event, chooseOption };
}
