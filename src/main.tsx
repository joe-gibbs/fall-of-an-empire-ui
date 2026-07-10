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
// the FoaeCefUI runtime does not need browser fetch support.
import { modsReady } from './mods/index'

import App from './App.tsx'
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
import { applyAppModeBridgeGate } from './runtime/appModeBridgeGate'

const WORLD_INPUT_BLOCKING_CLASSES = [
  'sidebar',
  'sidebar-left',
  'sidebar-right',
  'sidebar-content',
  'topbar-left',
  'topbar-center',
  'topbar-actions',
  'topbar-right',
  'topbar-portrait-slot',
  'bottombar-tray',
  'screen-overlay',
  'modal-overlay',
  'settings-modal-overlay',
  'event-overlay',
  'pinned-dropdown',
  'vc-dropdown',
  'warning-icon-strip',
  'warning-icon-btn',
  'notification-banner',
  'advisor-card',
  'candidate-list-scroll-frame',
  'chart-unit-picker',
  'tpl-picker',
  'mm-root',
  'fs-root',
  'tt-bubble',
  'world-glance',
];

type NativeCursorKind =
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'blocked'
  | 'crosshair'
  | 'help'
  | 'gameplay';

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
  '.interaction-card--clickable',
  '.warning-icon-btn',
  '.pinned-item-row',
  '.screen-button-faction',
  '.speed-btn',
].join(',');

let lastMouseBlocksWorldInput: boolean | null = null;
let lastMouseCursorKind: NativeCursorKind | null = null;
let nativeCursorMouseDown = false;

function hasClassInAncestry(element: Element | null, classNames: string[]): boolean {
  let current = element;
  while (current) {
    for (const className of classNames) {
      if (current.classList.contains(className)) return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isDisabled(element: Element): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return true;
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled)) return true;
  return false;
}

function hasDisabledCursorTarget(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (isDisabled(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function webUICursorKind(element: Element | null): NativeCursorKind {
  if (!element) return 'default';
  if (element.closest('.world-glance')) return 'gameplay';
  if (element.closest(BLOCKED_TARGET_SELECTOR) || hasDisabledCursorTarget(element)) return 'blocked';
  if (element.closest(HELP_TARGET_SELECTOR)) return 'help';
  if (element.closest(CROSSHAIR_TARGET_SELECTOR)) return 'crosshair';
  if (element.closest(GRABBING_TARGET_SELECTOR)) return 'grabbing';
  if (element.closest(GRAB_TARGET_SELECTOR)) return nativeCursorMouseDown ? 'grabbing' : 'grab';

  let current: Element | null = element;
  while (current) {
    const tagName = current.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      return 'text';
    }
    current = current.parentElement;
  }

  if (element.closest(POINTER_TARGET_SELECTOR)) return 'pointer';
  return 'default';
}

function syncWebUIMouseState(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  const blocksWorldInput = hasClassInAncestry(element, WORLD_INPUT_BLOCKING_CLASSES);
  const cursorKind = webUICursorKind(element);

  if (
    blocksWorldInput === lastMouseBlocksWorldInput
    && cursorKind === lastMouseCursorKind
  ) {
    return;
  }

  lastMouseBlocksWorldInput = blocksWorldInput;
  lastMouseCursorKind = cursorKind;

  const engine = getRuntimeEngine();
  if (!engine) return;
  void Promise.resolve(engine.call('StrategySetWebUIMouseState', blocksWorldInput, cursorKind))
    .catch(error => acknowledgeBridgeFailure(error, 'StrategySetWebUIMouseState'));
}

function bindMouseStateBridge() {
  document.addEventListener('mouseover', (event) => syncWebUIMouseState(event.target), true);
  document.addEventListener('mousemove', (event) => syncWebUIMouseState(event.target), true);
  document.addEventListener('mousedown', (event) => {
    nativeCursorMouseDown = true;
    syncWebUIMouseState(event.target);
  }, true);
  document.addEventListener('mouseup', (event) => {
    nativeCursorMouseDown = false;
    syncWebUIMouseState(event.target);
  }, true);
  document.addEventListener('mouseleave', () => {
    nativeCursorMouseDown = false;
    syncWebUIMouseState(null);
  }, true);
  window.addEventListener('blur', () => {
    nativeCursorMouseDown = false;
    syncWebUIMouseState(null);
  });
}

function dispatchBridgeEvent(eventName: string, data: unknown) {
  applyAppModeBridgeGate(eventName, data);
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

  engine.on('StrategyNotificationAnchorsFrame', (
    entryStrings,
    entryNumbers,
  ) => {
    const startedAtMs = Date.now();
    const data = nativeNotificationAnchorsFramePayload(entryStrings, entryNumbers);
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

  // While the engine composites glance plates itself (same-frame placement), the DOM copies
  // stay mounted for input but their visuals are hidden via this root class.
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
  bindMouseStateBridge();
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
// engine compositor to sample (any element with data-world-anchor — see
// src/runtime/worldAnchorHost.tsx), and announces readiness through its own bridge action —
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

  const [{ default: WorldAnchorHost }, { default: GlanceAtlasRoot }, { GameProvider }] = await Promise.all([
    import('./runtime/worldAnchorHost'),
    import('./components/world-glances/GlanceAtlasRoot'),
    import('./context/GameProvider'),
  ]);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GameProvider>
        <WorldAnchorHost>
          <GlanceAtlasRoot />
        </WorldAnchorHost>
      </GameProvider>
    </StrictMode>,
  );

  const engine = getRuntimeEngine();
  if (engine) {
    void Promise.resolve(engine.call('WorldAnchorReady'))
      .catch(error => acknowledgeBridgeFailure(error, 'WorldAnchorReady'));
  }
}

const bootView = new URLSearchParams(window.location.search).get('view');
void (bootView === 'strategy_world_anchors' ? bootstrapWorldAnchors() : bootstrap());
