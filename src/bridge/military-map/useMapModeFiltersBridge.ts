import { useCallback } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetMapModeFiltersResponse,
  SetMapModeFiltersRequest,
} from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type MapModeFiltersState = GetMapModeFiltersResponse;

function activeNames(state: MapModeFiltersState): string[] {
  if (!state.filterActive) {
    return state.entries.map(entry => entry.name);
  }

  return state.entries
    .filter(entry => entry.active)
    .map(entry => entry.name);
}

function requestForNames(
  state: MapModeFiltersState,
  names: string[],
): SetMapModeFiltersRequest {
  const allSelected = names.length >= state.entries.length;
  return {
    modeId: state.modeId,
    filterActive: !allSelected,
    activeNames: allSelected ? [] : names,
    selectedEntryId: '',
    selectedName: '',
  };
}

export function useMapModeFiltersBridge() {
  const state = useBridgeQuery({
    action: 'game.get_map_mode_filters',
    map: data => data,
  });

  const apply = useCallback((request: SetMapModeFiltersRequest) => {
    bridgeCall('game.set_map_mode_filters', request).catch(acknowledgeBridgeFailure);
  }, []);

  const setEntryActive = useCallback((entryName: string, active: boolean) => {
    if (!state) return;

    const nextNames = new Set(activeNames(state));
    if (active) {
      nextNames.add(entryName);
    } else {
      nextNames.delete(entryName);
    }

    apply(requestForNames(state, Array.from(nextNames)));
  }, [apply, state]);

  const selectEntry = useCallback((entryId: string, entryName: string) => {
    if (!state) return;

    apply({
      modeId: state.modeId,
      filterActive: false,
      activeNames: [],
      selectedEntryId: entryId,
      selectedName: entryName,
    });
  }, [apply, state]);

  const showAll = useCallback(() => {
    if (!state) return;
    apply({
      modeId: state.modeId,
      filterActive: false,
      activeNames: [],
      selectedEntryId: '',
      selectedName: '',
    });
  }, [apply, state]);

  const showNone = useCallback(() => {
    if (!state) return;
    apply({
      modeId: state.modeId,
      filterActive: true,
      activeNames: [],
      selectedEntryId: '',
      selectedName: '',
    });
  }, [apply, state]);

  return {
    state,
    setEntryActive,
    selectEntry,
    showAll,
    showNone,
  };
}
