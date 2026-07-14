import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { getAdvisorHintKey, type AdvisorTopicId } from '../data/advisorTopics';
import { playSound } from '../hooks/useSound';
import type { Notification, Warning } from '../data/types';
import { useBridgeState } from '../bridge/core/useBridgeState';
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

function shouldClearMilitarySelectionOnClose(type: LeftSidebarType): boolean {
  return type === 'military' || type === 'military-selection';
}

export function GameProvider({ children }: { children: ReactNode }) {
  // Start empty; the bridge fills in live game state.
  // Nothing in here should be a plausible-looking fake value.
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const dismissedWarningsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleReset = () => {
      dismissedWarningsRef.current.clear();
      setState(createInitialGameState());
    };

    window.addEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
    return () => window.removeEventListener(GAMEPLAY_CONTEXT_RESET_EVENT, handleReset);
  }, []);

  // Bridge integration: derive HUD values from live game state when available.
  const bridgeState = useBridgeState();
  const visibleState = useMemo<GameState>(() => {
    if (!bridgeState) return state;
    return {
      ...state,
      isPaused: bridgeState.isPaused ?? state.isPaused,
      speed: (bridgeState.speed || state.speed || 1) as 1 | 2 | 4,
      date: bridgeState.date ?? state.date,
      dateText: bridgeState.dateText ?? state.dateText,
      season: bridgeState.season ?? state.season,
      gameDay: bridgeState.gameDay ?? state.gameDay,
      debugMode: bridgeState.debugMode ?? state.debugMode,
      climateTrend: bridgeState.climateTrend ?? state.climateTrend,
      climateDescription: bridgeState.climateDescription ?? state.climateDescription,
      saveSerial: bridgeState.saveSerial ?? state.saveSerial,
      hasDemoTimeLimit: bridgeState.hasDemoTimeLimit ?? state.hasDemoTimeLimit,
      demoDaysRemaining: bridgeState.demoDaysRemaining ?? state.demoDaysRemaining,
      demoEndDateText: bridgeState.demoEndDateText ?? state.demoEndDateText,
      gold: bridgeState.gold ?? state.gold,
      goldDelta: bridgeState.goldDelta ?? state.goldDelta,
      population: bridgeState.population ?? state.population,
      populationDelta: bridgeState.populationDelta ?? state.populationDelta,
    };
  }, [state, bridgeState]);

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
  }), []);
  useNotificationsAndWarningsBridge(notificationAndWarningHandlers);

  const hintEventHandlers = useMemo<HintEventHandlers>(() => ({
    onHintShown: (hint) => {
      const paragraphs = hint.paragraphs.filter(paragraph => paragraph.trim().length > 0);
      if (!hint.title && paragraphs.length === 0) return;
      setState(s => ({
        ...s,
        advisorHint: {
          hintKey: hint.hintKey,
          title: hint.title,
          paragraphs,
        },
        advisorStep: 0,
        advisorVisible: true,
      }));
    },
  }), []);
  useHintEventsBridge(hintEventHandlers);

  const togglePause = useCallback(() => {
    const previousPaused = visibleState.isPaused;
    const nextPaused = !previousPaused;
    setState(s => ({ ...s, isPaused: nextPaused }));
    bridgeCall('game.toggle_pause').catch((error) => {
      acknowledgeBridgeFailure(error);
      setState(s => (s.isPaused === nextPaused ? { ...s, isPaused: previousPaused } : s));
    });
  }, [visibleState.isPaused]);

  const setSpeed = useCallback((speed: 1 | 2 | 4) => {
    const previousSpeed = visibleState.speed;
    const previousPaused = visibleState.isPaused;
    setState(s => ({ ...s, speed, isPaused: false }));
    bridgeCall('game.set_speed', { speedLevel: speed }).catch((error) => {
      acknowledgeBridgeFailure(error);
      setState(s => (
        s.speed === speed
          ? { ...s, speed: previousSpeed, isPaused: previousPaused }
          : s
      ));
    });
  }, [visibleState.isPaused, visibleState.speed]);

  const openLeftSidebar = useCallback((type: LeftSidebarType, id?: string) => {
    preloadSidebarAssets(type);
    beginUIPerfInteraction(`sidebar:left:${type ?? 'unknown'}`, id);
    setState(s => {
      if (s.leftSidebar !== type || s.leftSidebarId !== (id ?? s.leftSidebarId)) playSound('open');
      return recordSidebarNavigation({ ...s, leftSidebar: type, leftSidebarId: id ?? s.leftSidebarId }, type, id);
    });
  }, []);

  const closeLeftSidebar = useCallback(() => {
    let wasOpen = false;
    let closedSidebar: LeftSidebarType = null;
    setState(s => {
      wasOpen = !!s.leftSidebar;
      closedSidebar = s.leftSidebar;
      if (wasOpen) playSound('close');
      return wasOpen ? { ...s, leftSidebar: null, leftSidebarId: null } : s;
    });
    if (wasOpen) {
      const action = shouldClearMilitarySelectionOnClose(closedSidebar)
        ? bridgeCall('game.clear_military_selection')
        : bridgeCall('ui.hide_left_sidebar');
      action.catch(acknowledgeBridgeFailure);
    }
  }, []);

  const openRightSidebar = useCallback((type: RightSidebarType, id?: string) => {
    preloadSidebarAssets(type);
    beginUIPerfInteraction(`sidebar:right:${type ?? 'unknown'}`, id);
    setState(s => {
      if (s.rightSidebar !== type || s.rightSidebarId !== (id ?? s.rightSidebarId)) playSound('open');
      return recordSidebarNavigation({ ...s, rightSidebar: type, rightSidebarId: id ?? s.rightSidebarId }, type, id);
    });
  }, []);

  const closeRightSidebar = useCallback(() => {
    let wasOpen = false;
    setState(s => {
      wasOpen = !!s.rightSidebar;
      if (wasOpen) playSound('close');
      return wasOpen ? { ...s, rightSidebar: null, rightSidebarId: null } : s;
    });
    if (wasOpen) {
      bridgeCall('ui.hide_right_sidebar').catch(acknowledgeBridgeFailure);
    }
  }, []);

  const openSidebar = useCallback((type: SidebarType, id?: string) => {
    if (!type) return;
    preloadSidebarAssets(type);
    // Registry decides which pane a sidebar lives on. Defaults to the right
    // pane for unknown ids so a mod that forgets to register still renders
    // somewhere visible rather than getting swallowed.
    const side = getSidebarSide(type) ?? 'right';
    beginUIPerfInteraction(`sidebar:${side}:${type}`, id);
    if (side === 'left') {
      setState(s => recordSidebarNavigation({
        ...s,
        leftSidebar: type as LeftSidebarType,
        leftSidebarId: id ?? s.leftSidebarId,
      }, type, id));
    } else {
      setState(s => recordSidebarNavigation({
        ...s,
        rightSidebar: type as RightSidebarType,
        rightSidebarId: id ?? s.rightSidebarId,
      }, type, id));
    }
  }, []);

  const navigateSidebarHistory = useCallback((type: SidebarType, direction: SidebarNavigationDirection) => {
    if (!type) return;
    preloadSidebarAssets(type);
    beginUIPerfInteraction(`sidebar:navigate:${type}`, direction < 0 ? 'back' : 'forward');

    setState(s => {
      const current = s.sidebarNavigation[type];
      if (!current) return s;

      const movingBack = direction < 0;
      const source = movingBack ? current.back : current.forward;
      const targetId = source[source.length - 1];
      if (!targetId) return s;

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
      playSound('open');

      return {
        ...s,
        ...(side === 'left'
          ? { leftSidebar: type as LeftSidebarType, leftSidebarId: targetId }
          : { rightSidebar: type as RightSidebarType, rightSidebarId: targetId }),
        sidebarNavigation: {
          ...s.sidebarNavigation,
          [type]: nextNavigation,
        },
      };
    });
  }, []);

  const closeSidebar = useCallback(() => {
    let wasOpen = false;
    let closedLeftSidebar: LeftSidebarType = null;
    setState(s => {
      wasOpen = !!(s.leftSidebar || s.rightSidebar);
      if (!wasOpen) return s;
      closedLeftSidebar = s.leftSidebar;
      return { ...s, leftSidebar: null, leftSidebarId: null, rightSidebar: null, rightSidebarId: null };
    });
    // Only round-trip to the bridge when a sidebar was actually open, to avoid
    // a feedback loop (game emits close -> we receive -> we emit close -> game emits...).
    if (wasOpen) {
      const action = shouldClearMilitarySelectionOnClose(closedLeftSidebar)
        ? bridgeCall('game.clear_military_selection')
        : bridgeCall('ui.hide_sidebars');
      action.catch(acknowledgeBridgeFailure);
    }
  }, []);

  const closeSidebarFromBridge = useCallback((side?: 'left' | 'right') => {
    setState(s => {
      if (side === 'left') {
        if (!s.leftSidebar) return s;
        return { ...s, leftSidebar: null, leftSidebarId: null };
      }
      if (side === 'right') {
        if (!s.rightSidebar) return s;
        return { ...s, rightSidebar: null, rightSidebarId: null };
      }
      if (!s.leftSidebar && !s.rightSidebar) return s;
      return { ...s, leftSidebar: null, leftSidebarId: null, rightSidebar: null, rightSidebarId: null };
    });
  }, []);

  const closeSidebarEntityFromBridge = useCallback((type: SidebarType, id?: string) => {
    if (!type) return;

    setState(s => {
      const matchesLeft = s.leftSidebar === type && (type === 'template' || !id || s.leftSidebarId === id);
      const matchesRight = s.rightSidebar === type && (type === 'template' || !id || s.rightSidebarId === id);
      if (!matchesLeft && !matchesRight) return s;

      return {
        ...s,
        ...(matchesLeft ? { leftSidebar: null, leftSidebarId: null } : {}),
        ...(matchesRight ? { rightSidebar: null, rightSidebarId: null } : {}),
      };
    });
  }, []);

  const openScreenFromBridge = useCallback((type: ScreenType, id?: string) => {
    preloadScreenAssets(type);
    setState(s => {
      const nextId = id ?? null;
      if (s.activeScreen === type && s.activeScreenId === nextId) return s;
      beginUIPerfInteraction(`screen:${type ?? 'unknown'}`, id);
      playSound('open');
      return { ...s, activeScreen: type, activeScreenId: nextId };
    });
  }, []);

  const closeScreenFromBridge = useCallback(() => {
    setState(s => {
      if (!s.activeScreen) return s;
      playSound('close');
      return { ...s, activeScreen: null, activeScreenId: null };
    });
  }, []);

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
    const closing = visibleState.activeScreen === type && (visibleState.activeScreenId ?? null) === (id ?? null);
    if (closing) closeScreen();
    else openScreen(type, id);
  }, [closeScreen, openScreen, visibleState.activeScreen, visibleState.activeScreenId]);

  const showAdvisor = useCallback((topic: AdvisorTopicId, options?: { force?: boolean }) => {
    bridgeCall('game.hint_events', {
      command: 'show',
      hintKey: getAdvisorHintKey(topic),
      force: options?.force ?? false,
    }).catch(acknowledgeBridgeFailure);
  }, []);

  const dismissAdvisor = useCallback(() => {
    setState(s => ({ ...s, advisorVisible: false }));
  }, []);

  const nextAdvisorPage = useCallback(() => {
    setState(s => {
      if (!s.advisorHint) return s;
      const lastIndex = s.advisorHint.paragraphs.length - 1;
      if (s.advisorStep >= lastIndex) return s;
      return { ...s, advisorStep: s.advisorStep + 1 };
    });
  }, []);

  const previousAdvisorPage = useCallback(() => {
    setState(s => ({
      ...s,
      advisorStep: Math.max(0, s.advisorStep - 1),
    }));
  }, []);

  const resetAdvisorHints = useCallback(() => {
    setState(s => ({
      ...s,
      advisorHint: null,
      advisorStep: 0,
      advisorVisible: false,
    }));
    bridgeCall('game.hint_events', { command: 'reset', hintKey: '', force: false }).catch(acknowledgeBridgeFailure);
  }, []);

  const dismissWarning = useCallback((id: string) => {
    dismissedWarningsRef.current.add(id);
    setState(s => ({ ...s, warnings: s.warnings.filter(w => w.id !== id) }));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setState(s => ({ ...s, notifications: s.notifications.filter(n => n.id !== id) }));
  }, []);

  const addWarning = useCallback((warning: Omit<Warning, 'id'> & { id?: string }) => {
    setState(s => ({
      ...s,
      warnings: [...s.warnings, { ...warning, id: warning.id ?? `w-${Date.now()}` }],
    }));
  }, []);

  const currentDate = visibleState.date;
  const currentGameDay = visibleState.gameDay;
  const addNotification = useCallback((notification: { title: string; description: string; type: Notification['type'] }) => {
    setState(s => ({
      ...s,
      notifications: [...s.notifications, {
        ...notification,
        id: `n-${Date.now()}`,
        timestamp: `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(currentDate.day).padStart(2, '0')}`,
        style: 'regular',
        durationDays: 4,
        ...(currentGameDay > 0 ? {
          createdOnDay: currentGameDay,
          expiresOnDay: currentGameDay + 4,
        } : {}),
      }],
    }));
  }, [currentDate.day, currentDate.month, currentDate.year, currentGameDay]);

  const openAgentSelect = useCallback((targetFactionId: string, role: AgentRole) => {
    beginUIPerfInteraction(`modal:agent-select:${role}`, targetFactionId);
    playSound('open');
    setState(s => ({ ...s, agentSelect: { open: true, targetFactionId, role } }));
  }, []);

  const closeAgentSelect = useCallback(() => {
    // Retain targetFactionId/role across close so the AgentSelectModal keeps
    // a stable `key` through its closing animation. They get overwritten on
    // the next openAgentSelect call.
    setState(s => (s.agentSelect.open ? { ...s, agentSelect: { ...s.agentSelect, open: false } } : s));
  }, []);

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
