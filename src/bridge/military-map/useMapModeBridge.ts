import { useCallback } from 'react';
import { useBridgeQuery } from '../core/useBridgeQuery';
import { bridgeCall } from '../../bridge-types.generated.ts';
import type { GetMapModesResponse, MapModeEntry } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export interface MapModeState {
  activeMode: string;
  modes: MapModeEntry[];
  byId: Map<string, MapModeEntry>;
}

function buildState(data: GetMapModesResponse): MapModeState {
  const byId = new Map<string, MapModeEntry>();
  for (const mode of data.modes) {
    byId.set(mode.id, mode);
  }
  return { activeMode: data.activeMode, modes: data.modes, byId };
}

/**
 * Fetches the list of map modes + current active mode from the game bridge.
 * Subscribes to map mode change events so the active id stays in sync.
 */
export function useMapModeBridge(): {
  state: MapModeState | null;
  setMapMode: (id: string) => void;
} {
  const state = useBridgeQuery({
    action: 'game.get_map_modes',
    map: buildState,
  });

  const setMapMode = useCallback((id: string) => {
    bridgeCall('game.set_map_mode', { modeId: id }).catch(acknowledgeBridgeFailure);
  }, []);

  return { state, setMapMode };
}
