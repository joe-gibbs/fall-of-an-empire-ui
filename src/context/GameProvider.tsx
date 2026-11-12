import { beginBridgeQueryTransition } from '../bridge/core/useBridgeQuery';
import { startTransition } from 'react';
import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { getAdvisorHintKey, type AdvisorTopicId } from '../data/advisorTopics';
import { playSound } from '../hooks/useSound';
import type { Notification, Warning } from '../data/types';
import { useBridgeState } from '../bridge/core/useBridgeState';
import { publishBridgeEvent } from '../bridge/core/bridgeEvents';
import { acknowledgeBridgeFailure } from '../bridge/core/runtimeEngine';
import { GAMEPLAY_CONTEXT_RESET_EVENT } from '../bridge/core/gameplayCacheReset';
import { useHintEventsBridge, type HintEventHandlers } from '../bridge/app/useHintEventsBridge';
import { useNotificationsAndWarningsBridge } from '../bridge/app/useNotificationsBridge';
import { bridgeCall } from '../bridge-types.generated.ts';
import { getSidebarSide } from '../registry/index';
import { preloadScreenAssets, preloadSidebarAssets } from '../preload/assets';
import { beginUIPerfInteraction } from '../perf/uiPerfProfiler';
import {
  GameActionsContext,
  GameStateContext,
  createInitialGameState,
  type AgentRole,
  type GameActions,
  type GameState,
  type LeftSidebarType,
  type OpenPane,
  type RightSidebarType,
  type SidebarNavigationDirection,
  type ScreenType,
  type SidebarType,
} from './GameContextCore';

function recordSidebarNavigation(state: GameState, type: SidebarType, id: string | undefined): GameState {
  if (!type || id === undefined) return state;

  const current = state.sidebarNavigation[type] ?? { currentId: null, back: [], forward: [] };
  if (current.currentId === id) return state;

  const back = current.currentId ? [...current.back, current.currentId] : current.back;
  return {
    ...state,
    sidebarNavigation: {
      ...state.sidebarNavigation,
      [type]: {
        currentId: id,
        back,
        forward: [],
      },
    },
  };
}

function shouldClearMilitarySelectionOnClose(pane: OpenPane | null): boolean {
  return pane?.type === 'military' || pane?.type === 'military-selection';
}

/** An id carries over only when the same sidebar type is reopened without one. */
function nextPane(current: OpenPane | null, type: string, id: string | undefined): OpenPane {
  return { type, id: id ?? (current?.type === type ? current.id : null) };
}

function samePane(left: OpenPane | null, right: OpenPane | null): boolean {
  return left?.type === right?.type && (left?.id ?? null) === (right?.id ?? null);
}

/** Local pause/speed intent while a bridge call is in flight. Wins over stale bridge snapshots. */
type SpeedControlOverride = {
  isPaused?: boolean;
  speed?: 1 | 2 | 3 | 4;
};

// Locally created notifications and warnings need ids that stay unique when several
// are added within the same millisecond.
let nextLocalEntryId = 0;

