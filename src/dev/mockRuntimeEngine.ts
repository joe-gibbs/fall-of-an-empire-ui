import type { runtimeEngine } from '../bridge/core/runtimeEngine';
import { getAllScreens, getAllSidebars, isVisibleForFactionMode } from '../registry/index';
import {
  createMockBridgeRuntime,
  defaultIdForScreen,
  defaultIdForSidebar,
  type MockAppMode,
  type MockBridgeEventEmitter,
  type MockDefeatCause,
  type MockLaunchRequest,
  type MockOutcome,
} from './mockBridgeData';

type EngineCallback = (...args: unknown[]) => void;

interface StrategyBridgeRequest {
  action?: string;
  payload?: unknown;
  requestId?: string;
}

interface StrategyBridgeBatchRequest {
  requests?: StrategyBridgeRequest[];
}

declare global {
  interface Window {
    __foaeMockBridge?: {
      launch: (request: MockLaunchRequest) => void;
      setAppMode: (mode: MockAppMode) => void;
      showNotification: () => void;
      showRegularNotification: () => void;
      showBattleAfterActionNotification: (outcome?: MockOutcome) => void;
      showEvent: () => void;
      showImportantEvent: () => void;
      showRecallEvent: () => void;
      showGovernorSelection: () => void;
      showCourtierPromotion: () => void;
      showAllyCallDialog: () => void;
      showVictory: () => void;
      showDefeat: (cause?: MockDefeatCause) => void;
      setProvinceMode: (enabled: boolean) => void;
    };
  }
}

function parseBridgeRequest(raw: unknown): StrategyBridgeRequest {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as StrategyBridgeRequest;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? raw as StrategyBridgeRequest : {};
}

function parseBridgeBatchRequest(raw: unknown): StrategyBridgeBatchRequest {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as StrategyBridgeBatchRequest;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? raw as StrategyBridgeBatchRequest : {};
}

function hasLaunchQuery(params: URLSearchParams): boolean {
  return params.has('screen')
    || params.has('sidebar')
    || params.has('notification')
    || params.has('regularNotification')
    || params.has('battleAarNotification')
    || params.has('battleAar')
    || params.has('event')
    || params.has('importantEvent')
    || params.has('important')
    || params.has('recall')
    || params.has('tutorialSpotlight')
    || params.has('governorSelection')
    || params.has('courtier')
    || params.has('allyCall')
    || params.has('ally')
    || params.has('outcome')
    || params.has('victory')
    || params.has('defeat')
    || params.has('gameover')
    || params.has('mode');
}

function parseOutcome(params: URLSearchParams): MockOutcome | undefined {
  const outcomeParam = params.get('outcome')?.toLowerCase();
  if (outcomeParam === 'victory' || params.has('victory')) return 'victory';
  if (outcomeParam === 'defeat' || outcomeParam === 'gameover' || params.has('defeat') || params.has('gameover')) return 'defeat';
  return undefined;
}

function parseDefeatCause(value: string | null): MockDefeatCause | undefined {
  if (value === 'extinction' || value === 'conquest' || value === 'subjugation' || value === 'rebellion' || value === 'governorship' || value === 'demo_expired') return value;
  return undefined;
}

