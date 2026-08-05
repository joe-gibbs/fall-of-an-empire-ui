import { useMemo } from 'react';
import { useSettingsBridge } from '../bridge/app/useSettingsBridge';
import {
  makeKeyActionResolver,
  type KeyActionGlyphProps,
} from '../utils/actionBindings';
import { useActiveInputDevice } from './useActiveInputDevice';

/** Live resolver for rich-text `<key action="Command"/>` tags. */
export function useKeyActionResolver(): (actionName: string) => KeyActionGlyphProps | null {
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );

  return useMemo(
    () => makeKeyActionResolver(settings?.controls, activeInputDevice),
    [settings?.controls, activeInputDevice],
  );
}
