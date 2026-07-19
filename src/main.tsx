import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/game-ui.css'

// Publish the mod SDK on window.FOAE. Must run before builtins (so the
// registry functions exist on the global) and before any mod is loaded.
import './registry/sdk'

// Register all base-game screens, sidebars, and topbar buttons.
import './registry/builtins'

// Installs browser API guards before runtime mod scripts are loaded.
import './mods/sandbox'

// Starts the optional WebUI mod loader. It uses XMLHttpRequest internally so
// the Webkiln runtime does not need browser fetch support.
import { modsReady } from './mods/index'

import App from './App.tsx'
import './styles/raster-surfaces.css'
import { acknowledgeBridgeFailure, getRuntimeEngine } from './bridge/core/runtimeEngine'
import { cacheBridgeEvent } from './bridge/core/bridgeEventCache'
import { bindUIPerfCommands, recordUIPerfBridgeEvent } from './perf/uiPerfProfiler'
import { installImageAutosize } from './utils/imageAutosize'
import {
  bridgeEventPayload,
  nativeBattleDataPayload,
  nativeBattleFramePayload,
  nativeBridgeJsonPayload,
  nativeNotificationAnchorsFramePayload,
  nativeWorldGlancesFramePayload,
} from './runtime/bridgePayloads'
import { applyRuntimeViewportScale, setRuntimeClass, type RuntimeViewportState } from './runtime/runtimeViewport'
import { applyAppModeCacheReset } from './runtime/appModeCacheReset'
import { setWorldAnchorRasterScale } from './runtime/worldAnchorRasterScale'

const GRABBING_TARGET_SELECTOR = [
  '.zoom-pan-canvas--panning',
  '.zoom-pan-canvas--right-dragging',
  '.is-node-dragging',
].join(',');

const GRAB_TARGET_SELECTOR = [
  '.zoom-pan-canvas',
  '.ft-viewport',
  '.chart-viewport',
  '.battle-canvas-frame',
].join(',');

const CROSSHAIR_TARGET_SELECTOR = [
  '.zoom-pan-canvas--left-selecting',
].join(',');

const BLOCKED_TARGET_SELECTOR = [
  '.event-option--locked',
  '.pig-footer__button--disabled',
  '.cpm-promote-btn--disabled',
  'button[disabled]',
  '[aria-disabled="true"]',
].join(',');

const HELP_TARGET_SELECTOR = [
  '.diplo-agent-network',
].join(',');

const POINTER_TARGET_SELECTOR = [
  'button',
  'a',
  '[role="button"]',
  'label',
  'summary',
  '.clickable',
  '.icon-button',
  '.event-option',
  '[class*="-link--clickable"]',
  '.interaction-card--clickable',
  '.warning-icon-btn',
  '.pinned-item-row',
  '.screen-button-faction',
  '.speed-btn',
].join(',');

function configureWebkilnInput() {
  const input = window.webkiln?.input;
  if (!input) {
    window.addEventListener('webkiln:runtime-ready', configureWebkilnInput, { once: true });
    return;
  }
  input.configure({
    cursorSelectors: {
      blocked: BLOCKED_TARGET_SELECTOR,
      help: HELP_TARGET_SELECTOR,
      crosshair: CROSSHAIR_TARGET_SELECTOR,
      grabbing: GRABBING_TARGET_SELECTOR,
      grab: GRAB_TARGET_SELECTOR,
      pointer: POINTER_TARGET_SELECTOR,
    },
  });
}

function dispatchBridgeEvent(eventName: string, data: unknown) {
  applyAppModeCacheReset(eventName, data);
  cacheBridgeEvent(eventName, data);
  window.dispatchEvent(new CustomEvent(`bridge:${eventName}`, { detail: data }));
}

function bindRuntimeViewportScaleEvents() {
  window.addEventListener('foae:runtime-viewport', (event) => {
    applyRuntimeViewportScale((event as CustomEvent<RuntimeViewportState>).detail);
  });
}

