import { recordUIPerfBridgeCall } from '../../perf/uiPerfProfiler';

export interface runtimeEngine {
  call: (name: string, ...args: unknown[]) => unknown | Promise<unknown>;
  callBridge?: (request: Record<string, unknown>) => unknown | Promise<unknown>;
  on: (name: string, callback: (...args: unknown[]) => void) => void;
  whenReady?: Promise<void>;
  isAttached?: boolean;
}

interface BridgeEnvelope {
  ok: boolean;
  pending?: boolean;
  requestId?: string;
  result?: unknown;
  error?: string;
}

interface BridgeResponsePayload {
  requestId?: string;
  response?: unknown;
}

interface QueuedBridgeRequest {
  action: string;
  generation: number;
  request: Record<string, unknown>;
  settle: (raw: unknown) => void;
  fail: (error: unknown, detail: string) => void;
}

const BRIDGE_RESPONSE_EVENT = 'bridge:ui.bridge_response';
let nextBridgeRequestId = 1;
let bridgeRequestGeneration = 0;
let bridgeBatchQueue: QueuedBridgeRequest[] = [];
let bridgeBatchScheduled = false;
let gameplayBridgeRequestsBlocked = false;
const reportedBridgeErrors = new WeakSet<object>();
const reportedBridgeErrorKeys = new Set<string>();

declare global {
  interface Window {
    engine: runtimeEngine;
  }
}

export function requireruntimeEngine(): runtimeEngine {
  const engine = getruntimeEngine();
  if (!engine) {
    throw new Error('FoaeCefUI runtime engine is not available');
  }
  return engine;
}

export function getruntimeEngine(): runtimeEngine | null {
  const engine = window.engine;
  if (!engine?.call || !engine.on) {
    return null;
  }
  if (engine.isAttached === false) {
    return null;
  }
  return engine;
}

export const getRuntimeEngine = getruntimeEngine;

export function isRuntimeUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message === 'FoaeCefUI runtime engine is not available';
}

function bridgeActionName(request: Record<string, unknown>): string {
  return typeof request.action === 'string' ? request.action : 'unknown bridge action';
}

function bridgeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown bridge failure';
}

function isTransientGameplayReadinessError(error: unknown): boolean {
  const message = bridgeErrorMessage(error);
  return message === 'No game state' || message === 'No player faction';
}

function isCancelledBridgeRequestError(error: unknown): boolean {
  return bridgeErrorMessage(error) === 'Bridge call cancelled due to app mode change';
}

function isGameplayBridgeAction(action: string): boolean {
  return action.startsWith('game.')
    && action !== 'game.get_app_mode'
    && action !== 'game.loading_screen'
    && action !== 'game.get_languages'
    && action !== 'game.get_settings'
    && action !== 'game.get_webui_text';
}

function isMenuSafeBridgeAction(action: string): boolean {
  return action === 'game.get_app_mode'
    || action === 'game.loading_screen'
    || action === 'game.get_languages'
    || action === 'game.set_language'
    || action === 'game.get_settings'
    || action === 'game.apply_settings'
    || action === 'game.reset_settings'
    || action === 'game.rebind_action_key'
    || action === 'game.set_notification_muted'
    || action === 'game.reset_notification_mutes'
    || action === 'game.get_webui_text'
    || action === 'game.get_content_pack_webui_manifest'
    || action === 'game.get_encyclopedia_entries'
    || action === 'game.list_mods'
    || action === 'game.set_mod_enabled'
    || action === 'game.upload_mod_to_workshop'
    || action === 'game.browse_steam_workshop'
    || action === 'game.subscribe_steam_workshop_item'
    || action === 'game.unsubscribe_steam_workshop_item'
    || action === 'game.download_steam_workshop_item'
    || action === 'game.list_new_game_maps'
    || action === 'game.get_new_game_map_faction_selection'
    || action === 'game.pick_new_game_map_faction'
    || action === 'game.start_scenario_map'
    || action === 'game.list_saves'
    || action === 'game.delete_save'
    || action === 'game.load_save'
    || action === 'game.continue'
    || action === 'game.get_game_version'
    || action === 'game.get_achievements'
    || action === 'game.quit'
    || action === 'game.restart';
}

function isWorldGameplayBridgeAction(action: string): boolean {
  return isGameplayBridgeAction(action) && !isMenuSafeBridgeAction(action);
}

function shouldBatchBridgeAction(action: string): boolean {
  return action.startsWith('game.get_')
    || action.startsWith('game.list_')
    || action === 'game.loading_screen'
    || action === 'game.get_app_mode'
    || action === 'game.get_languages'
    || action === 'game.get_settings'
    || action === 'game.get_webui_text'
    || action === 'game.get_content_pack_webui_manifest';
}

