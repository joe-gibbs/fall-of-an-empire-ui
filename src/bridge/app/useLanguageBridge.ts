import { useCallback } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetLanguagesResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export function useLanguageBridge(): {
  state: GetLanguagesResponse | null;
  setLanguage: (locale: string) => Promise<void>;
} {
  const state = useBridgeQuery({
    action: 'game.get_languages',
    map: (data) => data,
  });

  const setLanguage = useCallback(async (locale: string) => {
    await bridgeCall('game.set_language', { locale }).catch(acknowledgeBridgeFailure);
  }, []);

  return { state, setLanguage };
}
