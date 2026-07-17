import { clearGameplayBridgeEventCache } from '../bridge/core/bridgeEventCache';
import { clearGameplayDataCaches, dispatchGameplayContextReset } from '../bridge/core/gameplayCacheReset';

export function applyAppModeCacheReset(eventName: string, data: unknown): void {
  const appMode = eventName === 'game.get_app_mode' ? (data as { mode?: unknown }).mode : undefined;
  if (appMode === 'mainmenu' || appMode === 'loading') {
    clearGameplayBridgeEventCache();
    clearGameplayDataCaches();
    dispatchGameplayContextReset();
  }
}
