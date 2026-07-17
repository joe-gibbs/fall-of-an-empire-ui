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


interface WebkilnGameUI {
  request: (action: string, payload?: unknown) => Promise<unknown>;
  on: (name: string, callback: (...args: unknown[]) => void) => (() => void) | void;
}

const BRIDGE_RESPONSE_EVENT = 'bridge:ui.bridge_response';
let nextBridgeRequestId = 1;
const reportedBridgeErrors = new WeakSet<object>();
const reportedBridgeErrorKeys = new Set<string>();

declare global {
  interface Window {
    gameUI?: WebkilnGameUI;
    __webkilnRuntimeEngineMock?: runtimeEngine;
  }
}

let webkilnEngineAdapter: runtimeEngine | null = null;

export function requireruntimeEngine(): runtimeEngine {
  const engine = getruntimeEngine();
  if (!engine) {
    throw new Error('Webkiln runtime is not available');
  }
  return engine;
}

export function getruntimeEngine(): runtimeEngine | null {
	if (window.__webkilnRuntimeEngineMock) {
		return window.__webkilnRuntimeEngineMock;
	}

	const gameUI = window.gameUI;
	if (!gameUI?.request || !gameUI.on) {
		return null;
	}
	if (!webkilnEngineAdapter) {
		webkilnEngineAdapter = {
			isAttached: true,
			whenReady: Promise.resolve(),
			on: (name, callback) => { gameUI.on(name, callback); },
			call: (name, ...args) => gameUI.request(
				name,
				args.length <= 1 ? (args.length === 1 ? args[0] : null) : args,
			),
			callBridge: (request) => {
				const requestId = typeof request.requestId === 'string' ? request.requestId : bridgeRequestId();
				const action = typeof request.action === 'string' ? request.action : '';
				void gameUI.request(action, request.payload).then(result => {
					window.dispatchEvent(new CustomEvent(BRIDGE_RESPONSE_EVENT, {
						detail: { requestId, response: { ok: true, result } },
					}));
				}, error => {
					window.dispatchEvent(new CustomEvent(BRIDGE_RESPONSE_EVENT, {
						detail: { requestId, response: { ok: false, error: bridgeErrorMessage(error) } },
					}));
				});
				return { ok: true, pending: true, requestId };
			},
		};
	}
	return webkilnEngineAdapter;
}

export const getRuntimeEngine = getruntimeEngine;

export function isRuntimeUnavailableError(error: unknown): boolean {
	return error instanceof Error && error.message === 'Webkiln runtime is not available';
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
		reject(new Error('Webkiln runtime is not available'));
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
		reject(new Error('Webkiln runtime is not available'));
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


export async function callRuntimeBridge(request: Record<string, unknown>, transientRetry = 0): Promise<unknown> {
  const startedAtMs = Date.now();
  const action = bridgeActionName(request);
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

      try {
        if (!engine.callBridge) {
			throw new Error('Webkiln native bridge direct call binding is not available');
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
