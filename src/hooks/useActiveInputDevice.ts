import { useEffect, useState } from 'react';
import { bridgeEvents } from '../bridge/core/bridgeEvents';

export type ActiveInputDevice = 'keyboard' | 'gamepad';

/**
 * Tracks the last used input device so prompts can swap between keyboard and gamepad glyphs.
 */
export function useActiveInputDevice(initial: ActiveInputDevice = 'keyboard'): ActiveInputDevice {
  const [device, setDevice] = useState<ActiveInputDevice>(initial);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ device?: string }>).detail;
      if (detail?.device === 'gamepad' || detail?.device === 'keyboard') {
        setDevice(detail.device);
      }
    };
    bridgeEvents.addEventListener('game.input_device_changed', handler);
    return () => bridgeEvents.removeEventListener('game.input_device_changed', handler);
  }, []);

  return device;
}
