import type { ComponentType, FC, ReactNode } from 'react';
import type * as React from 'react';
import type * as ReactDOM from 'react-dom';
import type * as ReactDOMClient from 'react-dom/client';
import type * as ReactJSXRuntime from 'react/jsx-runtime';

export type FactionModeVisibility = 'all' | 'independent' | 'subject';

export interface ScreenRegistration {
  id: string;
  render: (props: { screenId: string | null; onClose: () => void }) => ReactNode;
  advisorTopic?: string;
  topbarId?: string;
  openedByTopbar?: boolean;
  overlayVariant?: string;
  bridgeNames?: string[];
  preloadAssets?: string[];
  factionMode?: FactionModeVisibility;
}

export interface SidebarRegistration {
  id: string;
  side: 'left' | 'right';
  component: ComponentType<{ sidebarId: string | null; onClose: () => void }>;
  advisorTopic?: string;
  preloadAssets?: string[];
  factionMode?: FactionModeVisibility;
}

export interface TopbarButtonTooltipLine {
  label: string;
  labelKey?: string;
  labelColor?: string;
  labelIcon?: string;
  value?: string;
  valueKey?: string;
  valueColor?: string;
  valueIcon?: string;
  isHeader?: boolean;
}

export interface TopbarButtonTooltipContent {
  title?: string;
  titleKey?: string;
  body?: string;
  bodyKey?: string;
  lines?: TopbarButtonTooltipLine[];
  footer?: string;
  footerKey?: string;
}

export interface TopbarButtonRegistration {
  id: string;
  label: string;
  labelKey?: string;
  icon: string;
  placement?: 'left' | 'right';
  tooltip?: TopbarButtonTooltipContent;
  order?: number;
  preloadAssets?: string[];
  factionMode?: FactionModeVisibility;
}

