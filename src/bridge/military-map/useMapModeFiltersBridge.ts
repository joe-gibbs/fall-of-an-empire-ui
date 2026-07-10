import { useCallback } from 'react';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type {
  GetMapModeFiltersResponse,
  SetMapModeFiltersRequest,
} from '../../bridge-types.generated.ts';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type MapModeFiltersState = GetMapModeFiltersResponse;

function activeIds(state: MapModeFiltersState): string[] {
  if (!state.filterActive) {
    return state.entries.map(entry => entry.id);
  }

  return state.entries
    .filter(entry => entry.active)
    .map(entry => entry.id);
}

function requestForIds(
  state: MapModeFiltersState,
  ids: string[],
): SetMapModeFiltersRequest {
  const allSelected = ids.length >= state.entries.length;
  return {
    modeId: state.modeId,
    filterActive: !allSelected,
    activeIds: allSelected ? [] : ids,
    selectedEntryId: '',
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

  const setEntryActive = useCallback((entryId: string, active: boolean) => {
    if (!state) return;

    const nextIds = new Set(activeIds(state));
    if (active) {
      nextIds.add(entryId);
    } else {
      nextIds.delete(entryId);
    }

    apply(requestForIds(state, Array.from(nextIds)));
  }, [apply, state]);

  const selectEntry = useCallback((entryId: string) => {
    if (!state) return;

    apply({
      modeId: state.modeId,
      filterActive: false,
      activeIds: [],
      selectedEntryId: entryId,
    });
  }, [apply, state]);

  const showAll = useCallback(() => {
    if (!state) return;
    apply({
      modeId: state.modeId,
      filterActive: false,
      activeIds: [],
      selectedEntryId: '',
    });
  }, [apply, state]);

  const showNone = useCallback(() => {
    if (!state) return;
    apply({
      modeId: state.modeId,
      filterActive: true,
      activeIds: [],
      selectedEntryId: '',
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
