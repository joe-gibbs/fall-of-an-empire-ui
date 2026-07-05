import { createContext, useContext, useMemo } from 'react';
import type { AdvisorTopicId } from '../data/advisorTopics';
import type { Notification, Warning } from '../data/types';

/**
 * Sidebar/screen ids are free-form strings so mods can register their own
 * components. The base game uses the values listed on each type below.
 *
 * Left sidebar ids: 'settlement' | 'military' | 'diplomacy'
 * Right sidebar ids: 'character' | 'powerbloc' | 'template'
 * Combined sidebar ids: left + right.
 * Screen ids: 'military' | 'characters' | 'ledger' | 'encyclopedia'
 */
export type LeftSidebarType = string | null;
export type RightSidebarType = string | null;
export type AgentRole = 'diplomat' | 'spy';

export interface AdvisorHint {
  hintKey: string;
  title: string;
  paragraphs: string[];
}

export interface AgentSelectState {
  open: boolean;
  targetFactionId?: string;
  role?: AgentRole;
}

export type ScreenType = string | null;
export type SidebarType = string | null;
export type SidebarNavigationDirection = -1 | 1;

export interface SidebarNavigationState {
  currentId: string | null;
  back: string[];
  forward: string[];
}

export interface GameState {
  isPaused: boolean;
  speed: 1 | 2 | 4;
  date: { day: number; month: number; year: number };
  dateText: string;
  season: string;
  gameDay: number;
  debugMode: boolean;
  climateTrend: number;
  climateDescription: string;
  saveSerial: number;
  gold: number;
  goldDelta: number;
  population: number;
  populationDelta: number;

  leftSidebar: LeftSidebarType;
  leftSidebarId: string | null;
  rightSidebar: RightSidebarType;
  rightSidebarId: string | null;
  activeScreen: ScreenType;
  activeScreenId: string | null;
  sidebarNavigation: Record<string, SidebarNavigationState>;

  advisorHint: AdvisorHint | null;
  advisorStep: number;
  advisorVisible: boolean;

  warnings: Warning[];
  notifications: Notification[];

  agentSelect: AgentSelectState;
}

export interface GameActions {
  togglePause: () => void;
  setSpeed: (s: 1 | 2 | 4) => void;
  openLeftSidebar: (type: LeftSidebarType, id?: string) => void;
  closeLeftSidebar: () => void;
  openRightSidebar: (type: RightSidebarType, id?: string) => void;
  closeRightSidebar: () => void;
  openSidebar: (type: SidebarType, id?: string) => void;
  navigateSidebarHistory: (type: SidebarType, direction: SidebarNavigationDirection) => void;
  closeSidebar: () => void;
  closeSidebarFromBridge: (side?: 'left' | 'right') => void;
  closeSidebarEntityFromBridge: (type: SidebarType, id?: string) => void;
  openScreen: (type: ScreenType, id?: string) => void;
  closeScreen: () => void;
  toggleScreen: (type: ScreenType, id?: string) => void;
  showAdvisor: (topic: AdvisorTopicId, options?: { force?: boolean }) => void;
  dismissAdvisor: () => void;
  nextAdvisorPage: () => void;
  previousAdvisorPage: () => void;
  resetAdvisorHints: () => void;
  dismissWarning: (id: string) => void;
  dismissNotification: (id: string) => void;
  addWarning: (warning: Omit<Warning, 'id'> & { id?: string }) => void;
  addNotification: (notification: { title: string; description: string; type: Notification['type'] }) => void;
  openAgentSelect: (targetFactionId: string, role: AgentRole) => void;
  closeAgentSelect: () => void;
}

interface GameContextValue extends GameState, GameActions {}

export const GameStateContext = createContext<GameState | null>(null);
export const GameActionsContext = createContext<GameActions | null>(null);

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameProvider');
  return ctx;
}

export function useOptionalGameState() {
  return useContext(GameStateContext);
}

export function useGameActions() {
  const ctx = useContext(GameActionsContext);
  if (!ctx) throw new Error('useGameActions must be used within GameProvider');
  return ctx;
}

export function useOptionalGameActions() {
  return useContext(GameActionsContext);
}

export function useGame() {
  const state = useGameState();
  const actions = useGameActions();
  return useMemo<GameContextValue>(() => ({ ...state, ...actions }), [state, actions]);
}
