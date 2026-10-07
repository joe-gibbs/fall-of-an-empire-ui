import { startTransition, use, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { BridgeActions } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent, getCachedBridgeEventRevision, nextBridgeCacheRevision } from './bridgeEventCache';
import { acknowledgeBridgeFailure } from './runtimeEngine';

type BridgeActionName = keyof BridgeActions;
type RequestOf<A extends BridgeActionName> = BridgeActions[A]['request'];
type ResponseOf<A extends BridgeActionName> = BridgeActions[A]['response'];

const inFlightQueries = new Map<string, Promise<unknown>>();
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

export function clearBridgeQueryCache(action?: BridgeActionName): void {
  if (!action) {
    completedQueries.clear();
    renderingQueries.clear();
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

function writeCompletedQuery(requestKey: string, value: unknown, ttlMs: number | null, revision = nextBridgeCacheRevision()): void {
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
        record.promise = requestBridge(action, payload, requestKey).then(raw => {
          record.revision = nextBridgeCacheRevision();
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

    // Subscribe to push events up-front so hooks that mount before the first
    // response still receive later game-side updates.
    const unsub = onBridgeEvent(action, ((raw: ResponseOf<A>) => {
      if (cancelled) return;
      if (matchRef.current && !matchRef.current(raw)) return;
      if (shouldCacheResponse) {
        writeCompletedQuery(requestKey, raw, completedTtlMs);
      }
      const revision = nextBridgeCacheRevision();
      const mapPush = mapRef.current;
      const merge = mergePushRef.current;
      commitData((current) => {
        const currentValue = current?.requestKey === requestKey ? current.value : null;
        return {
          requestKey,
          revision,
          value: merge
            ? merge(currentValue, raw)
            : mapPush(raw),
        };
      });
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
      const mapCached = mapRef.current;
      const mergeCached = mergePushRef.current;
      commitData(current => ({
        requestKey,
        revision,
        value: mergeCached
          ? mergeCached(current?.requestKey === requestKey ? current.value : null, cachedResponse)
          : mapCached(cachedResponse),
      }));
    }

    const requestFresh = () => {
      requestBridge(action, payload, requestKey)
        .then((raw) => {
          if (cancelled) return;
          if (shouldCacheResponse) {
            writeCompletedQuery(requestKey, raw, completedTtlMs);
          }
          commitData({ requestKey, value: mapRef.current(raw as ResponseOf<A>), revision: nextBridgeCacheRevision() });
        })
        .catch((error) => {
          if (cancelled) return;
          acknowledgeBridgeFailure(error);
        });
    };

    if (fetch && completed === undefined && !(suspend && resolvedData?.requestKey === requestKey)) {
      requestFresh();
    }

    const mutationUnsubscribers = (JSON.parse(refreshOnKey) as BridgeActionName[])
      .map(event => onBridgeEvent(event, requestFresh));

    let refreshTimer: number | undefined;
    if (fetch && refreshMs > 0) {
      refreshTimer = window.setInterval(requestFresh, refreshMs);
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

function requestBridge(action: BridgeActionName, payload: unknown, requestKey: string): Promise<unknown> {
  let request = inFlightQueries.get(requestKey);
  if (!request) {
    const call = bridgeCall as unknown as (a: BridgeActionName, p?: unknown) => Promise<unknown>;
    request = call(action, payload).finally(() => {
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
