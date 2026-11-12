import type { BridgeActions } from '../../bridge-types.generated.ts';

const bridgeEventCache = new Map<string, unknown>();
const bridgeEventRevisions = new Map<string, number>();
let cacheRevision = 0;

export function nextBridgeCacheRevision(): number {
  return ++cacheRevision;
}

export function getCachedBridgeEventRevision(eventName: string): number {
  return bridgeEventRevisions.get(eventName) ?? 0;
}

/** Caches an event unless a newer value for it is already cached. Returns whether it was cached. */
export function cacheBridgeEvent(eventName: string, data: unknown, revision: number): boolean {
  if ((bridgeEventRevisions.get(eventName) ?? 0) > revision) return false;
  bridgeEventCache.set(eventName, data);
  bridgeEventRevisions.set(eventName, revision);
  return true;
}

let dispatchingRevision = 0;

/** Runs subscriber callbacks for an event whose value was produced at `revision`. */
export function withBridgeEventRevision(revision: number, dispatch: () => void): void {
  const previous = dispatchingRevision;
  dispatchingRevision = revision;
  try {
    dispatch();
  } finally {
    dispatchingRevision = previous;
  }
}

/**
 * The revision of the event currently being delivered to subscribers. A push gets its
 * revision on arrival; a re-published response keeps the revision from when it was sent.
 */
export function currentBridgeEventRevision(): number {
  return dispatchingRevision;
}

export function clearGameplayBridgeEventCache(): void {
  for (const key of bridgeEventCache.keys()) {
    if (
      key === 'game.get_app_mode'
      || key === 'game.loading_screen'
      || key === 'game.get_languages'
      || key === 'game.get_settings'
    ) {
      continue;
    }

    bridgeEventCache.delete(key);
    bridgeEventRevisions.delete(key);
  }
}

export function getCachedBridgeEvent<A extends keyof BridgeActions>(
  action: A,
): BridgeActions[A]['response'] | undefined {
  return bridgeEventCache.get(action) as BridgeActions[A]['response'] | undefined;
}

export function getCachedBridgeEventByName(eventName: string): unknown {
  return bridgeEventCache.get(eventName);
}
