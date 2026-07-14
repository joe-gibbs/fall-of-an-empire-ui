import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetGameStateResponse, GetResourcesResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from './runtimeEngine';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from './gameplayCacheReset';

export interface BridgeGameState {
  isPaused?: boolean;
  speed?: number;
  date?: { day: number; month: number; year: number };
  dateText?: string;
  season?: string;
  gameDay?: number;
  debugMode?: boolean;
  climateTrend?: number;
  climateDescription?: string;
  saveSerial?: number;
  hasDemoTimeLimit?: boolean;
  demoDaysRemaining?: number;
  demoEndDateText?: string;
  gold?: number;
  goldDelta?: number;
  population?: number;
  populationDelta?: number;
}

function mapGameState(gs: GetGameStateResponse): Partial<BridgeGameState> {
  return {
    isPaused: gs.isPaused,
    speed: gs.speedLevel || 1,
    date: { day: gs.day, month: gs.month, year: gs.year },
    dateText: gs.dateText,
    season: gs.season,
    gameDay: gs.gameDay,
    debugMode: gs.debugMode,
    climateTrend: gs.climateTrend,
    climateDescription: gs.climateDescription,
    saveSerial: gs.saveSerial,
    hasDemoTimeLimit: gs.hasDemoTimeLimit,
    demoDaysRemaining: gs.demoDaysRemaining,
    demoEndDateText: gs.demoEndDateText,
  };
}

function mapResources(res: GetResourcesResponse): Partial<BridgeGameState> {
  return {
    gold: res.gold,
    goldDelta: res.goldDelta,
    population: res.population,
    populationDelta: res.populationDelta,
  };
}

/**
 * Hook that connects to the game bridge for core HUD state.
 */
export function useBridgeState(): BridgeGameState | null {
  const [state, setState] = useState<BridgeGameState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyState = (nextState: Partial<BridgeGameState>) => {
      if (cancelled) return;
      setState(prev => ({ ...(prev ?? {}), ...nextState }));
    };

    const resetState = () => {
      if (cancelled) return;
      setState(null);
    };

    async function initGameState() {
      try {
        const gs = await bridgeCall('game.get_game_state');
        applyState(mapGameState(gs));
      } catch (error) {
        acknowledgeBridgeFailure(error);
      }
    }

    async function initResources() {
      try {
        const res = await bridgeCall('game.get_resources');
        applyState(mapResources(res));
      } catch (error) {
        acknowledgeBridgeFailure(error);
      }
    }

    // Subscribe before the initial requests so startup pushes cannot be missed.
    window.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, resetState);
    const unsubs = [
      () => window.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, resetState),
      onBridgeEvent('game.get_game_state', (data) => {
        applyState(mapGameState(data));
      }),
      onBridgeEvent('game.get_resources', (data) => {
        applyState(mapResources(data));
      }),
    ];

    initGameState();
    initResources();

    return () => {
      cancelled = true;
      unsubs.forEach(fn => fn());
    };
  }, []);

  return state;
}