function bindBridgeEvents(announceScriptingReady = true): boolean {
  const engine = getRuntimeEngine();
  if (!engine) {
    setRuntimeClass(false);
    return false;
  }

  setRuntimeClass(true);

  // Receive push events from the native web UI host and re-dispatch as
  // CustomEvents that onBridgeEvent() listeners can subscribe to.
  engine.on('StrategyBridgeEvent', (eventName, payload) => {
    if (typeof eventName !== 'string') return;
    const data = bridgeEventPayload(eventName, payload);
    const startedAtMs = Date.now();
    dispatchBridgeEvent(eventName, data);
    recordUIPerfBridgeEvent(eventName, startedAtMs, Date.now());
  });

  engine.on('StrategyBridgeEventNative', (
    eventName,
    types,
    counts,
    integers,
    floats,
    strings,
  ) => {
    if (typeof eventName !== 'string') return;
    const startedAtMs = Date.now();
    const payload = nativeBridgeJsonPayload(types, counts, integers, floats, strings);
    const data = bridgeEventPayload(eventName, payload);
    dispatchBridgeEvent(eventName, data);
    recordUIPerfBridgeEvent(eventName, startedAtMs, Date.now());
  });

  engine.on('StrategyBattleData', (
    battleStrings,
    battleNumbers,
    battleFlags,
    sideParticipantCounts,
    sideNumbers,
    participantStrings,
    participantNumbers,
    participantFlags,
    formationStrings,
    formationNumbers,
    formationFlags,
    waypointCounts,
    waypointNumbers,
    actionCounts,
    actionStrings,
    actionNumbers,
    actionFlags,
    unitCounts,
    unitStrings,
    unitNumbers,
    obstacleStrings,
    obstacleNumbers,
    obstacleFlags,
    heightMapShape,
    heightMapNumbers,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeBattleDataPayload(
      battleStrings,
      battleNumbers,
      battleFlags,
      sideParticipantCounts,
      sideNumbers,
      participantStrings,
      participantNumbers,
      participantFlags,
      formationStrings,
      formationNumbers,
      formationFlags,
      waypointCounts,
      waypointNumbers,
      actionCounts,
      actionStrings,
      actionNumbers,
      actionFlags,
      unitCounts,
      unitStrings,
      unitNumbers,
      obstacleStrings,
      obstacleNumbers,
      obstacleFlags,
      heightMapShape,
      heightMapNumbers,
    );
    dispatchBridgeEvent('game.get_battle_data', data);
    recordUIPerfBridgeEvent('game.get_battle_data', startedAtMs, Date.now());
  });

  engine.on('StrategyBattleFrame', (
    battleId,
    formationIds,
    formationNumbers,
    formationFlags,
    formationTargetIndices,
    waypointCounts,
    waypointNumbers,
    agentCounts,
    agentNumbers,
    agentFlags,
    agentTargetIndices,
    unitCounts,
    unitStrengths,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeBattleFramePayload(
      battleId,
      formationIds,
      formationNumbers,
      formationFlags,
      formationTargetIndices,
      waypointCounts,
      waypointNumbers,
      agentCounts,
      agentNumbers,
      agentFlags,
      agentTargetIndices,
      unitCounts,
      unitStrengths,
    );
    dispatchBridgeEvent('game.get_battle_frame', data);
    recordUIPerfBridgeEvent('game.get_battle_frame', startedAtMs, Date.now());
  });

  engine.on('StrategyWorldGlancesFrame', (
    frameNumbers,
    frameFlags,
    counts,
    entryStrings,
    entryNumbers,
    entryFlags,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeWorldGlancesFramePayload(
      frameNumbers,
      frameFlags,
      counts,
      entryStrings,
      entryNumbers,
      entryFlags,
    );
    dispatchBridgeEvent('game.world_glances_frame', data);
    recordUIPerfBridgeEvent('game.world_glances_frame', startedAtMs, Date.now());
  });

  engine.on('StrategyWorldAnchorRasterScale', (scale) => {
    setWorldAnchorRasterScale(scale);
  });

  engine.on('StrategyModWorldGlancesFrame', (
    providerId,
    anchorKeys,
    frameNumbers,
    entryPayloads,
  ) => {
    if (typeof providerId !== 'string') return;
    const startedAtMs = Date.now();
    dispatchBridgeEvent('ui.mod_world_glances_frame', {
      providerId,
      anchorKeys: Array.isArray(anchorKeys) ? anchorKeys : [],
      frameNumbers: Array.isArray(frameNumbers) ? frameNumbers : [],
      entryPayloads: Array.isArray(entryPayloads) ? entryPayloads : [],
    });
    recordUIPerfBridgeEvent('ui.mod_world_glances_frame', startedAtMs, Date.now());
  });

  engine.on('StrategyNotificationAnchorsFrame', (
    entryStrings,
    entryNumbers,
    entryPayloads,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeNotificationAnchorsFramePayload(entryStrings, entryNumbers, entryPayloads);
    dispatchBridgeEvent('game.notification_anchors_frame', data);
    recordUIPerfBridgeEvent('game.notification_anchors_frame', startedAtMs, Date.now());
  });

  if (announceScriptingReady) {
    void Promise.resolve(engine.call('ScriptingReady'))
      .catch(error => acknowledgeBridgeFailure(error, 'ScriptingReady'));
  }
  return true;
}