function parseOptionalInteger(value: string | null): number | undefined {
  if (value === null || value.trim().length === 0) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function launchRequestFromQuery(params: URLSearchParams): MockLaunchRequest {
  const modeParam = params.get('mode');
  const appMode: MockAppMode | undefined = modeParam === 'mainmenu' || modeParam === 'ingame' || modeParam === 'loading'
    ? modeParam
    : undefined;
  const battleAarParam = (params.get('battleAar') ?? params.get('battleAarOutcome'))?.toLowerCase();
  const battleAarOutcome: MockOutcome | undefined = battleAarParam === 'victory' || battleAarParam === 'defeat'
    ? battleAarParam
    : undefined;

  return {
    appMode,
    screen: params.get('screen') || undefined,
    screenId: params.get('screenId') || params.get('id') || undefined,
    sidebar: params.get('sidebar') || undefined,
    sidebarId: params.get('sidebarId') || params.get('id') || undefined,
    sidebarTabIndex: parseOptionalInteger(params.get('tabIndex') ?? params.get('sidebarTabIndex')),
    notification: params.has('notification'),
    regularNotification: params.has('regularNotification'),
    battleAarNotification: params.has('battleAarNotification') || params.has('battleAar'),
    battleAarOutcome,
    event: params.has('event'),
    importantEvent: params.has('importantEvent') || params.has('important'),
    recallEvent: params.has('recall'),
    tutorialSpotlight: params.has('tutorialSpotlight'),
    governorSelection: params.has('governorSelection'),
    courtier: params.has('courtier'),
    allyCall: params.has('allyCall') || params.has('ally'),
    outcome: parseOutcome(params),
    defeatCause: parseDefeatCause(params.get('cause') ?? params.get('defeatCause')),
  };
}

function setStyles(element: HTMLElement, cssText: string) {
  element.style.cssText = cssText;
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  setStyles(button, [
    'height:26px',
    'padding:0 8px',
    'border:1px solid #8b6d32',
    'background:#3a1f24',
    'color:#ead8ad',
    'font:12px Arial',
    'cursor:pointer',
  ].join(';'));
  button.addEventListener('click', onClick);
  return button;
}

function createSelect(values: string[]): HTMLSelectElement {
  const select = document.createElement('select');
  setStyles(select, [
    'height:26px',
    'min-width:150px',
    'background:#15191d',
    'color:#ead8ad',
    'border:1px solid #5e5035',
    'font:12px Arial',
  ].join(';'));
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  return select;
}

function setSelectOptions(select: HTMLSelectElement, values: string[]) {
  const previousValue = select.value;
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(previousValue)) {
    select.value = previousValue;
  } else if (values.length > 0) {
    select.value = values[0];
  }
}

function createInput(value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  setStyles(input, [
    'height:24px',
    'width:180px',
    'background:#111417',
    'color:#ead8ad',
    'border:1px solid #5e5035',
    'padding:0 6px',
    'font:12px Arial',
  ].join(';'));
  return input;
}

function createLabel(text: string): HTMLSpanElement {
  const label = document.createElement('span');
  label.textContent = text;
  setStyles(label, 'min-width:54px;color:#b7a277;font:11px Arial;text-transform:uppercase');
  return label;
}

function createRow(labelText: string, children: HTMLElement[]): HTMLDivElement {
  const row = document.createElement('div');
  setStyles(row, 'display:flex;align-items:center');
  row.appendChild(createLabel(labelText));
  children.forEach(child => {
    child.style.marginLeft = '6px';
    row.appendChild(child);
  });
  return row;
}

function dispatchEscape() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
}

