import { useCallback } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetWorldGlanceVisibilityResponse } from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type WorldGlanceVisibilityState = GetWorldGlanceVisibilityResponse;

export function useWorldGlanceVisibilityBridge() {
  const state = useBridgeQuery({
    action: 'game.get_world_glance_visibility',
    map: data => data,
  });

  const setVisibility = useCallback((next: WorldGlanceVisibilityState) => {
    bridgeCall('game.set_world_glance_visibility', next).catch(acknowledgeBridgeFailure);
  }, []);

  const toggleSettlements = useCallback(() => {
    if (!state) return;
    setVisibility({ ...state, showSettlements: !state.showSettlements });
  }, [setVisibility, state]);

  const toggleMilitary = useCallback(() => {
    if (!state) return;
    setVisibility({ ...state, showMilitary: !state.showMilitary });
  }, [setVisibility, state]);

  const toggleConvoys = useCallback(() => {
    if (!state) return;
    setVisibility({ ...state, showConvoys: !state.showConvoys });
  }, [setVisibility, state]);

  return {
    state,
    toggleSettlements,
    toggleMilitary,
    toggleConvoys,
  };
}