function shouldInstallMockRuntime(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.MODE === 'mock') return true;
  if (import.meta.env.VITE_FOAE_MOCK_UI === '1') return true;
  return new URLSearchParams(window.location.search).has('mock');
}

function installMockRuntimeScript(): Promise<void> {
  if (!shouldInstallMockRuntime()) return Promise.resolve();
  if (window.__foaeMockBridge) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/src/dev/mockRuntimeBootstrap.ts';

    const cleanup = () => {
      window.removeEventListener('foae:mock-runtime-ready', onReady);
      window.removeEventListener('foae:mock-runtime-error', onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Failed to install mock runtime bridge'));
    };

    window.addEventListener('foae:mock-runtime-ready', onReady, { once: true });
    window.addEventListener('foae:mock-runtime-error', onError, { once: true });
    script.addEventListener('error', onError, { once: true });
    document.head.appendChild(script);
  });
}

async function bootstrap() {
  await installMockRuntimeScript();

  bindRuntimeViewportScaleEvents();

  // The engine enables this after Webkiln has a paint-confirmed atlas layout. React then hides
  // the browser-positioned duplicate glance tree.
  window.addEventListener('bridge:ui.native_glance_composite', (event) => {
    const enabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled);
    document.documentElement.classList.toggle('native-glance-composite', enabled);
  });

  bindUIPerfCommands();

  if (!bindBridgeEvents()) {
    const retryId = window.setInterval(() => {
      if (bindBridgeEvents()) window.clearInterval(retryId);
    }, 50);
  }
  configureWebkilnInput();
  installImageAutosize();
  await modsReady;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// The world-anchor view boots the same bundle in a minimal mode: it binds engine events (the
// snapshot and per-frame glance payloads arrive as events), renders anchored elements for the
// Webkiln anchor compositor to sample (any element with data-webkiln-anchor), and announces
// readiness through its own bridge action —
// never ScriptingReady, which gates the main view.
async function bootstrapWorldAnchors() {
  bindRuntimeViewportScaleEvents();

  if (!bindBridgeEvents(false)) {
    await new Promise<void>((resolve) => {
      const retryId = window.setInterval(() => {
        if (bindBridgeEvents(false)) {
          window.clearInterval(retryId);
          resolve();
        }
      }, 50);
    });
  }

  const [
    { default: WorldAnchorHost },
    { default: GlanceAtlasRoot },
    { EscapeStackProvider },
    { WorldAnchorGameStateProvider },
  ] = await Promise.all([
    import('./runtime/worldAnchorHost'),
    import('./components/world-glances/GlanceAtlasRoot'),
    import('./context/EscapeStackProvider'),
    import('./context/WorldAnchorGameStateProvider'),
  ]);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <WorldAnchorGameStateProvider>
        <EscapeStackProvider>
          <WorldAnchorHost>
            <GlanceAtlasRoot />
          </WorldAnchorHost>
        </EscapeStackProvider>
      </WorldAnchorGameStateProvider>
    </StrictMode>,
  );

  // Base-game atlas plates and readiness must not wait for optional content-pack discovery.
  // Mod renderers register dynamically and trigger their own atlas admission after modsReady.

  const engine = getRuntimeEngine();
  if (engine) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void Promise.resolve(engine.call('WorldAnchorReady'))
          .catch(error => acknowledgeBridgeFailure(error, 'WorldAnchorReady'));
      });
    });
  }
}

const bootView = new URLSearchParams(window.location.search).get('view');
void (bootView === 'strategy_world_anchors' ? bootstrapWorldAnchors() : bootstrap());
