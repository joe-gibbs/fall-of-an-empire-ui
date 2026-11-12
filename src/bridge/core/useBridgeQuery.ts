import { startTransition, use, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { onBridgeEvent } from '../../bridge-types.generated.ts';
import type { BridgeActions } from '../../bridge-types.generated.ts';
import { currentBridgeEventRevision, getCachedBridgeEvent, getCachedBridgeEventRevision } from './bridgeEventCache';
import { acknowledgeBridgeFailure, callRuntimeBridgeRevisioned, type RevisionedBridgeResult } from './runtimeEngine';

type BridgeActionName = keyof BridgeActions;
type RequestOf<A extends BridgeActionName> = BridgeActions[A]['request'];
type ResponseOf<A extends BridgeActionName> = BridgeActions[A]['response'];

const inFlightQueries = new Map<string, Promise<RevisionedBridgeResult>>();
// A suspended render has not mounted yet, so its request must survive retries.
interface RenderingBridgeQuery {
  promise: Promise<unknown>;
  revision: number;
}
const renderingQueries = new Map<string, RenderingBridgeQuery>();

/** Release abandoned render attempts when the player requests another view. */
export function beginBridgeQueryTransition(): void {
  renderingQueries.clear();
}
interface CompletedBridgeQuery {
  value: unknown;
  storedAtMs: number;
  ttlMs: number | null;
  revision: number;
}

const completedQueries = new Map<string, CompletedBridgeQuery>();
const fullCacheClearListeners = new Set<() => void>();

/** Register a module-level cache that must be dropped whenever every bridge query is cleared. */
export function onBridgeQueryCacheCleared(listener: () => void): void {
  fullCacheClearListeners.add(listener);
}

export function clearBridgeQueryCache(action?: BridgeActionName): void {
  if (!action) {
    completedQueries.clear();
    renderingQueries.clear();
    for (const listener of fullCacheClearListeners) listener();
    return;
  }

  const prefix = `${action}:`;
  for (const key of renderingQueries.keys()) {
    if (key.startsWith(prefix)) renderingQueries.delete(key);
  }
  for (const key of completedQueries.keys()) {
    if (key.startsWith(prefix)) {
      completedQueries.delete(key);
    }
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function readCompletedQuery(requestKey: string): CompletedBridgeQuery | undefined {
  const completed = completedQueries.get(requestKey);
  if (!completed) {
    return undefined;
  }

  if (completed.ttlMs !== null && nowMs() - completed.storedAtMs > completed.ttlMs) {
    completedQueries.delete(requestKey);
    return undefined;
  }

  return completed;
}

// Revisions order every value by when it left the game: a push gets its revision on arrival,
// a request gets its revision when it is sent. An older value never replaces a newer one.
function writeCompletedQuery(requestKey: string, value: unknown, ttlMs: number | null, revision: number): void {
  const existing = completedQueries.get(requestKey);
  if (existing && existing.revision > revision) return;
  completedQueries.set(requestKey, {
    value,
    storedAtMs: nowMs(),
    ttlMs,
    revision,
  });
}

interface UseBridgeQueryOptions<A extends BridgeActionName, T> {
  action: A;
  /**
   * Request payload. Pass `null` to skip the query (the hook returns `null`).
   * For void-request actions, omit this field.
   */
  payload?: RequestOf<A> | null;
  /** Transform the raw response into the UI shape. Return `null` to clear. */
  map: (data: ResponseOf<A>) => T | null;
  /** Subscribe to pushes but skip the initial request when cached data is already current enough. */
  fetch?: boolean;
  /** Keep the completed response for immutable or explicitly pushed actions. */
  cacheResponse?: boolean;
  /** Reuse a completed response for short-lived repeated mounts of expensive local bridge actions. */
  cacheResponseMs?: number;
  /** Re-fetch while mounted for visible data that can change without a push event. */
  refreshMs?: number;
  /** Refresh this exact request when a mutation emits its completion event. */
  refreshOn?: readonly BridgeActionName[];
  /** Keep the last response visible while a changed payload is being resolved. */
  keepPreviousData?: boolean;
  /** Commit this view only once its initial or changed request has resolved. */
  suspend?: boolean;
  /**
   * Optional filter for push updates so an unrelated push (e.g. a different
   * settlement) doesn't overwrite our current data.
   */
  matchPush?: (data: ResponseOf<A>) => boolean;
  /** Merge a partial pushed response into the current mapped value. */
  mergePush?: (current: T | null, data: ResponseOf<A>) => T | null;
}

export interface BridgeQueryState<T> {
  value: T | null;
  pending: boolean;
}

/**
 * Generic bridge query hook: fetches once on mount / payload change, subscribes
 * to push updates from the game side, and cleans up on unmount.
 */
export function useBridgeQueryState<A extends BridgeActionName, T>(
  options: UseBridgeQueryOptions<A, T>,
): BridgeQueryState<T> {
  const { action, payload, map, matchPush, mergePush, fetch = true, keepPreviousData = false, suspend = false } = options;
  const cacheResponse = options.cacheResponse === true;
  const cacheResponseMs = options.cacheResponseMs ?? 0;
  const refreshMs = options.refreshMs ?? 0;
  const shouldCacheResponse = cacheResponse || cacheResponseMs > 0;
  const completedTtlMs = cacheResponse ? null : cacheResponseMs;
  const [data, setData] = useState<{ requestKey: string; value: T | null; revision: number } | null>(null);

  // Hold map / matchPush in refs so callers don't have to memoise them.
  const mapRef = useRef(map);
  const matchRef = useRef(matchPush);
  const mergePushRef = useRef(mergePush);
  useLayoutEffect(() => {
    mapRef.current = map;
    matchRef.current = matchPush;
    mergePushRef.current = mergePush;
  });

  // Serialise payload so a fresh-but-equal object doesn't refire the effect.
  const payloadKey = payload === undefined ? '__void__' : JSON.stringify(payload);
  const requestKey = `${action}:${payloadKey}`;
  const refreshOnKey = JSON.stringify(options.refreshOn ?? []);
  let resolvedData = data;
  if (suspend && fetch && payload !== null && data?.requestKey !== requestKey) {
    let rendering = renderingQueries.get(requestKey);
    if (!rendering) {
      const completed = shouldCacheResponse ? readCompletedQuery(requestKey) : undefined;
      const record: RenderingBridgeQuery = {
        promise: Promise.resolve(completed?.value),
        revision: completed?.revision ?? 0,
      };
      if (!completed) {
        record.promise = requestBridge(action, payload, requestKey, false).then(({ value: raw, sentRevision }) => {
          record.revision = sentRevision;
          if (shouldCacheResponse && renderingQueries.get(requestKey) === record) {
            writeCompletedQuery(requestKey, raw, completedTtlMs, record.revision);
          }
          return raw;
        });
      }
      rendering = record;
      renderingQueries.set(requestKey, record);
    }
    const raw = use(rendering.promise) as ResponseOf<A>;
    resolvedData = { requestKey, value: map(raw), revision: rendering.revision };
    setData(resolvedData);
  }
  const currentValue = payload !== null && (resolvedData?.requestKey === requestKey || keepPreviousData)
    ? resolvedData?.value ?? null
    : null;
  const pending = payload !== null && resolvedData?.requestKey !== requestKey;

  useEffect(() => {
    const commitData: typeof setData = update => startTransition(() => setData(update));
    if (payload === null) {
      commitData(null);
      return;
    }

    let cancelled = false;
    renderingQueries.delete(requestKey);

    // Pushes seen while a request is in flight are replayed over its response when it
    // lands. A partial push that had nothing to merge into is then not lost, and a full
    // push that is newer than the request still wins.
    interface LoggedPush { revision: number; raw: ResponseOf<A> }
    let pushLog: LoggedPush[] = [];
    let outstandingRequests = 0;
    let latestResponseRevision = 0;

    const applyPush = (raw: ResponseOf<A>, revision: number) => {
      const mapPush = mapRef.current;
      const merge = mergePushRef.current;
      commitData((current) => {
        const ownCurrent = current?.requestKey === requestKey ? current : null;
        if (ownCurrent && ownCurrent.revision > revision) return current;
        const currentValue = ownCurrent?.value ?? null;
        const value = merge ? merge(currentValue, raw) : mapPush(raw);
        // A partial push with nothing to merge into produces no value; the pending
        // response picks it up from the push log instead.
        if (merge && value === null && currentValue === null) return current;
        return { requestKey, revision, value };
      });
    };

    // Subscribe to push events up-front so hooks that mount before the first
    // response still receive later game-side updates.
    const unsub = onBridgeEvent(action, ((raw: ResponseOf<A>) => {
      if (cancelled) return;
      if (matchRef.current && !matchRef.current(raw)) return;
      const revision = currentBridgeEventRevision();
      if (shouldCacheResponse) {
        writeCompletedQuery(requestKey, raw, completedTtlMs, revision);
      }
      if (outstandingRequests > 0) pushLog.push({ revision, raw });
      applyPush(raw, revision);
    }) as never);

    const completed = shouldCacheResponse ? readCompletedQuery(requestKey) : undefined;
    if (completed !== undefined) {
      const completedResponse = completed.value as ResponseOf<A>;
      commitData({
        requestKey,
        revision: completed.revision,
        value: mapRef.current(completedResponse),
      });
    }

    const cached = getCachedBridgeEvent(action);
    if (cached !== undefined
      && getCachedBridgeEventRevision(action) > Math.max(completed?.revision ?? 0, resolvedData?.requestKey === requestKey ? resolvedData.revision : 0)
      && (!matchRef.current || matchRef.current(cached as ResponseOf<A>))) {
      const cachedResponse = cached as ResponseOf<A>;
      const revision = getCachedBridgeEventRevision(action);
      // A shared in-flight request may have been sent before this push arrived.
      pushLog.push({ revision, raw: cachedResponse });
      applyPush(cachedResponse, revision);
    }

    const applyResponse = (raw: ResponseOf<A>, sentRevision: number) => {
      if (sentRevision < latestResponseRevision) return;
      latestResponseRevision = sentRevision;
      const mapResponse = mapRef.current;
      const merge = mergePushRef.current;
      const laterPushes = pushLog
        .filter(entry => entry.revision > sentRevision)
        .sort((a, b) => a.revision - b.revision);
      let value = mapResponse(raw);
      let revision = sentRevision;
      for (const entry of laterPushes) {
        value = merge ? merge(value, entry.raw) : mapResponse(entry.raw);
        revision = entry.revision;
      }
      commitData(current => (current?.requestKey === requestKey && current.revision > revision
        ? current
        : { requestKey, value, revision }));
    };

    const finishRequest = () => {
      outstandingRequests -= 1;
      if (outstandingRequests === 0) pushLog = [];
    };

    // A mutation refresh must not share a request sent before the mutation finished.
    const requestFresh = (afterMutation: boolean) => {
      outstandingRequests += 1;
      requestBridge(action, payload, requestKey, afterMutation)
        .then(({ value: raw, sentRevision }) => {
          if (cancelled) return;
          if (shouldCacheResponse) {
            writeCompletedQuery(requestKey, raw, completedTtlMs, sentRevision);
          }
          applyResponse(raw as ResponseOf<A>, sentRevision);
          finishRequest();
        })
        .catch((error) => {
          if (cancelled) return;
          finishRequest();
          acknowledgeBridgeFailure(error);
        });
    };

    if (fetch && completed === undefined && !(suspend && resolvedData?.requestKey === requestKey)) {
      requestFresh(false);
    }

    const mutationUnsubscribers = (JSON.parse(refreshOnKey) as BridgeActionName[])
      .map(event => onBridgeEvent(event, () => requestFresh(true)));

    let refreshTimer: number | undefined;
    if (fetch && refreshMs > 0) {
      refreshTimer = window.setInterval(() => requestFresh(false), refreshMs);
    }

    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) {
        window.clearInterval(refreshTimer);
      }
      unsub();
      mutationUnsubscribers.forEach(unsubscribe => unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, cacheResponse, cacheResponseMs, completedTtlMs, fetch, payloadKey, refreshMs, refreshOnKey, requestKey, shouldCacheResponse, suspend]);

  return {
    value: currentValue,
    pending,
  };
}

function requestBridge(action: BridgeActionName, payload: unknown, requestKey: string, forceNew: boolean): Promise<RevisionedBridgeResult> {
  let request = forceNew ? undefined : inFlightQueries.get(requestKey);
  if (!request) {
    request = callRuntimeBridgeRevisioned({ action, payload }).finally(() => {
      if (inFlightQueries.get(requestKey) === request) inFlightQueries.delete(requestKey);
    });
    inFlightQueries.set(requestKey, request);
  }
  return request;
}

export function useBridgeQuery<A extends BridgeActionName, T>(
  options: UseBridgeQueryOptions<A, T>,
): T | null {
  return useBridgeQueryState(options).value;
}
