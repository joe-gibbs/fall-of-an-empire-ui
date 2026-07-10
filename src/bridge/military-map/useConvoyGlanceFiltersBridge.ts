import { useCallback } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetConvoyGlanceFiltersResponse,
  SetConvoyGlanceFiltersRequest,
} from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type ConvoyGlanceFiltersState = GetConvoyGlanceFiltersResponse;

function activeFactionIds(state: ConvoyGlanceFiltersState): string[] {
  if (!state.factionFilterActive) {
    return state.factions.map(faction => faction.id);
  }

  return state.factions
    .filter(faction => faction.active)
    .map(faction => faction.id);
}

function requestForState(
  state: ConvoyGlanceFiltersState,
  activeIds: string[],
): SetConvoyGlanceFiltersRequest {
  const allSelected = activeIds.length >= state.factions.length;
  return {
    showConvoys: state.showConvoys,
    factionFilterActive: !allSelected,
    activeFactionIds: allSelected ? [] : activeIds,
  };
}

export function useConvoyGlanceFiltersBridge() {
  const state = useBridgeQuery({
    action: 'game.get_convoy_glance_filters',
    map: data => data,
  });

  const apply = useCallback((request: SetConvoyGlanceFiltersRequest) => {
    bridgeCall('game.set_convoy_glance_filters', request).catch(acknowledgeBridgeFailure);
  }, []);

  const setShowConvoys = useCallback((showConvoys: boolean) => {
    if (!state) return;
    apply({
      showConvoys,
      factionFilterActive: state.factionFilterActive,
      activeFactionIds: state.factionFilterActive ? activeFactionIds(state) : [],
    });
  }, [apply, state]);

  const setFactionActive = useCallback((factionId: string, active: boolean) => {
    if (!state) return;

    const nextIds = new Set(activeFactionIds(state));
    if (active) {
      nextIds.add(factionId);
    } else {
      nextIds.delete(factionId);
    }

    apply(requestForState(state, Array.from(nextIds)));
  }, [apply, state]);

  const showAllFactions = useCallback(() => {
    if (!state) return;
    apply({
      showConvoys: state.showConvoys,
      factionFilterActive: false,
      activeFactionIds: [],
    });
  }, [apply, state]);

  const showNoFactions = useCallback(() => {
    if (!state) return;
    apply({
      showConvoys: state.showConvoys,
      factionFilterActive: true,
      activeFactionIds: [],
    });
  }, [apply, state]);

  return {
    state,
    setShowConvoys,
    setFactionActive,
    showAllFactions,
    showNoFactions,
  };
}
