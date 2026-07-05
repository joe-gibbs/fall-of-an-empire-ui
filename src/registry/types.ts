import type { ComponentType, ReactNode } from 'react';
import type { AdvisorTopicId } from '../data/advisorTopics';

export type FactionModeVisibility = 'all' | 'independent' | 'subject';

/**
 * Describes a full-window screen (military, economy, family tree, etc).
 *
 * The render function owns its own data fetching - it receives `screenId`
 * (the optional sub-selector, e.g. a war id for the peace negotiation screen)
 * and an `onClose` callback. That keeps the HUD dispatcher ignorant of which
 * data each screen needs, so mods can ship new screens without editing App.
 */
export interface ScreenRegistration {
  id: string;
  render: (props: { screenId: string | null; onClose: () => void }) => ReactNode;

  /** Advisor topic to open automatically when this screen is active. */
  advisorTopic?: AdvisorTopicId;

  /** Topbar button to highlight while this screen is active. */
  topbarId?: string;

  /** If false, clicking `topbarId` does NOT toggle this screen. Used when a
   *  screen (like peace negotiation) shares a topbar button with another
   *  screen but is opened through gameplay, not the button. Defaults to true. */
  openedByTopbar?: boolean;

  /** BEM modifier appended to the screen-overlay div, e.g. 'diplomacy'. */
  overlayVariant?: string;

  /** Lowercase aliases matched against `bridge:ui.show_screen` events. */
  bridgeNames?: string[];

  /** Raw packaged image paths to warm when this screen is opened. Mods may
   *  use their own `/mods/...` paths here. */
  preloadAssets?: string[];

  /** Which player faction mode can see this screen. Defaults to all. */
  factionMode?: FactionModeVisibility;
}

/**
 * Describes a left- or right-hand sidebar (settlement, character, etc).
 *
 * The component receives the current sidebar id and the close callback;
 * it is responsible for its own data hook (useSettlement, usePerson, ...).
 * Rendering null while the data is still loading is expected.
 */
export interface SidebarRegistration {
  id: string;
  side: 'left' | 'right';
  component: ComponentType<{ sidebarId: string | null; onClose: () => void }>;
  advisorTopic?: AdvisorTopicId;

  /** Raw packaged image paths to warm when this sidebar is opened. Mods may
   *  use their own `/mods/...` paths here. */
  preloadAssets?: string[];

  /** Which player faction mode can see this sidebar. Defaults to all. */
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

/** A top-bar button that toggles a screen. */
export interface TopbarButtonRegistration {
  id: string;
  label: string;
  labelKey?: string;
  icon: string;
  /** Which top-bar group should render the button. Defaults to left. */
  placement?: 'left' | 'right';
  /** Structured tooltip. Defaults to `label` when omitted. */
  tooltip?: TopbarButtonTooltipContent;
  /** Lower values render first. Defaults to 0. */
  order?: number;
  /** Extra raw packaged image paths to warm with the top-bar shell. The
   *  primary `icon` is warmed automatically. */
  preloadAssets?: string[];

  /** Which player faction mode can see this button. Defaults to all. */
  factionMode?: FactionModeVisibility;
}