export function GameProvider({ children }: { children: ReactNode }) {
  // Start empty; the bridge fills in live game state.
  // Nothing in here should be a plausible-looking fake value.
  const [state, setCommittedState] = useState<GameState>(() => createInitialGameState());
  // Every update goes through this ref, so actions read the state they change before
  // deciding which sound or bridge call follows, outside the React updater.
  const stateRef = useRef(state);
  const setState = useCallback((update: GameState | ((current: GameState) => GameState)): GameState => {
    const previous = stateRef.current;
    const next = typeof update === 'function' ? update(previous) : update;
    if (next !== previous) {
      stateRef.current = next;
      setCommittedState(next);
    }
    return previous;
  }, []);
  const [speedControlOverride, setSpeedControlOverride] = useState<SpeedControlOverride | null>(null);
  const speedControlGenerationRef = useRef(0);
  const dismissedWarningsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleReset = () => {
      dismissedWarningsRef.current.clear();
      speedControlGenerationRef.current += 1;
      setSpeedControlOverride(null);
      setState(createInitialGameState());
    };

    bridgeEvents.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
    return () => bridgeEvents.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
  }, [setState]);

  // Bridge integration: derive HUD values from live game state when available.
  const bridgeState = useBridgeState();

  // Authoritative refresh after a speed control call so the icon cannot stick on a
  // local intent while spacebar/notifications/pause-menu change the real pause state.
  const syncSpeedControlFromGame = useCallback(async (generation: number) => {
    const gs = await bridgeCall('game.get_game_state');
    if (generation === speedControlGenerationRef.current) publishBridgeEvent('game.get_game_state', gs);
  }, []);

  const visibleState = useMemo<GameState>(() => {
    if (!bridgeState && !speedControlOverride) return state;
    return {
      ...state,
      // In-flight button presses must win over a lagging get_game_state push, or the
      // pause/play icon stays on the old state and a second click toggles the game the wrong way.
      isPaused: speedControlOverride?.isPaused ?? bridgeState?.isPaused ?? state.isPaused,
      speed: (speedControlOverride?.speed ?? bridgeState?.speed ?? state.speed ?? 1) as 1 | 2 | 3 | 4,
      date: bridgeState?.date ?? state.date,
      dateText: bridgeState?.dateText ?? state.dateText,
      season: bridgeState?.season ?? state.season,
      gameDay: bridgeState?.gameDay ?? state.gameDay,
      calendarKey: bridgeState?.calendarKey ?? state.calendarKey,
      daysInYear: bridgeState?.daysInYear ?? state.daysInYear,
      daysInMonth: bridgeState?.daysInMonth ?? state.daysInMonth,
      debugMode: bridgeState?.debugMode ?? state.debugMode,
      climateTrend: bridgeState?.climateTrend ?? state.climateTrend,
      climateDescription: bridgeState?.climateDescription ?? state.climateDescription,
      saveSerial: bridgeState?.saveSerial ?? state.saveSerial,
      hasDemoTimeLimit: bridgeState?.hasDemoTimeLimit ?? state.hasDemoTimeLimit,
      demoDaysRemaining: bridgeState?.demoDaysRemaining ?? state.demoDaysRemaining,
      demoEndDateText: bridgeState?.demoEndDateText ?? state.demoEndDateText,
      gold: bridgeState?.gold ?? state.gold,
      goldDelta: bridgeState?.goldDelta ?? state.goldDelta,
      population: bridgeState?.population ?? state.population,
      populationDelta: bridgeState?.populationDelta ?? state.populationDelta,
    };
  }, [state, bridgeState, speedControlOverride]);

  const notificationAndWarningHandlers = useMemo(() => ({
    onNotificationShown: (n: Notification) => {
      setState(s => ({
        ...s,
        notifications: s.notifications.some(existing => existing.id === n.id)
          ? s.notifications.map(existing => existing.id === n.id ? n : existing)
          : [...s.notifications, n],
      }));
    },
    onNotificationDismissed: (id: string) => {
      setState(s => ({ ...s, notifications: s.notifications.filter(n => n.id !== id) }));
    },
    onNotificationsCleared: () => {
      setState(s => ({ ...s, notifications: [] }));
    },
    onInitialWarnings: (warnings: Warning[]) => {
      setState(s => ({ ...s, warnings: warnings.filter(w => !dismissedWarningsRef.current.has(w.id)) }));
    },
    onWarningAdded: (w: Warning) => {
      if (dismissedWarningsRef.current.has(w.id)) return;
      setState(s => (
        s.warnings.some(x => x.id === w.id)
          ? s
          : { ...s, warnings: [...s.warnings, w] }
      ));
    },
    onWarningUpdated: (w: Warning) => {
      if (dismissedWarningsRef.current.has(w.id)) return;
      setState(s => ({
        ...s,
        warnings: s.warnings.some(x => x.id === w.id)
          ? s.warnings.map(x => (x.id === w.id ? w : x))
          : [...s.warnings, w],
      }));
    },
    onWarningRemoved: (id: string) => {
      dismissedWarningsRef.current.delete(id);
      setState(s => ({ ...s, warnings: s.warnings.filter(w => w.id !== id) }));
    },
    onWarningsCleared: () => {
      dismissedWarningsRef.current.clear();
      setState(s => ({ ...s, warnings: [] }));
    },
  }), [setState]);
  useNotificationsAndWarningsBridge(notificationAndWarningHandlers);

  const hintEventHandlers = useMemo<HintEventHandlers>(() => ({
    onHintShown: (hint) => {
      const paragraphs = hint.paragraphs.filter(paragraph => paragraph.trim().length > 0);
      if (!hint.title && paragraphs.length === 0) return;
      setState(s => {
        if (
          s.advisorVisible
          && s.advisorHint
          && s.advisorHint.hintKey === hint.hintKey
          && s.advisorHint.title === hint.title
          && s.advisorHint.paragraphs.length === paragraphs.length
          && s.advisorHint.paragraphs.every((paragraph, index) => paragraph === paragraphs[index])
        ) {
          return s;
        }
        return {
          ...s,
          advisorHint: {
            hintKey: hint.hintKey,
            title: hint.title,
            paragraphs,
          },
          advisorStep: 0,
          advisorVisible: true,
        };
      });
    },
  }), [setState]);
  useHintEventsBridge(hintEventHandlers);

  // TopBar only calls this when the player wants to pause (play uses setSpeed).
  // Set pause absolutely so a stale UI/bridge snapshot cannot flip the game the wrong way.
  const togglePause = useCallback(() => {
    const generation = ++speedControlGenerationRef.current;
    setSpeedControlOverride(prev => ({ ...prev, isPaused: true }));
    void (async () => {
      try {
        const response = await bridgeCall('game.toggle_pause', { absolute: true, isPaused: true });
        if (generation !== speedControlGenerationRef.current) return;
        setSpeedControlOverride(prev => ({ ...prev, isPaused: response.isPaused }));
        await syncSpeedControlFromGame(generation);
      } catch (error) {
        if (generation === speedControlGenerationRef.current) {
          acknowledgeBridgeFailure(error);
        }
      } finally {
        if (generation === speedControlGenerationRef.current) {
          setSpeedControlOverride(null);
        }
      }
    })();
  }, [syncSpeedControlFromGame]);

  const setSpeed = useCallback((speed: 1 | 2 | 3 | 4) => {
    const generation = ++speedControlGenerationRef.current;
    setSpeedControlOverride({ isPaused: false, speed });
    void (async () => {
      try {
        const response = await bridgeCall('game.set_speed', { speedLevel: speed });
        if (generation !== speedControlGenerationRef.current) return;
        const resolvedSpeed = (response.speedLevel > 0 ? response.speedLevel : speed) as 1 | 2 | 3 | 4;
        setSpeedControlOverride({
          isPaused: response.isPaused,
          speed: resolvedSpeed,
        });
        await syncSpeedControlFromGame(generation);
      } catch (error) {
        if (generation === speedControlGenerationRef.current) {
          acknowledgeBridgeFailure(error);
        }
      } finally {
        if (generation === speedControlGenerationRef.current) {
          setSpeedControlOverride(null);
        }
      }
    })();
  }, [syncSpeedControlFromGame]);

  const openLeftSidebar = useCallback((type: LeftSidebarType, id?: string) => {
    if (!type) return;
    preloadSidebarAssets(type);
    beginUIPerfInteraction(`sidebar:left:${type}`, id);
    const previous = setState(s => recordSidebarNavigation({ ...s, leftSidebar: nextPane(s.leftSidebar, type, id) }, type, id));
    if (!samePane(previous.leftSidebar, nextPane(previous.leftSidebar, type, id))) playSound('open');
  }, [setState]);

  const closeLeftSidebar = useCallback(() => {
    const previous = setState(s => (s.leftSidebar ? { ...s, leftSidebar: null } : s));
    if (!previous.leftSidebar) return;
    playSound('close');
    const action = shouldClearMilitarySelectionOnClose(previous.leftSidebar)
      ? bridgeCall('game.clear_military_selection')
      : bridgeCall('ui.hide_left_sidebar');
    action.catch(acknowledgeBridgeFailure);
  }, [setState]);

  const openRightSidebar = useCallback((type: RightSidebarType, id?: string) => {
    if (!type) return;
    preloadSidebarAssets(type);
    beginUIPerfInteraction(`sidebar:right:${type}`, id);
    const previous = setState(s => recordSidebarNavigation({ ...s, rightSidebar: nextPane(s.rightSidebar, type, id) }, type, id));
    if (!samePane(previous.rightSidebar, nextPane(previous.rightSidebar, type, id))) playSound('open');
  }, [setState]);

  const closeRightSidebar = useCallback(() => {
    const previous = setState(s => (s.rightSidebar ? { ...s, rightSidebar: null } : s));
    if (!previous.rightSidebar) return;
    playSound('close');
    bridgeCall('ui.hide_right_sidebar').catch(acknowledgeBridgeFailure);
  }, [setState]);

  const openSidebar = useCallback((type: SidebarType, id?: string) => {
    if (!type) return;
    preloadSidebarAssets(type);
    // Registry decides which pane a sidebar lives on. Defaults to the right
    // pane for unknown ids so a mod that forgets to register still renders
    // somewhere visible rather than getting swallowed.
    const side = getSidebarSide(type) ?? 'right';
    beginUIPerfInteraction(`sidebar:${side}:${type}`, id);
    setState(s => recordSidebarNavigation(
      side === 'left'
        ? { ...s, leftSidebar: nextPane(s.leftSidebar, type, id) }
        : { ...s, rightSidebar: nextPane(s.rightSidebar, type, id) },
      type,
      id,
    ));
  }, [setState]);

  const navigateSidebarHistory = useCallback((type: SidebarType, direction: SidebarNavigationDirection) => {
    if (!type) return;
    preloadSidebarAssets(type);
    beginUIPerfInteraction(`sidebar:navigate:${type}`, direction < 0 ? 'back' : 'forward');

    const current = stateRef.current.sidebarNavigation[type];
    if (!current) return;

    const movingBack = direction < 0;
    const source = movingBack ? current.back : current.forward;
    const targetId = source[source.length - 1];
    if (!targetId) return;

    const nextNavigation = movingBack
      ? {
          currentId: targetId,
          back: current.back.slice(0, -1),
          forward: current.currentId ? [...current.forward, current.currentId] : current.forward,
        }
      : {
          currentId: targetId,
          back: current.currentId ? [...current.back, current.currentId] : current.back,
          forward: current.forward.slice(0, -1),
        };
    const side = getSidebarSide(type) ?? 'right';
    const pane: OpenPane = { type, id: targetId };
    playSound('open');
    setState(s => ({
      ...s,
      ...(side === 'left' ? { leftSidebar: pane } : { rightSidebar: pane }),
      sidebarNavigation: {
        ...s.sidebarNavigation,
        [type]: nextNavigation,
      },
    }));
  }, [setState]);

  const closeSidebar = useCallback(() => {
    const previous = setState(s => (
      s.leftSidebar || s.rightSidebar ? { ...s, leftSidebar: null, rightSidebar: null } : s
    ));
    // Only round-trip to the bridge when a sidebar was actually open, to avoid
    // a feedback loop (game emits close -> we receive -> we emit close -> game emits...).
    if (!previous.leftSidebar && !previous.rightSidebar) return;
    const action = shouldClearMilitarySelectionOnClose(previous.leftSidebar)
      ? bridgeCall('game.clear_military_selection')
      : bridgeCall('ui.hide_sidebars');
    action.catch(acknowledgeBridgeFailure);
  }, [setState]);

  const closeSidebarFromBridge = useCallback((side?: 'left' | 'right') => {
    setState(s => {
      if (side === 'left') {
        if (!s.leftSidebar) return s;
        return { ...s, leftSidebar: null };
      }
      if (side === 'right') {
        if (!s.rightSidebar) return s;
        return { ...s, rightSidebar: null };
      }
      if (!s.leftSidebar && !s.rightSidebar) return s;
      return { ...s, leftSidebar: null, rightSidebar: null };
    });
  }, [setState]);

  const closeSidebarEntityFromBridge = useCallback((type: SidebarType, id?: string) => {
    if (!type) return;

    const matches = (pane: OpenPane | null) => (
      pane?.type === type && (type === 'template' || !id || pane.id === id)
    );
    setState(s => {
      const matchesLeft = matches(s.leftSidebar);
      const matchesRight = matches(s.rightSidebar);
      if (!matchesLeft && !matchesRight) return s;

      return {
        ...s,
        ...(matchesLeft ? { leftSidebar: null } : {}),
        ...(matchesRight ? { rightSidebar: null } : {}),
      };
    });
  }, [setState]);

  const openScreenFromBridge = useCallback((type: ScreenType, id?: string) => {
    if (!type) return;
    const pane: OpenPane = { type, id: id ?? null };
    if (samePane(stateRef.current.activeScreen, pane)) return;
    preloadScreenAssets(type);
    beginBridgeQueryTransition();
    beginUIPerfInteraction(`screen:${type}`, id);
    playSound('open');
    startTransition(() => { setState(s => ({ ...s, activeScreen: pane })); });
  }, [setState]);

  const closeScreenFromBridge = useCallback(() => {
    if (!stateRef.current.activeScreen) return;
    beginBridgeQueryTransition();
    playSound('close');
    setState(s => ({ ...s, activeScreen: null }));
  }, [setState]);

  const openScreen = useCallback((type: ScreenType, id?: string) => {
    if (!type) return;
    openScreenFromBridge(type, id);
    const screen = id ? `${type}:${id}` : type;
    bridgeCall('ui.show_screen', { screen }).catch(acknowledgeBridgeFailure);
  }, [openScreenFromBridge]);

  const closeScreen = useCallback(() => {
    closeScreenFromBridge();
    bridgeCall('ui.show_screen', { screen: '' }).catch(acknowledgeBridgeFailure);
  }, [closeScreenFromBridge]);

  const toggleScreen = useCallback((type: ScreenType, id?: string) => {
    if (!type) return;
    if (samePane(stateRef.current.activeScreen, { type, id: id ?? null })) closeScreen();
    else openScreen(type, id);
  }, [closeScreen, openScreen]);

  const showAdvisor = useCallback((topic: AdvisorTopicId, options?: { force?: boolean }) => {
    bridgeCall('game.hint_events', {
      command: 'show',
      hintKey: getAdvisorHintKey(topic),
      force: options?.force ?? false,
    }).catch(acknowledgeBridgeFailure);
  }, []);

  const dismissAdvisor = useCallback(() => {
    setState(s => (s.advisorVisible ? { ...s, advisorVisible: false } : s));
  }, [setState]);

  const nextAdvisorPage = useCallback(() => {
    setState(s => {
      if (!s.advisorHint) return s;
      const lastIndex = s.advisorHint.paragraphs.length - 1;
      if (s.advisorStep >= lastIndex) return s;
      return { ...s, advisorStep: s.advisorStep + 1 };
    });
  }, [setState]);

  const previousAdvisorPage = useCallback(() => {
    setState(s => {
      if (s.advisorStep <= 0) return s;
      return { ...s, advisorStep: s.advisorStep - 1 };
    });
  }, [setState]);

  const resetAdvisorHints = useCallback(() => {
    setState(s => ({
      ...s,
      advisorHint: null,
      advisorStep: 0,
      advisorVisible: false,
    }));
    bridgeCall('game.hint_events', { command: 'reset', hintKey: '', force: false }).catch(acknowledgeBridgeFailure);
  }, [setState]);

  const dismissWarning = useCallback((id: string) => {
    dismissedWarningsRef.current.add(id);
    setState(s => ({ ...s, warnings: s.warnings.filter(w => w.id !== id) }));
  }, [setState]);

  const dismissNotification = useCallback((id: string) => {
    setState(s => ({ ...s, notifications: s.notifications.filter(n => n.id !== id) }));
  }, [setState]);

  const addWarning = useCallback((warning: Omit<Warning, 'id'> & { id?: string }) => {
    const id = warning.id ?? `w-${++nextLocalEntryId}`;
    setState(s => ({
      ...s,
      warnings: [...s.warnings, { ...warning, id }],
    }));
  }, [setState]);

  const currentDate = visibleState.date;
  const currentGameDay = visibleState.gameDay;
  const addNotification = useCallback((notification: { title: string; description: string; type: Notification['type'] }) => {
    const id = `n-${++nextLocalEntryId}`;
    setState(s => ({
      ...s,
      notifications: [...s.notifications, {
        ...notification,
        id,
        timestamp: `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(currentDate.day).padStart(2, '0')}`,
        style: 'regular',
        durationDays: 14,
        ...(currentGameDay > 0 ? {
          createdOnDay: currentGameDay,
          expiresOnDay: currentGameDay + 14,
        } : {}),
      }],
    }));
  }, [currentDate.day, currentDate.month, currentDate.year, currentGameDay, setState]);

  const openAgentSelect = useCallback((targetFactionId: string, role: AgentRole) => {
    beginUIPerfInteraction(`modal:agent-select:${role}`, targetFactionId);
    playSound('open');
    setState(s => ({ ...s, agentSelect: { open: true, targetFactionId, role } }));
  }, [setState]);

  const closeAgentSelect = useCallback(() => {
    // Retain targetFactionId/role across close so the AgentSelectModal keeps
    // a stable `key` through its closing animation. They get overwritten on
    // the next openAgentSelect call.
    setState(s => (s.agentSelect.open ? { ...s, agentSelect: { ...s.agentSelect, open: false } } : s));
  }, [setState]);

  // Actions object groups the callbacks behind the action context.
  const actions = useMemo<GameActions>(() => ({
    togglePause,
    setSpeed,
    openLeftSidebar,
    closeLeftSidebar,
    openRightSidebar,
    closeRightSidebar,
    openSidebar,
    navigateSidebarHistory,
    closeSidebar,
    closeSidebarFromBridge,
    closeSidebarEntityFromBridge,
    openScreen,
    closeScreen,
    openScreenFromBridge,
    closeScreenFromBridge,
    toggleScreen,
    showAdvisor,
    dismissAdvisor,
    nextAdvisorPage,
    previousAdvisorPage,
    resetAdvisorHints,
    dismissWarning,
    dismissNotification,
    addWarning,
    addNotification,
    openAgentSelect,
    closeAgentSelect,
  }), [
    togglePause, setSpeed,
    openLeftSidebar, closeLeftSidebar, openRightSidebar, closeRightSidebar,
    openSidebar, navigateSidebarHistory, closeSidebar, closeSidebarFromBridge, closeSidebarEntityFromBridge,
    openScreen, closeScreen, openScreenFromBridge, closeScreenFromBridge, toggleScreen,
    showAdvisor, dismissAdvisor, nextAdvisorPage, previousAdvisorPage, resetAdvisorHints,
    dismissWarning, dismissNotification, addWarning, addNotification,
    openAgentSelect, closeAgentSelect,
  ]);

  return (
    <GameActionsContext.Provider value={actions}>
      <GameStateContext.Provider value={visibleState}>
        {children}
      </GameStateContext.Provider>
    </GameActionsContext.Provider>
  );
}
