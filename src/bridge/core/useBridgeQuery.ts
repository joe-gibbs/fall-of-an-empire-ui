import { useEffect, useRef, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type { BridgeActions } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent } from './bridgeEventCache';
import { acknowledgeBridgeFailure } from './runtimeEngine';

type BridgeActionName = keyof BridgeActions;
type RequestOf<A extends BridgeActionName> = BridgeActions[A]['request'];
type ResponseOf<A extends BridgeActionName> = BridgeActions[A]['response'];

const inFlightQueries = new Map<string, Promise<unknown>>();
interface CompletedBridgeQuery {
  value: unknown;
  storedAtMs: number;
  ttlMs: number | null;
}

const completedQueries = new Map<string, CompletedBridgeQuery>();

export function clearBridgeQueryCache(action?: BridgeActionName): void {
  if (!action) {
    completedQueries.clear();
    return;
  }

  const prefix = `${action}:`;
  for (const key of completedQueries.keys()) {
    if (key.startsWith(prefix)) {
      completedQueries.delete(key);
    }
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function readCompletedQuery(requestKey: string): unknown | undefined {
  const completed = completedQueries.get(requestKey);
  if (!completed) {
    return undefined;
  }

  if (completed.ttlMs !== null && nowMs() - completed.storedAtMs > completed.ttlMs) {
    completedQueries.delete(requestKey);
    return undefined;
  }

  return completed.value;
}

function writeCompletedQuery(requestKey: string, value: unknown, ttlMs: number | null): void {
  completedQueries.set(requestKey, {
    value,
    storedAtMs: nowMs(),
    ttlMs,
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
  /**
   * Optional filter for push updates so an unrelated push (e.g. a different
   * settlement) doesn't overwrite our current data.
   */
  matchPush?: (data: ResponseOf<A>) => boolean;
}

/**
 * Generic bridge query hook: fetches once on mount / payload change, subscribes
 * to push updates from the game side, and cleans up on unmount.
 *
 * Replaces the per-action boilerplate of fetch + onBridgeEvent + cancellation
 * tracking that each useXxxBridge hook used to repeat.
 */
export function useBridgeQuery<A extends BridgeActionName, T>(
  options: UseBridgeQueryOptions<A, T>,
): T | null {
  const { action, payload, map, matchPush, fetch = true } = options;
  const cacheResponse = options.cacheResponse === true;
  const cacheResponseMs = options.cacheResponseMs ?? 0;
  const refreshMs = options.refreshMs ?? 0;
  const shouldCacheResponse = cacheResponse || cacheResponseMs > 0;
  const completedTtlMs = cacheResponse ? null : cacheResponseMs;
  const [data, setData] = useState<{ requestKey: string; value: T | null } | null>(null);

  // Hold map / matchPush in refs so callers don't have to memoise them.
  const mapRef = useRef(map);
  const matchRef = useRef(matchPush);
  mapRef.current = map;
  matchRef.current = matchPush;

  // Serialise payload so a fresh-but-equal object doesn't refire the effect.
  const payloadKey = payload === undefined ? '__void__' : JSON.stringify(payload);
  const requestKey = `${action}:${payloadKey}`;

  useEffect(() => {
    if (payload === null) {
      setData(null);
      return;
    }

    let cancelled = false;

    // Subscribe to push events up-front so hooks that mount before the first
    // response still receive later game-side updates.
    const unsub = onBridgeEvent(action, ((raw: ResponseOf<A>) => {
      if (cancelled) return;
      if (matchRef.current && !matchRef.current(raw)) return;
      if (shouldCacheResponse) {
        writeCompletedQuery(requestKey, raw, completedTtlMs);
      }
      setData({ requestKey, value: mapRef.current(raw) });
    }) as never);

    const cached = getCachedBridgeEvent(action);
    if (cached !== undefined && (!matchRef.current || matchRef.current(cached as ResponseOf<A>))) {
      setData({ requestKey, value: mapRef.current(cached as ResponseOf<A>) });
    }

    const completed = shouldCacheResponse ? readCompletedQuery(requestKey) : undefined;
    if (completed !== undefined && (!matchRef.current || matchRef.current(completed as ResponseOf<A>))) {
      setData({ requestKey, value: mapRef.current(completed as ResponseOf<A>) });
    }

    // The variadic typing on bridgeCall can't be satisfied generically here;
    // cast through a less precise signature.
    const call = bridgeCall as unknown as (a: BridgeActionName, p?: unknown) => Promise<unknown>;
    const requestFresh = () => {
      let request = inFlightQueries.get(requestKey);
      if (!request) {
        request = call(action, payload === undefined ? undefined : payload)
          .finally(() => {
            if (inFlightQueries.get(requestKey) === request) {
              inFlightQueries.delete(requestKey);
            }
          });
        inFlightQueries.set(requestKey, request);
      }

      request
        .then((raw) => {
          if (cancelled) return;
          if (shouldCacheResponse) {
            writeCompletedQuery(requestKey, raw, completedTtlMs);
          }
          setData({ requestKey, value: mapRef.current(raw as ResponseOf<A>) });
        })
        .catch((error) => {
          if (cancelled) return;
          acknowledgeBridgeFailure(error);
        });
    };

    if (fetch && completed === undefined) {
      requestFresh();
    }

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, cacheResponse, cacheResponseMs, completedTtlMs, fetch, payloadKey, refreshMs, requestKey, shouldCacheResponse]);

  return data?.requestKey === requestKey ? data.value : null;
}
