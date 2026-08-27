import { useSyncExternalStore } from 'react';
import { bridgeEvents } from '../bridge/core/bridgeEvents';

export type ActiveInputDevice = 'keyboard' | 'gamepad';

function normaliseDevice(value: unknown): ActiveInputDevice | null {
  if (value === 'gamepad' || value === 'keyboard') return value;
  return null;
}

let latestEventDevice: ActiveInputDevice | null = null;
let eventBindingInstalled = false;
const subscribers = new Set<() => void>();

function installDeviceEventBinding() {
  if (eventBindingInstalled) return;
  eventBindingInstalled = true;

  bridgeEvents.addEventListener('game.input_device_changed', (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    const fromObject = detail && typeof detail === 'object'
      ? normaliseDevice((detail as { device?: string }).device)
      : null;
    const fromString = typeof detail === 'string' ? normaliseDevice(detail) : null;
    const next = fromObject ?? fromString;
    if (!next) return;

    latestEventDevice = next;
    subscribers.forEach(subscriber => subscriber());
  });
}

function subscribeToDevice(callback: () => void) {
  installDeviceEventBinding();
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
}

function getDeviceSnapshot(): ActiveInputDevice | null {
  return latestEventDevice;
}

/**
 * Tracks the last used input device so prompts can swap between keyboard and gamepad glyphs.
 * `initial` should come from settings.activeInputDevice so the saved controller mode and
 * Deck preference apply when settings load (the change event may already have fired).
 * Live `game.input_device_changed` events override until the next settings-driven initial.
 */
export function useActiveInputDevice(initial: ActiveInputDevice = 'keyboard'): ActiveInputDevice {
  const fromEvent = useSyncExternalStore(subscribeToDevice, getDeviceSnapshot, getDeviceSnapshot);
  return fromEvent ?? initial;
}
