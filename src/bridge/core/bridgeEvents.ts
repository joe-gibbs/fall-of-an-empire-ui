import { getRuntimeEngine, type runtimeEngine } from './runtimeEngine';
import { cacheBridgeEvent } from './bridgeEventCache';
import { applyAppModeCacheReset } from '../../runtime/appModeCacheReset';
import { bridgeEventPayload } from '../../runtime/bridgePayloads';
import { recordUIPerfBridgeEvent } from '../../perf/uiPerfProfiler';

type BridgeEventCallback = (data: unknown) => void;

const listeners = new Map<string, Set<BridgeEventCallback>>();
const nativeSubscriptions = new Map<string, (() => void) | null>();
const eventListenerSubscriptions = new Map<string, Map<EventListenerOrEventListenerObject, () => void>>();
let boundEngine: runtimeEngine | null = null;

function notifyBridgeEvent(eventName: string, data: unknown): void {
  applyAppModeCacheReset(eventName, data);
  cacheBridgeEvent(eventName, data);
  listeners.get(eventName)?.forEach(callback => callback(data));
}

function bindNativeEvent(eventName: string): void {
  const engine = boundEngine ?? getRuntimeEngine();
  if (!engine || nativeSubscriptions.has(eventName)) return;

  const unsubscribe = engine.on(eventName, (payload) => {
    const startedAtMs = Date.now();
    notifyBridgeEvent(eventName, bridgeEventPayload(eventName, payload));
    recordUIPerfBridgeEvent(eventName, startedAtMs, Date.now());
  });
  nativeSubscriptions.set(eventName, unsubscribe ?? null);
}

export function bindBridgeEventRuntime(engine: runtimeEngine): void {
  if (boundEngine === engine) return;

  nativeSubscriptions.forEach(unsubscribe => unsubscribe?.());
  nativeSubscriptions.clear();
  boundEngine = engine;
  listeners.forEach((_callbacks, eventName) => bindNativeEvent(eventName));
}

export function subscribeBridgeEvent(
  eventName: string,
  callback: BridgeEventCallback,
): () => void {
  const callbacks = listeners.get(eventName) ?? new Set<BridgeEventCallback>();
  callbacks.add(callback);
  listeners.set(eventName, callbacks);
  bindNativeEvent(eventName);

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) listeners.delete(eventName);
  };
}

/** Publishes decoded packed events and local cache refreshes to bridge subscribers. */
export function publishBridgeEvent(eventName: string, data: unknown): void {
  notifyBridgeEvent(eventName, data);
}

export interface BridgeEventTarget {
  addEventListener: (eventName: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (eventName: string, listener: EventListenerOrEventListenerObject) => void;
  dispatchEvent: (event: CustomEvent<unknown>) => boolean;
}

export const bridgeEvents: BridgeEventTarget = {
  addEventListener(eventName, listener) {
    const name = eventName;
    const listenersForEvent = eventListenerSubscriptions.get(name)
      ?? new Map<EventListenerOrEventListenerObject, () => void>();
    if (listenersForEvent.has(listener)) return;

    const unsubscribe = subscribeBridgeEvent(name, data => {
      const event = new CustomEvent(name, { detail: data });
      if (typeof listener === 'function') listener(event);
      else listener.handleEvent(event);
    });
    listenersForEvent.set(listener, unsubscribe);
    eventListenerSubscriptions.set(name, listenersForEvent);
  },
  removeEventListener(eventName, listener) {
    const name = eventName;
    const listenersForEvent = eventListenerSubscriptions.get(name);
    listenersForEvent?.get(listener)?.();
    listenersForEvent?.delete(listener);
    if (listenersForEvent?.size === 0) eventListenerSubscriptions.delete(name);
  },
  dispatchEvent(event) {
    publishBridgeEvent(event.type, event.detail);
    return true;
  },
};

declare global {
  var bridgeEvents: BridgeEventTarget;
}

globalThis.bridgeEvents = bridgeEvents;
