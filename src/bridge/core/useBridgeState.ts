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
  calendarKey?: string;
  daysInYear?: number;
  daysInMonth?: number;
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
    calendarKey: gs.calendarKey,
    daysInYear: gs.daysInYear,
    daysInMonth: gs.daysInMonth,
    debugMode: gs.debugMode,
    climateTrend: gs.climateTrend,
    climateDescription: gs.climateDescription,
    saveSerial: gs.saveSerial,
    hasDemoTimeLimit: gs.hasDemoTimeLimit,
    demoDaysRemaining: gs.demoDaysRemaining,
    demoEndDateText: gs.demoEndDateText,
  };
}

interface GameDateChangedEvent {
  day: number;
  month: number;
  year: number;
  gameDay: number;
  calendarKey: string;
  daysInYear: number;
  daysInMonth: number;
  dateText: string;
  season: string;
  demoDaysRemaining: number;
}

function isGameDateChangedEvent(value: unknown): value is GameDateChangedEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<GameDateChangedEvent>;
  return typeof event.day === 'number'
    && typeof event.month === 'number'
    && typeof event.year === 'number'
    && typeof event.gameDay === 'number'
    && typeof event.calendarKey === 'string'
    && typeof event.daysInYear === 'number'
    && typeof event.daysInMonth === 'number'
    && typeof event.dateText === 'string'
    && typeof event.season === 'string'
    && typeof event.demoDaysRemaining === 'number';
}

function mapResources(res: GetResourcesResponse): Partial<BridgeGameState> {
  return {
    gold: res.gold,
    goldDelta: res.goldDelta,
    population: res.population,
    populationDelta: res.populationDelta,
  };
}

function bridgeGameStateEqual(a: BridgeGameState, b: BridgeGameState): boolean {
  return a.isPaused === b.isPaused
    && a.speed === b.speed
    && a.date?.day === b.date?.day
    && a.date?.month === b.date?.month
    && a.date?.year === b.date?.year
    && a.dateText === b.dateText
    && a.season === b.season
    && a.gameDay === b.gameDay
    && a.calendarKey === b.calendarKey
    && a.daysInYear === b.daysInYear
    && a.daysInMonth === b.daysInMonth
    && a.debugMode === b.debugMode
    && a.climateTrend === b.climateTrend
    && a.climateDescription === b.climateDescription
    && a.saveSerial === b.saveSerial
    && a.hasDemoTimeLimit === b.hasDemoTimeLimit
    && a.demoDaysRemaining === b.demoDaysRemaining
    && a.demoEndDateText === b.demoEndDateText
    && a.gold === b.gold
    && a.goldDelta === b.goldDelta
    && a.population === b.population
    && a.populationDelta === b.populationDelta;
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
      setState(prev => {
        const merged: BridgeGameState = { ...(prev ?? {}), ...nextState };
        if (prev && bridgeGameStateEqual(prev, merged)) return prev;
        return merged;
      });
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
    bridgeEvents.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, resetState);
    const unsubs = [
      () => bridgeEvents.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, resetState),
      onBridgeEvent('game.get_game_state', (data) => {
        applyState(mapGameState(data));
      }),
      onBridgeEvent('game.get_resources', (data) => {
        applyState(mapResources(data));
      }),
    ];

    const handleDateChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isGameDateChangedEvent(detail)) return;
      applyState({
        date: { day: detail.day, month: detail.month, year: detail.year },
        dateText: detail.dateText,
        season: detail.season,
        gameDay: detail.gameDay,
        calendarKey: detail.calendarKey,
        daysInYear: detail.daysInYear,
        daysInMonth: detail.daysInMonth,
        demoDaysRemaining: detail.demoDaysRemaining,
      });
    };
    bridgeEvents.addEventListener('game.game_date_changed', handleDateChanged as EventListener);

    initGameState();
    initResources();

    return () => {
      cancelled = true;
      bridgeEvents.removeEventListener('game.game_date_changed', handleDateChanged as EventListener);
      unsubs.forEach(fn => fn());
    };
  }, []);

  return state;
}
