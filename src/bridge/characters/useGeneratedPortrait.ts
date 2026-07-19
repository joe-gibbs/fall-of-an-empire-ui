import { useEffect, useSyncExternalStore } from 'react';
import {
  bridgeCall,
  onBridgeEvent,
  type PortraitInvalidatedEventPayload,
  type PortraitReadyEventPayload,
} from '../../bridge-types.generated.ts';

export type PortraitExpression = 'neutral' | 'smile' | 'frown' | 'anger' | 'fear' | 'concern' | 'stern';

export interface GeneratedPortraitState {
  personId: string;
  expression: PortraitExpression;
  appearanceRevision: number;
  colourUrl?: string;
  normalUrl?: string;
  pending: boolean;
}

const EMPTY_STATE: GeneratedPortraitState = {
  personId: '',
  expression: 'neutral',
  appearanceRevision: 0,
  pending: false,
};

const states = new Map<string, GeneratedPortraitState>();
const listeners = new Map<string, Set<() => void>>();
const inFlight = new Map<string, Promise<void>>();
const lastCheckedAt = new Map<string, number>();
const requestPriorities = new Map<string, number>();
const refreshAfterFlight = new Set<string>();
let eventSubscriptionStarted = false;
let portraitModeSubscriptionStarted = false;
let use3DPortraits = false;
const portraitModeListeners = new Set<() => void>();

function portraitKey(personId: string, expression: PortraitExpression): string {
  return `${personId}|${expression}`;
}

function emit(key: string): void {
  listeners.get(key)?.forEach(listener => listener());
}

function applyReadyEvent(event: PortraitReadyEventPayload): void {
  const expression = event.expression.toLowerCase() as PortraitExpression;
  const key = portraitKey(event.personId, expression);
  const current = states.get(key);
  if (current && event.appearanceRevision < current.appearanceRevision) return;

  states.set(key, {
    personId: event.personId,
    expression,
    appearanceRevision: event.appearanceRevision,
    colourUrl: event.colourUrl || current?.colourUrl,
    normalUrl: event.normalUrl || undefined,
    pending: false,
  });
  emit(key);
}

function applyInvalidatedEvent(event: PortraitInvalidatedEventPayload): void {
  for (const [key, current] of states) {
    if (current.personId !== event.personId || event.appearanceRevision <= current.appearanceRevision) continue;

    states.set(key, {
      ...current,
      appearanceRevision: event.appearanceRevision,
      pending: true,
    });
    lastCheckedAt.delete(key);
    emit(key);
    if ((listeners.get(key)?.size ?? 0) === 0) continue;
    if (inFlight.has(key)) {
      refreshAfterFlight.add(key);
    } else {
      requestGeneratedPortrait(current.personId, current.expression, requestPriorities.get(key) ?? 1);
    }
  }
}

function ensureEventSubscription(): void {
  if (eventSubscriptionStarted) return;
  eventSubscriptionStarted = true;
  onBridgeEvent('game.portrait_ready', applyReadyEvent);
  onBridgeEvent('game.portrait_invalidated', applyInvalidatedEvent);
}

function setUse3DPortraits(enabled: boolean): void {
  if (use3DPortraits === enabled) return;
  use3DPortraits = enabled;
  portraitModeListeners.forEach(listener => listener());
}

function ensurePortraitModeSubscription(): void {
  if (portraitModeSubscriptionStarted) return;
  portraitModeSubscriptionStarted = true;
  onBridgeEvent('game.get_portrait_mode', event => {
    setUse3DPortraits(event.use3DPortraits);
  });
  void bridgeCall('game.get_portrait_mode')
    .then(response => setUse3DPortraits(response.use3DPortraits))
    .catch(() => setUse3DPortraits(false));
}

export function use3DPortraitsEnabled(): boolean {
  useEffect(() => {
    ensurePortraitModeSubscription();
  }, []);

  return useSyncExternalStore(
    listener => {
      portraitModeListeners.add(listener);
      return () => portraitModeListeners.delete(listener);
    },
    () => use3DPortraits,
    () => false,
  );
}

function requestGeneratedPortrait(personId: string, expression: PortraitExpression, priority: number): void {
  const key = portraitKey(personId, expression);
  requestPriorities.set(key, Math.max(requestPriorities.get(key) ?? 0, priority));
  const now = performance.now();
  if (inFlight.has(key) || now - (lastCheckedAt.get(key) ?? -Infinity) < 250) return;

  const current = states.get(key);
  states.set(key, {
    personId,
    expression,
    appearanceRevision: current?.appearanceRevision ?? 0,
    colourUrl: current?.colourUrl,
    normalUrl: current?.normalUrl,
    pending: true,
  });
  emit(key);

  const request = bridgeCall('game.request_portrait', { personId, expression, priority })
    .then(response => {
      const latest = states.get(key);
      if (latest && response.appearanceRevision < latest.appearanceRevision) return;
      states.set(key, {
        personId: response.personId,
        expression,
        appearanceRevision: response.appearanceRevision,
        colourUrl: response.ready ? response.colourUrl : latest?.colourUrl,
        normalUrl: response.ready ? response.normalUrl || undefined : latest?.normalUrl,
        pending: !response.ready,
      });
      emit(key);
    })
    .catch(() => {
      const latest = states.get(key);
      if (!latest) return;
      states.set(key, { ...latest, pending: false });
      emit(key);
    })
    .finally(() => {
      inFlight.delete(key);
      lastCheckedAt.set(key, performance.now());
      if (refreshAfterFlight.delete(key)) {
        lastCheckedAt.delete(key);
        requestGeneratedPortrait(personId, expression, requestPriorities.get(key) ?? priority);
      }
    });
  inFlight.set(key, request);
}

export function useGeneratedPortrait(
  personId: string | undefined,
  expression: PortraitExpression,
  priority: number,
  visible: boolean,
  refreshToken: string,
): GeneratedPortraitState {
  const key = personId ? portraitKey(personId, expression) : '';

  useEffect(() => {
    ensureEventSubscription();
    if (personId && visible) {
      requestGeneratedPortrait(personId, expression, priority);
    }
  }, [expression, personId, priority, refreshToken, visible]);

  return useSyncExternalStore(
    listener => {
      if (!key) return () => undefined;
      const keyListeners = listeners.get(key) ?? new Set<() => void>();
      keyListeners.add(listener);
      listeners.set(key, keyListeners);
      return () => {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) listeners.delete(key);
      };
    },
    () => states.get(key) ?? EMPTY_STATE,
    () => states.get(key) ?? EMPTY_STATE,
  );
}
