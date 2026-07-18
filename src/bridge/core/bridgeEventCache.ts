import type { BridgeActions } from '../../bridge-types.generated.ts';

const bridgeEventCache = new Map<string, unknown>();

export function cacheBridgeEvent(eventName: string, data: unknown): void {
  bridgeEventCache.set(eventName, data);
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