function installLauncher(runtime: ReturnType<typeof createMockBridgeRuntime>, emitBridgeEvent: MockBridgeEventEmitter, startCollapsed: boolean) {
  const existing = document.getElementById('foae-mock-launcher');
  if (existing) existing.remove();
  let collapsed = startCollapsed;

  const root = document.createElement('div');
  root.id = 'foae-mock-launcher';
  setStyles(root, [
    'position:fixed',
    'right:12px',
    'bottom:12px',
    'z-index:2147483647',
    'display:flex',
    'flex-direction:column',
    'padding:10px',
    'background:rgba(16,18,20,0.94)',
    'border:1px solid #8b6d32',
    'color:#ead8ad',
    'font:12px Arial',
    'pointer-events:auto',
  ].join(';'));

  const title = document.createElement('div');
  setStyles(title, 'font:700 12px Arial;color:#f2d487;text-transform:uppercase;cursor:pointer');
  root.appendChild(title);
  const launcherRows: HTMLElement[] = [];

  function addLauncherRow(row: HTMLElement) {
    launcherRows.push(row);
    root.appendChild(row);
  }

  function applyCollapsedState() {
    title.textContent = collapsed ? '[+] FOAE Mock UI' : '[-] FOAE Mock UI';
    launcherRows.forEach(row => {
      row.style.display = collapsed ? 'none' : 'flex';
    });
  }

  title.addEventListener('click', () => {
    collapsed = !collapsed;
    applyCollapsedState();
  });

  const screensForCurrentMode = () => getAllScreens()
    .filter(screen => isVisibleForFactionMode(screen, runtime.state.provinceMode))
    .map(screen => screen.id)
    .sort();
  const sidebars = getAllSidebars().map(sidebar => sidebar.id).sort();

  const screenSelect = createSelect(screensForCurrentMode());
  const screenIdInput = createInput(defaultIdForScreen(screenSelect.value));
  screenSelect.addEventListener('change', () => {
    screenIdInput.value = defaultIdForScreen(screenSelect.value);
  });
  addLauncherRow(createRow('Screen', [
    screenSelect,
    screenIdInput,
    createButton('Open', () => {
      runtime.launch({
        appMode: 'ingame',
        screen: screenSelect.value,
        screenId: screenIdInput.value || defaultIdForScreen(screenSelect.value),
      }, emitBridgeEvent);
    }),
  ]));

  const playerModeLabel = document.createElement('span');
  setStyles(playerModeLabel, 'min-width:78px;color:#ead8ad;font:12px Arial');
  function refreshPlayerModeControls() {
    playerModeLabel.textContent = runtime.state.provinceMode ? 'Province' : 'Independent';
    setSelectOptions(screenSelect, screensForCurrentMode());
    screenIdInput.value = defaultIdForScreen(screenSelect.value);
  }
  addLauncherRow(createRow('Player', [
    createButton('Independent', () => {
      runtime.setProvinceMode(false, emitBridgeEvent);
      refreshPlayerModeControls();
    }),
    createButton('Province', () => {
      runtime.setProvinceMode(true, emitBridgeEvent);
      refreshPlayerModeControls();
    }),
    playerModeLabel,
  ]));

  const sidebarSelect = createSelect(sidebars);
  const sidebarIdInput = createInput(defaultIdForSidebar(sidebarSelect.value));
  sidebarSelect.addEventListener('change', () => {
    sidebarIdInput.value = defaultIdForSidebar(sidebarSelect.value);
  });
  addLauncherRow(createRow('Sidebar', [
    sidebarSelect,
    sidebarIdInput,
    createButton('Open', () => {
      runtime.launch({
        appMode: 'ingame',
        sidebar: sidebarSelect.value,
        sidebarId: sidebarIdInput.value || defaultIdForSidebar(sidebarSelect.value),
      }, emitBridgeEvent);
    }),
  ]));

  addLauncherRow(createRow('Mode', [
    createButton('In Game', () => runtime.setAppMode('ingame', emitBridgeEvent)),
    createButton('Main Menu', () => runtime.setAppMode('mainmenu', emitBridgeEvent)),
    createButton('Escape', dispatchEscape),
    createButton('Clear', () => {
      emitBridgeEvent('ui.show_screen', { screen: '', id: '' });
      emitBridgeEvent('ui.sidebar_event', { type: 'close', id: '' });
    }),
  ]));

  addLauncherRow(createRow('Push', [
    createButton('Cinematic', () => runtime.showNotification(emitBridgeEvent)),
    createButton('Regular', () => runtime.showRegularNotification(emitBridgeEvent)),
    createButton('Battle AAR', () => runtime.showBattleAfterActionNotification(emitBridgeEvent, 'victory')),
    createButton('Defeat AAR', () => runtime.showBattleAfterActionNotification(emitBridgeEvent, 'defeat')),
    createButton('Event', () => runtime.showEvent(emitBridgeEvent)),
    createButton('Important Event', () => runtime.showImportantEvent(emitBridgeEvent)),
    createButton('Recall', () => runtime.showRecallEvent(emitBridgeEvent)),
    createButton('Governor', () => runtime.showGovernorSelection(emitBridgeEvent)),
    createButton('Courtier', () => runtime.showCourtierPromotion(emitBridgeEvent)),
    createButton('Ally Call', () => runtime.showAllyCallDialog(emitBridgeEvent)),
  ]));

  const defeatCauseSelect = createSelect(['rebellion', 'extinction', 'conquest', 'subjugation']);
  addLauncherRow(createRow('Outcome', [
    createButton('Victory', () => runtime.showVictory(emitBridgeEvent)),
    createButton('Defeat', () => runtime.showDefeat(emitBridgeEvent, parseDefeatCause(defeatCauseSelect.value) ?? 'rebellion')),
    defeatCauseSelect,
  ]));

  refreshPlayerModeControls();
  applyCollapsedState();
  document.body.appendChild(root);
}