export function cancelPendingGameplayBridgeRequests(): void {
  bridgeRequestGeneration += 1;
  const cancelled = bridgeBatchQueue.filter(request => isGameplayBridgeAction(request.action));
  bridgeBatchQueue = bridgeBatchQueue.filter(request => !isGameplayBridgeAction(request.action));
  const error = new Error('Bridge call cancelled due to app mode change');
  cancelled.forEach(request => request.fail(error, 'cancelled'));
}

export function setGameplayBridgeRequestsBlocked(blocked: boolean): void {
  if (gameplayBridgeRequestsBlocked === blocked) {
    return;
  }

  gameplayBridgeRequestsBlocked = blocked;
  if (blocked) {
    cancelPendingGameplayBridgeRequests();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function bridgeErrorObject(error: unknown): object | null {
  if ((typeof error === 'object' && error !== null) || typeof error === 'function') {
    return error;
  }
  return null;
}

function bridgeErrorWasReported(error: unknown): boolean {
  const errorObject = bridgeErrorObject(error);
  return errorObject !== null && reportedBridgeErrors.has(errorObject);
}

function markBridgeErrorReported(error: unknown): void {
  const errorObject = bridgeErrorObject(error);
  if (errorObject !== null) {
    reportedBridgeErrors.add(errorObject);
  }
}

function reportBridgeFailure(request: Record<string, unknown>, error: unknown): void {
  if (bridgeErrorWasReported(error)) {
    return;
  }

  markBridgeErrorReported(error);

  const action = bridgeActionName(request);
  const message = bridgeErrorMessage(error);
  const key = `${action}:${message}`;
  if (reportedBridgeErrorKeys.has(key)) {
    return;
  }

  reportedBridgeErrorKeys.add(key);

  if (request.payload === undefined) {
    console.error(`[Bridge] ${action} failed: ${message}`, error);
    return;
  }

  console.error(`[Bridge] ${action} failed: ${message}`, { payload: request.payload, error });
}

export function acknowledgeBridgeFailure(error: unknown, operation = 'unreported bridge operation'): void {
  if (isCancelledBridgeRequestError(error)) {
    return;
  }

  if (bridgeErrorWasReported(error)) {
    return;
  }

  reportBridgeFailure({ action: operation }, error);
}

export function waitForruntimeEngine(timeoutMs = 5000): Promise<runtimeEngine> {
  const engine = getruntimeEngine();
  if (engine) {
    return waitForEngineBindings(engine, timeoutMs);
  }

  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      const next = getruntimeEngine();
      if (next) {
        void waitForEngineBindings(next, Math.max(0, timeoutMs - (Date.now() - startedAt))).then(resolve, reject);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('FoaeCefUI runtime engine is not available'));
        return;
      }

      window.setTimeout(poll, 25);
    };

    poll();
  });
}

function waitForEngineBindings(engine: runtimeEngine, timeoutMs: number): Promise<runtimeEngine> {
  if (!engine.whenReady) {
    return Promise.resolve(engine);
  }

  const effectiveTimeoutMs = Math.max(1, timeoutMs);
  let timeoutId = 0;
  return new Promise((resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('FoaeCefUI runtime engine is not available'));
    }, effectiveTimeoutMs);

    engine.whenReady!.then(() => {
      window.clearTimeout(timeoutId);
      resolve(engine);
    }, error => {
      window.clearTimeout(timeoutId);
      reject(error);
    });
  });
}

function normalizeBridgeEnvelope(raw: unknown): BridgeEnvelope {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as BridgeEnvelope;
  }
  return raw as BridgeEnvelope;
}

function bridgeRequestId(): string {
  nextBridgeRequestId += 1;
  return `web-${Date.now()}-${nextBridgeRequestId}`;
}

function bridgePayloadSummary(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  const parts: string[] = [];
  ['factionId', 'personId', 'targetFactionId', 'settlementId', 'militaryId', 'screen', 'command'].forEach(key => {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      parts.push(`${key}=${value}`);
    }
  });
  return parts.join(' ');
}

function scheduleBridgeBatchFlush(): void {
  if (bridgeBatchScheduled) {
    return;
  }

  bridgeBatchScheduled = true;
  const flush = () => {
    void flushBridgeBatch();
  };
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(flush);
    return;
  }

  window.setTimeout(flush, 0);
}

function enqueueBridgeRequest(request: QueuedBridgeRequest): void {
  bridgeBatchQueue.push(request);
  scheduleBridgeBatchFlush();
}

