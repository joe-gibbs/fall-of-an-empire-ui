/**
 * Publishes the mod SDK on `globalThis.FOAE`.
 *
 * Mods loaded at runtime are separate JS files dropped in by the player;
 * they cannot reach into the main bundle's module graph. Everything a mod
 * needs - React, the registry, common components, and data hooks - has to
 * be exposed through this one global object. Mods never `import` anything.
 *
 * Main-bundle code should NOT use `FOAE`. It exists solely for runtime
 * mod consumption; importing from the registry / components / hooks
 * directly is still the right call inside the main app.
 *
 * The SDK is populated before `registry/builtins` runs and before any mod
 * is dynamically imported (see `src/main.tsx`).
 */
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXRuntime from 'react/jsx-runtime';

import {
  registerScreen, unregisterScreen,
  registerSidebar, unregisterSidebar,
  registerTopbarButton, unregisterTopbarButton,
  registerWorldGlance, unregisterWorldGlance,
} from './index';

import ScreenShell from '../components/common/layout/shell/ScreenShell';
import SectionHeading from '../components/common/data-display/stats/SectionHeading';
import GameButton from '../components/common/buttons/GameButton';
import GameCard from '../components/common/layout/shell/GameCard';
import CloseButton from '../components/common/buttons/CloseButton';
import Tooltip from '../components/common/tooltips/Tooltip';
import InfoRow from '../components/common/data-display/stats/InfoRow';
import Panel from '../components/common/layout/shell/Panel';

import { useGameState, useGameActions } from '../context/GameContext';
import {
  useFaction, usePerson, useSettlement, useMilitary, usePlayerFactionId,
} from '../data-source/index';
import { preloadImageAsset, preloadImageAssets } from '../preload/assets';
import { FoaeCefUIAssetPath } from '../utils/assets';
import {
  formatWebUIText,
  useWebUILocale,
  useWebUIText,
  webUIText,
} from '../localization/WebUITextContext';
import {
  bridgeCall as typedBridgeCall,
  onBridgeEvent as typedOnBridgeEvent,
  type BridgeActions,
} from '../bridge-types.generated.ts';

interface FoaeSDK {
  /** Bump the major on breaking changes to any surface below. Mods can
   *  read this and refuse to load against an incompatible host. */
  version: string;

  /** The exact React instance the host uses. Mods MUST use this one -
   *  loading a second copy of React breaks hook identity. */
  React: typeof React;

  /** ReactDOM, for mods that need portals or the flushSync escape hatch. */
  ReactDOM: typeof ReactDOM;

  /** React root creation for mods that mount persistent HUD overlays. */
  ReactDOMClient: typeof ReactDOMClient;

  /** `react/jsx-runtime`. Mods built by tools that emit `_jsx` calls
   *  (Vite/SWC/Babel automatic runtime) can wire their output to this. */
  jsxRuntime: typeof ReactJSXRuntime;

  /** Registry surface. Call at mod load time; last-wins on id. */
  registry: {
    registerScreen: typeof registerScreen;
    unregisterScreen: typeof unregisterScreen;
    registerSidebar: typeof registerSidebar;
    unregisterSidebar: typeof unregisterSidebar;
    registerTopbarButton: typeof registerTopbarButton;
    unregisterTopbarButton: typeof unregisterTopbarButton;
    registerWorldGlance: typeof registerWorldGlance;
    unregisterWorldGlance: typeof unregisterWorldGlance;
  };

  /** Shared UI primitives. Keep this list conservative - every entry is
   *  a public contract. Add new ones deliberately. */
  components: {
    ScreenShell: typeof ScreenShell;
    SectionHeading: typeof SectionHeading;
    GameButton: typeof GameButton;
    GameCard: typeof GameCard;
    CloseButton: typeof CloseButton;
    Tooltip: typeof Tooltip;
    InfoRow: typeof InfoRow;
    Panel: typeof Panel;
  };

  /** Data-source and context hooks. Same stability promise as
   *  `components`. */
  hooks: {
    useGameState: typeof useGameState;
    useGameActions: typeof useGameActions;
    useFaction: typeof useFaction;
    usePerson: typeof usePerson;
    useSettlement: typeof useSettlement;
    useMilitary: typeof useMilitary;
    usePlayerFactionId: typeof usePlayerFactionId;
  };

  /** Static asset helpers for mod-owned image paths. */
  assets: {
    FoaeCefUIAssetPath: typeof FoaeCefUIAssetPath;
    preloadImageAsset: typeof preloadImageAsset;
    preloadImageAssets: typeof preloadImageAssets;
  };

  /** Localised text helpers backed by the base game and enabled mod PO catalogues. */
  localization: {
    t: typeof webUIText;
    format: typeof formatWebUIText;
    useText: typeof useWebUIText;
    useLocale: typeof useWebUILocale;
  };

  /** Bridge access for mod-owned actions and pushed updates. */
  bridge: {
    call: (action: string, payload?: unknown) => Promise<unknown>;
    on: (action: string, callback: (data: unknown) => void) => () => void;
  };
}

declare global {
  var FOAE: FoaeSDK;
}

globalThis.FOAE = {
  version: '0.1.0',
  React,
  ReactDOM,
  ReactDOMClient,
  jsxRuntime: ReactJSXRuntime,
  registry: {
    registerScreen,
    unregisterScreen,
    registerSidebar,
    unregisterSidebar,
    registerTopbarButton,
    unregisterTopbarButton,
    registerWorldGlance,
    unregisterWorldGlance,
  },
  components: {
    ScreenShell,
    SectionHeading,
    GameButton,
    GameCard,
    CloseButton,
    Tooltip,
    InfoRow,
    Panel,
  },
  hooks: {
    useGameState,
    useGameActions,
    useFaction,
    usePerson,
    useSettlement,
    useMilitary,
    usePlayerFactionId,
  },
  assets: {
    FoaeCefUIAssetPath,
    preloadImageAsset,
    preloadImageAssets,
  },
  localization: {
    t: webUIText,
    format: formatWebUIText,
    useText: useWebUIText,
    useLocale: useWebUILocale,
  },
  bridge: {
    call: (action, payload) => {
      const call = typedBridgeCall as unknown as (name: string, payload?: unknown) => Promise<unknown>;
      return payload === undefined ? call(action) : call(action, payload);
    },
    on: (action, callback) => {
      const on = typedOnBridgeEvent as unknown as (
        name: keyof BridgeActions | string,
        callback: (data: unknown) => void,
      ) => () => void;
      return on(action, callback);
    },
  },
};
