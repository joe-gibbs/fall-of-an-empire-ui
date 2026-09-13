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

export function cacheBridgeEvent(eventName: string, data: unknown): void {
  bridgeEventCache.set(eventName, data);
  bridgeEventRevisions.set(eventName, nextBridgeCacheRevision());
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