export interface ModWorldGlanceEntry {
  anchorKey: string;
  payload: unknown;
  screenX: number;
  screenY: number;
  scale: number;
  opacity: number;
  zOrder: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface WorldGlanceInput {
  anchorKey: string;
  payload: unknown;
  mouseButton: 'left' | 'right';
  shiftKey: boolean;
}

export interface WorldGlanceHover {
  anchorKey: string;
  payload: unknown;
  hovered: boolean;
}

export interface WorldGlanceRegistration {
  id: string;
  render(entry: ModWorldGlanceEntry): ReactNode;
  onInput?(input: WorldGlanceInput): void;
  onHover?(hover: WorldGlanceHover): void;
  anchorPoint?: string;
  rasterScale?: number;
}

export interface GameState {
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
  gold?: number;
  goldDelta?: number;
  population?: number;
  populationDelta?: number;
  [key: string]: unknown;
}

export interface GameActions {
  openScreen(screen: string, id?: string): void;
  closeScreen(): void;
  toggleScreen(screen: string, id?: string): void;
  openSidebar(sidebar: string, id?: string): void;
  closeLeftSidebar(): void;
  closeRightSidebar(): void;
  showAdvisor(topic: string): void;
  dismissAdvisor(): void;
  addNotification?(notification: unknown): void;
  [key: string]: unknown;
}

export interface FactionSummary {
  id: string;
  name: string;
  cultureId?: string;
  cultureGroup?: string;
  emblem?: string;
  [key: string]: unknown;
}

export interface PersonSummary {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface SettlementSummary {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface MilitarySummary {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface FoaeModSDK {
  version: string;
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  ReactDOMClient: typeof ReactDOMClient;
  jsxRuntime: typeof ReactJSXRuntime;
  registry: {
    registerScreen(registration: ScreenRegistration): void;
    unregisterScreen(id: string): void;
    registerSidebar(registration: SidebarRegistration): void;
    unregisterSidebar(id: string): void;
    registerTopbarButton(registration: TopbarButtonRegistration): void;
    unregisterTopbarButton(id: string): void;
    registerWorldGlance(registration: WorldGlanceRegistration): void;
    unregisterWorldGlance(id: string): void;
  };
  components: {
    ScreenShell: FC<{
      title: string;
      subtitle?: string;
      onClose: () => void;
      headerExtra?: ReactNode;
      tabs?: ReactNode;
      className?: string;
      contentClassName?: string;
      styledScrollContent?: boolean;
      children: ReactNode;
    }>;
    SectionHeading: FC<{
      title: string;
      count?: number;
      withRule?: boolean;
      variant?: 'default' | 'ornate';
    }>;
    GameButton: ComponentType<Record<string, unknown>>;
    GameCard: ComponentType<Record<string, unknown>>;
    CloseButton: ComponentType<Record<string, unknown>>;
    Tooltip: ComponentType<Record<string, unknown>>;
    InfoRow: ComponentType<Record<string, unknown>>;
    Panel: FC<{ className?: string; children: ReactNode }>;
  };
  hooks: {
    useGameState(): GameState;
    useGameActions(): GameActions;
    useFaction(id: string | null | undefined, scope?: 'full' | 'overview', fetch?: boolean): FactionSummary | null;
    usePerson(id: string | null | undefined): PersonSummary | null;
    useSettlement(id: string | null | undefined): SettlementSummary | null;
    useMilitary(id: string | null | undefined): MilitarySummary | null;
    usePlayerFactionId(): string | null;
  };
  assets: {
    WebkilnAssetPath(path: string): string;
    WebkilnAssetPath(path?: string | null): string | undefined;
    FoaeGameUIAssetPath?: (path: string) => string | undefined;
    modAssetRoot?: string;
    preloadImageAsset(path: string): void;
    preloadImageAssets(paths: string[]): void;
  };
  localization: {
    t(key: string, args?: Record<string, string | number | boolean | null | undefined>): string;
    format(template: string, args?: Record<string, string | number | boolean | null | undefined>): string;
    useText(): (key: string, args?: Record<string, string | number | boolean | null | undefined>) => string;
    useLocale(): string;
  };
  bridge: {
    call(action: string, payload?: unknown): Promise<unknown>;
    on(action: string, callback: (data: unknown) => void): () => void;
  };
}

export const version: string;

export const registerScreen: FoaeModSDK['registry']['registerScreen'];
export const unregisterScreen: FoaeModSDK['registry']['unregisterScreen'];
export const registerSidebar: FoaeModSDK['registry']['registerSidebar'];
export const unregisterSidebar: FoaeModSDK['registry']['unregisterSidebar'];
export const registerTopbarButton: FoaeModSDK['registry']['registerTopbarButton'];
export const unregisterTopbarButton: FoaeModSDK['registry']['unregisterTopbarButton'];
export const registerWorldGlance: FoaeModSDK['registry']['registerWorldGlance'];
export const unregisterWorldGlance: FoaeModSDK['registry']['unregisterWorldGlance'];

export const ScreenShell: FoaeModSDK['components']['ScreenShell'];
export const SectionHeading: FoaeModSDK['components']['SectionHeading'];
export const GameButton: FoaeModSDK['components']['GameButton'];
export const GameCard: FoaeModSDK['components']['GameCard'];
export const CloseButton: FoaeModSDK['components']['CloseButton'];
export const Tooltip: FoaeModSDK['components']['Tooltip'];
export const InfoRow: FoaeModSDK['components']['InfoRow'];
export const Panel: FoaeModSDK['components']['Panel'];

export const useGameState: FoaeModSDK['hooks']['useGameState'];
export const useGameActions: FoaeModSDK['hooks']['useGameActions'];
export const useFaction: FoaeModSDK['hooks']['useFaction'];
export const usePerson: FoaeModSDK['hooks']['usePerson'];
export const useSettlement: FoaeModSDK['hooks']['useSettlement'];
export const useMilitary: FoaeModSDK['hooks']['useMilitary'];
export const usePlayerFactionId: FoaeModSDK['hooks']['usePlayerFactionId'];

export const preloadImageAsset: FoaeModSDK['assets']['preloadImageAsset'];
export const preloadImageAssets: FoaeModSDK['assets']['preloadImageAssets'];

export const webUIText: FoaeModSDK['localization']['t'];
export const formatWebUIText: FoaeModSDK['localization']['format'];
export const useWebUIText: FoaeModSDK['localization']['useText'];
export const useWebUILocale: FoaeModSDK['localization']['useLocale'];

export const bridgeCall: FoaeModSDK['bridge']['call'];
export const onBridgeEvent: FoaeModSDK['bridge']['on'];

declare global {
  var FOAE: FoaeModSDK;
}
