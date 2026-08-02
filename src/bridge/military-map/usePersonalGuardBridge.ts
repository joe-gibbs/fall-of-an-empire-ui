import { useEffect } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetPersonalGuardResponse } from '../../bridge-types.generated.ts';
import { bridgeEvents } from '../core/bridgeEvents';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';
import { clearBridgeQueryCache, useBridgeQuery } from '../core/useBridgeQuery';

let personalGuardCache: GetPersonalGuardResponse | null = null;

export function clearPersonalGuardCache(): void {
  personalGuardCache = null;
  clearBridgeQueryCache('game.get_personal_guard');
}

export function refreshPersonalGuard(): void {
  void bridgeCall('game.get_personal_guard')
    .then((response) => {
      personalGuardCache = response;
      bridgeEvents.dispatchEvent(new CustomEvent('game.get_personal_guard', { detail: response }));
    })
    .catch((error: unknown) => acknowledgeBridgeFailure(error, 'game.get_personal_guard'));
}

export function usePersonalGuardBridge(): GetPersonalGuardResponse | null {
  const live = useBridgeQuery({
    action: 'game.get_personal_guard',
    payload: undefined,
    cacheResponse: true,
    map: (response) => {
      personalGuardCache = response;
      return response;
    },
  });

  useEffect(() => {
    const refresh = () => refreshPersonalGuard();
    const reset = () => {
      personalGuardCache = null;
    };
    bridgeEvents.addEventListener('game.get_military_overview', refresh);
    bridgeEvents.addEventListener('game.game_date_changed', refresh);
    bridgeEvents.addEventListener('ui.gameplay_context_reset', reset);
    return () => {
      bridgeEvents.removeEventListener('game.get_military_overview', refresh);
      bridgeEvents.removeEventListener('game.game_date_changed', refresh);
      bridgeEvents.removeEventListener('ui.gameplay_context_reset', reset);
    };
  }, []);

  return live ?? personalGuardCache;
}