export function installMockruntimeEngine(): void {
  if (window.__foaeMockBridge) return;

  const params = new URLSearchParams(window.location.search);
  const runtime = createMockBridgeRuntime(params);
  const listeners = new Map<string, Set<EngineCallback>>();
  document.body.style.backgroundColor = '#15171d';
  document.body.style.backgroundImage = "url('/assets/main-menu-background.png')";
  document.body.style.backgroundPosition = 'center center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundSize = 'cover';

  function emitEngineEvent(name: string, ...args: unknown[]) {
    const callbacks = listeners.get(name);
    if (!callbacks) return;
    callbacks.forEach(callback => callback(...args));
  }

  const emitBridgeEvent: MockBridgeEventEmitter = (eventName, payload) => {
    emitEngineEvent('StrategyBridgeEvent', eventName, payload);
  };

  const engine: runtimeEngine = {
    isAttached: true,
    whenReady: Promise.resolve(),
    on(name, callback) {
      const callbacks = listeners.get(name) ?? new Set<EngineCallback>();
      callbacks.add(callback);
      listeners.set(name, callbacks);
    },
    callBridge(request) {
      const action = typeof request.action === 'string' ? request.action : '';
      const requestId = typeof request.requestId === 'string' ? request.requestId : '';
      const response = runtime.handle(action, request.payload, emitBridgeEvent);
      if (requestId.length > 0) {
        emitBridgeEvent('ui.bridge_response', {
          requestId,
          response,
        });
      }
      return JSON.stringify({ ok: true, pending: true, requestId });
    },
    call(name, ...args) {
      if (name === 'StrategyBridgeCall') {
        const request = parseBridgeRequest(args[0]);
        const response = runtime.handle(request.action ?? '', request.payload, emitBridgeEvent);
        return JSON.stringify(response);
      }

      if (name === 'StrategyBridgeBatchCall') {
        const batch = parseBridgeBatchRequest(args[0]);
        if (Array.isArray(batch.requests)) {
          batch.requests.forEach(request => {
            if (typeof request.requestId !== 'string' || request.requestId.length === 0) {
              return;
            }

            const response = runtime.handle(request.action ?? '', request.payload, emitBridgeEvent);
            emitBridgeEvent('ui.bridge_response', {
              requestId: request.requestId,
              response,
            });
          });
        }
        return JSON.stringify({ ok: true, pending: true });
      }

      if (name === 'ScriptingReady') {
        return undefined;
      }

      if (name === 'UIRendered') {
        return undefined;
      }

      if (name === 'StrategyPlayUISound') {
        return undefined;
      }

      if (name === 'StrategyWebUIPerfReport') {
        console.log(String(args[0] ?? ''));
        return undefined;
      }

      if (name === 'StrategyWebUIPerfSample') {
        return undefined;
      }

      console.warn(`[MockBridge] Unknown engine call: ${name}`);
      return undefined;
    },
  };

  window.__webkilnRuntimeEngineMock = engine;
  window.__foaeMockBridge = {
    launch: (request) => runtime.launch(request, emitBridgeEvent),
    setAppMode: (mode) => runtime.setAppMode(mode, emitBridgeEvent),
    showNotification: () => runtime.showNotification(emitBridgeEvent),
    showRegularNotification: () => runtime.showRegularNotification(emitBridgeEvent),
    showBattleAfterActionNotification: (outcome) => runtime.showBattleAfterActionNotification(emitBridgeEvent, outcome),
    showEvent: () => runtime.showEvent(emitBridgeEvent),
    showImportantEvent: () => runtime.showImportantEvent(emitBridgeEvent),
    showRecallEvent: () => runtime.showRecallEvent(emitBridgeEvent),
    showGovernorSelection: () => runtime.showGovernorSelection(emitBridgeEvent),
    showCourtierPromotion: () => runtime.showCourtierPromotion(emitBridgeEvent),
    showAllyCallDialog: () => runtime.showAllyCallDialog(emitBridgeEvent),
    showVictory: () => runtime.showVictory(emitBridgeEvent),
    showDefeat: (cause) => runtime.showDefeat(emitBridgeEvent, cause),
    setProvinceMode: (enabled) => runtime.setProvinceMode(enabled, emitBridgeEvent),
  };

  const collapseLauncher = hasLaunchQuery(params) && params.get('launcher') !== 'open';
  window.setTimeout(() => installLauncher(runtime, emitBridgeEvent, collapseLauncher), 0);
  window.setInterval(() => runtime.advanceDay(emitBridgeEvent), 900);

  if (hasLaunchQuery(params)) {
    window.setTimeout(() => {
      runtime.launch(launchRequestFromQuery(params), emitBridgeEvent);
    }, 250);
  }
}
