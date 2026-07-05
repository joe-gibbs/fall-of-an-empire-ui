import { useCallback } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetConvoyGlanceFiltersResponse,
  SetConvoyGlanceFiltersRequest,
} from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type ConvoyGlanceFiltersState = GetConvoyGlanceFiltersResponse;

function activeFactionNames(state: ConvoyGlanceFiltersState): string[] {
  if (!state.factionFilterActive) {
    return state.factions.map(faction => faction.name);
  }

  return state.factions
    .filter(faction => faction.active)
    .map(faction => faction.name);
}

function requestForState(
  state: ConvoyGlanceFiltersState,
  activeNames: string[],
): SetConvoyGlanceFiltersRequest {
  const allSelected = activeNames.length >= state.factions.length;
  return {
    showConvoys: state.showConvoys,
    factionFilterActive: !allSelected,
    activeFactionNames: allSelected ? [] : activeNames,
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
      activeFactionNames: state.factionFilterActive ? activeFactionNames(state) : [],
    });
  }, [apply, state]);

  const setFactionActive = useCallback((factionName: string, active: boolean) => {
    if (!state) return;

    const nextNames = new Set(activeFactionNames(state));
    if (active) {
      nextNames.add(factionName);
    } else {
      nextNames.delete(factionName);
    }

    apply(requestForState(state, Array.from(nextNames)));
  }, [apply, state]);

  const showAllFactions = useCallback(() => {
    if (!state) return;
    apply({
      showConvoys: state.showConvoys,
      factionFilterActive: false,
      activeFactionNames: [],
    });
  }, [apply, state]);

  const showNoFactions = useCallback(() => {
    if (!state) return;
    apply({
      showConvoys: state.showConvoys,
      factionFilterActive: true,
      activeFactionNames: [],
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
