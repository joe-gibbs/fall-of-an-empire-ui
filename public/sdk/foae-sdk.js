/**
 * Import-map shim for `@foae/sdk`.
 *
 * Mods import everything they need from this one specifier:
 *
 *   import { registerScreen, ScreenShell, useGameState } from '@foae/sdk';
 *
 * The browser's import map resolves `@foae/sdk` to this file, which reads
 * from the SDK the host published on globalThis.FOAE.
 *
 * Do NOT bundle or transform. Served as-is from /sdk/foae-sdk.js.
 */
const sdk = globalThis.FOAE;

// Registry
export const registerScreen = sdk.registry.registerScreen;
export const unregisterScreen = sdk.registry.unregisterScreen;
export const registerSidebar = sdk.registry.registerSidebar;
export const unregisterSidebar = sdk.registry.unregisterSidebar;
export const registerTopbarButton = sdk.registry.registerTopbarButton;
export const unregisterTopbarButton = sdk.registry.unregisterTopbarButton;

// Components
export const ScreenShell = sdk.components.ScreenShell;
export const SectionHeading = sdk.components.SectionHeading;
export const GameButton = sdk.components.GameButton;
export const GameCard = sdk.components.GameCard;
export const CloseButton = sdk.components.CloseButton;
export const Tooltip = sdk.components.Tooltip;
export const InfoRow = sdk.components.InfoRow;
export const Panel = sdk.components.Panel;

// Hooks
export const useGameState = sdk.hooks.useGameState;
export const useGameActions = sdk.hooks.useGameActions;
export const useFaction = sdk.hooks.useFaction;
export const usePerson = sdk.hooks.usePerson;
export const useSettlement = sdk.hooks.useSettlement;
export const useMilitary = sdk.hooks.useMilitary;
export const usePlayerFactionId = sdk.hooks.usePlayerFactionId;

// Assets
export const preloadImageAsset = sdk.assets.preloadImageAsset;
export const preloadImageAssets = sdk.assets.preloadImageAssets;

// Localisation
export const webUIText = sdk.localization.t;
export const formatWebUIText = sdk.localization.format;
export const useWebUIText = sdk.localization.useText;
export const useWebUILocale = sdk.localization.useLocale;

// Bridge
export const bridgeCall = sdk.bridge.call;
export const onBridgeEvent = sdk.bridge.on;

// Host version, so a mod can refuse to load against an incompatible host.
export const version = sdk.version;
