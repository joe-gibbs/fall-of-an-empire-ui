import { useEffect, useState } from 'react';
import { onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetGameStateResponse, GetResourcesResponse } from '../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure, callRuntimeBridgeRevisioned } from './runtimeEngine';
import { currentBridgeEventRevision, nextBridgeCacheRevision } from './bridgeEventCache';
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
    speed: gs.speedLevel,
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
    // Revision of the newest value applied for each part of the state. A response is
    // ordered by when its request was sent, so it never undoes a newer push.
    let gameStateRevision = 0;
    let dateRevision = 0;
    let resourcesRevision = 0;
    let awaitingGameplay = false;

    const applyState = (nextState: Partial<BridgeGameState>) => {
      if (cancelled) return;
      setState(prev => {
        const merged: BridgeGameState = { ...(prev ?? {}), ...nextState };
        if (prev && bridgeGameStateEqual(prev, merged)) return prev;
        return merged;
      });
    };

    const applyGameState = (gs: GetGameStateResponse, revision: number) => {
      if (revision < gameStateRevision) return;
      gameStateRevision = revision;
      const mapped = mapGameState(gs);
      if (revision < dateRevision) {
        delete mapped.date;
        delete mapped.dateText;
        delete mapped.season;
        delete mapped.gameDay;
        delete mapped.calendarKey;
        delete mapped.daysInYear;
        delete mapped.daysInMonth;
        delete mapped.demoDaysRemaining;
      } else {
        dateRevision = revision;
      }
      applyState(mapped);
    };

    const applyResources = (res: GetResourcesResponse, revision: number) => {
      if (revision < resourcesRevision) return;
      resourcesRevision = revision;
      applyState(mapResources(res));
    };

    const fetchGameState = () => {
      callRuntimeBridgeRevisioned({ action: 'game.get_game_state' })
        .then(({ value, sentRevision }) => {
          if (!cancelled) applyGameState(value as GetGameStateResponse, sentRevision);
        })
        .catch(acknowledgeBridgeFailure);
    };

    const fetchResources = () => {
      callRuntimeBridgeRevisioned({ action: 'game.get_resources' })
        .then(({ value, sentRevision }) => {
          if (!cancelled) applyResources(value as GetResourcesResponse, sentRevision);
        })
        .catch(acknowledgeBridgeFailure);
    };

    // The reset fires when the game leaves gameplay. The state is fetched again once
    // the game re-enters gameplay.
    const resetState = () => {
      if (cancelled) return;
      // Responses to requests sent before the reset belong to the previous session.
      const resetRevision = nextBridgeCacheRevision();
      gameStateRevision = resetRevision;
      dateRevision = resetRevision;
      resourcesRevision = resetRevision;
      awaitingGameplay = true;
      setState(null);
    };

    // Subscribe before the initial requests so startup pushes cannot be missed.
    bridgeEvents.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, resetState);
    const unsubs = [
      () => bridgeEvents.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, resetState),
      onBridgeEvent('game.get_app_mode', (data) => {
        if (!awaitingGameplay || data.mode !== 'ingame') return;
        awaitingGameplay = false;
        fetchGameState();
        fetchResources();
      }),
      onBridgeEvent('game.get_game_state', (data) => {
        applyGameState(data, currentBridgeEventRevision());
      }),
      onBridgeEvent('game.get_resources', (data) => {
        applyResources(data, currentBridgeEventRevision());
      }),
    ];

    const handleDateChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isGameDateChangedEvent(detail)) return;
      const revision = currentBridgeEventRevision();
      if (revision < dateRevision) return;
      dateRevision = revision;
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

    fetchGameState();
    fetchResources();

    return () => {
      cancelled = true;
      bridgeEvents.removeEventListener('game.game_date_changed', handleDateChanged as EventListener);
      unsubs.forEach(fn => fn());
    };
  }, []);

  return state;
}