async function flushBridgeBatch(): Promise<void> {
  const batch = bridgeBatchQueue.filter(request => request.generation === bridgeRequestGeneration || !isGameplayBridgeAction(request.action));
  const cancelled = bridgeBatchQueue.filter(request => request.generation !== bridgeRequestGeneration && isGameplayBridgeAction(request.action));
  bridgeBatchQueue = [];
  bridgeBatchScheduled = false;
  if (cancelled.length > 0) {
    const error = new Error('Bridge call cancelled due to app mode change');
    cancelled.forEach(request => request.fail(error, 'cancelled'));
  }
  if (batch.length === 0) {
    return;
  }

  try {
    const engine = await waitForruntimeEngine();
    const payload = { requests: batch.map(request => request.request) };
    const raw = await Promise.resolve(engine.call('StrategyBridgeBatchCall', payload));
    const envelope = normalizeBridgeEnvelope(raw);
    if (envelope.ok && envelope.pending) {
      return;
    }

    const message = envelope.ok
      ? 'Bridge batch did not return a pending response'
      : envelope.error || 'Bridge batch call failed';
    const error = new Error(message);
    batch.forEach(request => request.fail(error, envelope.ok ? 'batch response error' : 'batch rejected'));
  } catch (error) {
    batch.forEach(request => request.fail(error, 'batch call error'));
  }
}

export async function callRuntimeBridge(request: Record<string, unknown>, transientRetry = 0): Promise<unknown> {
  const startedAtMs = Date.now();
  const action = bridgeActionName(request);
  const generation = bridgeRequestGeneration;
  const payloadSummary = bridgePayloadSummary(request.payload);
  let perfRecorded = false;
  const recordBridgePerf = (detail: string) => {
    if (perfRecorded) return;
    perfRecorded = true;
    recordUIPerfBridgeCall(action, startedAtMs, Date.now(), payloadSummary ? `${detail} ${payloadSummary}` : detail);
  };
  try {
    const engine = await waitForruntimeEngine();
    const requestId = bridgeRequestId();
    const requestObject = { ...request, requestId };
    if (generation !== bridgeRequestGeneration && isGameplayBridgeAction(action)) {
      throw new Error('Bridge call cancelled due to app mode change');
    }

    if (gameplayBridgeRequestsBlocked && isWorldGameplayBridgeAction(action)) {
      throw new Error('Bridge call cancelled due to app mode change');
    }

    return await new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = 0;

      function handleResponse(event: CustomEvent<BridgeResponsePayload>) {
        const detail = event.detail;
        if (!detail || detail.requestId !== requestId) return;
        settle(detail.response);
      }

      function cleanup() {
        if (timeoutId !== 0) {
          window.clearTimeout(timeoutId);
        }
        window.removeEventListener(BRIDGE_RESPONSE_EVENT, handleResponse as EventListener);
      }

      function settle(raw: unknown) {
        if (settled) return;
        settled = true;
        cleanup();

        try {
          const envelope = normalizeBridgeEnvelope(raw);
          if (!envelope.ok) {
            reject(new Error(envelope.error || 'Bridge call failed'));
            return;
          }

          recordBridgePerf('ok');
          resolve(envelope.result);
        } catch (error) {
          recordBridgePerf('parse error');
          reject(error);
        }
      }

      function fail(error: unknown, detail: string) {
        if (settled) return;
        settled = true;
        cleanup();
        recordBridgePerf(detail);
        reject(error);
      }

      window.addEventListener(BRIDGE_RESPONSE_EVENT, handleResponse as EventListener);
      timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        recordBridgePerf('timeout');
        reject(new Error('Bridge call timed out'));
      }, 30000);

      if (shouldBatchBridgeAction(action)) {
        enqueueBridgeRequest({
          action,
          generation,
          request: requestObject,
          settle,
          fail,
        });
        return;
      }

      try {
        if (!engine.callBridge) {
          throw new Error('FoaeCefUI native bridge direct call binding is not available');
        }
        void Promise.resolve(engine.callBridge(requestObject))
          .then((raw) => {
            const envelope = normalizeBridgeEnvelope(raw);
            if (!envelope.ok || !envelope.pending) {
              fail(new Error(envelope.ok ? 'Bridge call did not return a pending response' : envelope.error || 'Bridge call failed'), 'direct rejected');
            }
          })
          .catch(error => fail(error, 'direct call error'));
      } catch (error) {
        fail(error, 'direct call error');
      }
    });
  } catch (error) {
    if (isCancelledBridgeRequestError(error)) {
      throw error;
    }

    if (isTransientGameplayReadinessError(error) && transientRetry < 120) {
      recordBridgePerf('retry gameplay readiness');
      await delay(250);
      return callRuntimeBridge(request, transientRetry + 1);
    }

    recordBridgePerf('failed');
    reportBridgeFailure(request, error);
    throw error;
  }
}
