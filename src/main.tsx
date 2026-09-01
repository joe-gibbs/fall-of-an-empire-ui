import { StrictMode } from 'react'
import './index.css'
import './styles/game-ui.css'
import { installReactErrorDecoder } from './utils/reactErrorDecoder'
import { mountRecoverableRoot } from './utils/reactRootRecovery'
import RootRecoveryBoundary from './components/app-shell/RootRecoveryBoundary'

// React is built as the development bundle so thrown errors already carry full
// text. The decoder expands leftover minified codes and formats createRoot /
// window errors with fiber paths for Unreal/Webkiln logs.
//
// Do not install setState/useSyncExternalStore wrappers for diagnostics here:
// wrapping useSyncExternalStore re-subscribe paths previously restarted the
// world-glances store every render and caused React #185 (blank atlas).
installReactErrorDecoder()

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
import { getRuntimeEngine } from './bridge/core/runtimeEngine'
import { bindUIPerfCommands, recordUIPerfBridgeEvent } from './perf/uiPerfProfiler'
import { bindBridgeEventRuntime, publishBridgeEvent, subscribeBridgeEvent } from './bridge/core/bridgeEvents'
import { installImageAutosize } from './utils/imageAutosize'
import { installFontFit } from './utils/fontFit'
import { NATIVE_BRIDGE_PROTOCOL } from './native-bridge-protocol.generated'
import {
  bridgeEventPayload,
  nativeBattleDataPayload,
  nativeBattleFramePayload,
  nativeBridgeJsonPayload,
  nativeNotificationAnchorsFramePayload,
  nativeWorldGlancesFramePayload,
} from './runtime/bridgePayloads'
import { applyRuntimeViewportScale, setRuntimeClass, type RuntimeViewportState } from './runtime/runtimeViewport'
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
  '.text-with-help',
  '.rich-def',
  '.enc-article-def',
  '.settings-row__label--help',
  '.tt-line--has-sub',
  '.operation-header--tooltip',
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

function bindRuntimeViewportScaleEvents() {
  window.addEventListener('webkiln:runtime-viewport', (event) => {
    applyRuntimeViewportScale((event as CustomEvent<RuntimeViewportState>).detail);
  });
}

function bindBridgeEvents(): boolean {
  const engine = getRuntimeEngine();
  if (!engine) {
    setRuntimeClass(false);
    return false;
  }

  setRuntimeClass(true);
  bindBridgeEventRuntime(engine);

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.bridgeJson, (
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
    publishBridgeEvent(eventName, data);
    recordUIPerfBridgeEvent(eventName, startedAtMs, Date.now());
  });

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.battleData, (
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
    publishBridgeEvent('game.get_battle_data', data);
    recordUIPerfBridgeEvent('game.get_battle_data', startedAtMs, Date.now());
  });

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.battleFrame, (
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
    publishBridgeEvent('game.get_battle_frame', data);
    recordUIPerfBridgeEvent('game.get_battle_frame', startedAtMs, Date.now());
  });

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.worldGlancesFrame, (
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
    publishBridgeEvent('game.world_glances_frame', data);
    recordUIPerfBridgeEvent('game.world_glances_frame', startedAtMs, Date.now());
  });

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.worldAnchorRasterScale, (scale) => {
    setWorldAnchorRasterScale(scale);
  });

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.modWorldGlancesFrame, (
    providerId,
    anchorKeys,
    frameNumbers,
    entryPayloads,
  ) => {
    if (typeof providerId !== 'string') return;
    const startedAtMs = Date.now();
    publishBridgeEvent('ui.mod_world_glances_frame', {
      providerId,
      anchorKeys: Array.isArray(anchorKeys) ? anchorKeys : [],
      frameNumbers: Array.isArray(frameNumbers) ? frameNumbers : [],
      entryPayloads: Array.isArray(entryPayloads) ? entryPayloads : [],
    });
    recordUIPerfBridgeEvent('ui.mod_world_glances_frame', startedAtMs, Date.now());
  });

  engine.on(NATIVE_BRIDGE_PROTOCOL.events.notificationAnchorsFrame, (
    entryStrings,
    entryNumbers,
    entryPayloads,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeNotificationAnchorsFramePayload(entryStrings, entryNumbers, entryPayloads);
    publishBridgeEvent('game.notification_anchors_frame', data);
    recordUIPerfBridgeEvent('game.notification_anchors_frame', startedAtMs, Date.now());
  });

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
  subscribeBridgeEvent('ui.native_glance_composite', (data) => {
    const enabled = Boolean((data as { enabled?: boolean } | undefined)?.enabled);
    document.documentElement.classList.toggle('native-glance-composite', enabled);
  });

  bindUIPerfCommands();

  if (!bindBridgeEvents()) {
    await new Promise<void>((resolve) => {
      const retryId = window.setInterval(() => {
        if (bindBridgeEvents()) {
          window.clearInterval(retryId);
          resolve();
        }
      }, 50);
    });
  }
  configureWebkilnInput();
  installImageAutosize();
  installFontFit();
  await modsReady;

  const hudRoot = document.getElementById('root')!
  mountRecoverableRoot(hudRoot, ({ controller, remount }) => (
    <StrictMode>
      <RootRecoveryBoundary
        controller={controller}
        fallback="panel"
        onReload={() => {
          controller.reset()
          remount()
        }}
      >
        <App />
      </RootRecoveryBoundary>
    </StrictMode>
  ));
  void window.gameUI?.markReady().catch(error => {
    console.error('Webkiln application readiness failed', error);
  });
}

// The world-anchor view boots the same bundle in a minimal mode: it binds engine events (the
// snapshot and per-frame glance payloads arrive as events), renders anchored elements for the
// Webkiln anchor compositor to sample (any element with data-webkiln-anchor), then marks that
// application ready through Webkiln's view lifecycle.
async function bootstrapWorldAnchors() {
  bindRuntimeViewportScaleEvents();

  if (!bindBridgeEvents()) {
    await new Promise<void>((resolve) => {
      const retryId = window.setInterval(() => {
        if (bindBridgeEvents()) {
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
  const atlasRoot = document.getElementById('root')!
  mountRecoverableRoot(atlasRoot, ({ controller, remount }) => (
    <StrictMode>
      <RootRecoveryBoundary
        controller={controller}
        fallback="empty"
        onReload={() => {
          controller.reset()
          remount()
        }}
      >
        <WorldAnchorGameStateProvider>
          <EscapeStackProvider>
            <WorldAnchorHost>
              <GlanceAtlasRoot />
            </WorldAnchorHost>
          </EscapeStackProvider>
        </WorldAnchorGameStateProvider>
      </RootRecoveryBoundary>
    </StrictMode>
  ));

  // Base-game atlas plates and readiness must not wait for optional content-pack discovery.
  // Mod renderers register dynamically and trigger their own atlas admission after modsReady.

  void window.gameUI?.markReady().catch(error => {
    console.error('Webkiln world-anchor readiness failed', error);
  });
}

const bootView = new URLSearchParams(window.location.search).get('view');
void (bootView === 'strategy_world_anchors' ? bootstrapWorldAnchors() : bootstrap());
