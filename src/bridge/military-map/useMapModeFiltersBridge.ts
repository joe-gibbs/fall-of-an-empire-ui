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
  collectionRoutesActive = state.collectionRoutesActive,
  distributionRoutesActive = state.distributionRoutesActive,
): SetMapModeFiltersRequest {
  const allSelected = ids.length >= state.entries.length;
  return {
    modeId: state.modeId,
    filterActive: !allSelected,
    activeIds: allSelected ? [] : ids,
    selectedEntryId: '',
    collectionRoutesActive,
    distributionRoutesActive,
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
      collectionRoutesActive: state.collectionRoutesActive,
      distributionRoutesActive: state.distributionRoutesActive,
    });
  }, [apply, state]);

  const showAll = useCallback(() => {
    if (!state) return;
    apply({
      modeId: state.modeId,
      filterActive: false,
      activeIds: [],
      selectedEntryId: '',
      collectionRoutesActive: state.collectionRoutesActive,
      distributionRoutesActive: state.distributionRoutesActive,
    });
  }, [apply, state]);

  const setEntriesActive = useCallback((entryIds: string[], active: boolean) => {
    if (!state) return;

    const nextIds = new Set(activeIds(state));
    entryIds.forEach((entryId) => {
      if (active) {
        nextIds.add(entryId);
      } else {
        nextIds.delete(entryId);
      }
    });
    apply(requestForIds(state, Array.from(nextIds)));
  }, [apply, state]);

  const showNone = useCallback(() => {
    if (!state) return;
    apply({
      modeId: state.modeId,
      filterActive: true,
      activeIds: [],
      selectedEntryId: '',
      collectionRoutesActive: state.collectionRoutesActive,
      distributionRoutesActive: state.distributionRoutesActive,
    });
  }, [apply, state]);

  const setFlowRoleActive = useCallback((role: 'collection' | 'distribution', active: boolean) => {
    if (!state) return;
    apply(requestForIds(
      state,
      activeIds(state),
      role === 'collection' ? active : state.collectionRoutesActive,
      role === 'distribution' ? active : state.distributionRoutesActive,
    ));
  }, [apply, state]);

  return {
    state,
    setEntryActive,
    setEntriesActive,
    selectEntry,
    showAll,
    showNone,
    setFlowRoleActive,
  };
}
