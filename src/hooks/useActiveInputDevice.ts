import { useEffect, useState } from 'react';
import { bridgeEvents } from '../bridge/core/bridgeEvents';

export type ActiveInputDevice = 'keyboard' | 'gamepad';

function normaliseDevice(value: unknown): ActiveInputDevice | null {
  if (value === 'gamepad' || value === 'keyboard') return value;
  return null;
}

/**
 * Tracks the last used input device so prompts can swap between keyboard and gamepad glyphs.
 * `initial` should come from settings.activeInputDevice so ForceControllerMode / Deck
 * gamepad preference applies when settings load (the change event may already have fired).
 * Live `game.input_device_changed` events override until the next settings-driven initial.
 */
export function useActiveInputDevice(initial: ActiveInputDevice = 'keyboard'): ActiveInputDevice {
  const [fromEvent, setFromEvent] = useState<ActiveInputDevice | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      // Payload may be { device: 'gamepad' } or a bare string from some hosts.
      const fromObject = detail && typeof detail === 'object'
        ? normaliseDevice((detail as { device?: string }).device)
        : null;
      const fromString = typeof detail === 'string' ? normaliseDevice(detail) : null;
      const next = fromObject ?? fromString;
      if (next) setFromEvent(next);
    };
    bridgeEvents.addEventListener('game.input_device_changed', handler);
    return () => bridgeEvents.removeEventListener('game.input_device_changed', handler);
  }, []);

  return fromEvent ?? initial;
}
