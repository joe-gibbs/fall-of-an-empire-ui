import { clearGameplayBridgeEventCache } from '../bridge/core/bridgeEventCache';
import { clearGameplayDataCaches, dispatchGameplayContextReset } from '../bridge/core/gameplayCacheReset';
import { setGameplayBridgeRequestsBlocked } from '../bridge/core/runtimeEngine';

export function applyAppModeBridgeGate(eventName: string, data: unknown): void {
  const appMode = eventName === 'game.get_app_mode' ? (data as { mode?: unknown }).mode : undefined;
  if (appMode === 'ingame') {
    setGameplayBridgeRequestsBlocked(false);
  }
  if (appMode === 'mainmenu' || appMode === 'loading') {
    setGameplayBridgeRequestsBlocked(true);
    clearGameplayBridgeEventCache();
    clearGameplayDataCaches();
    dispatchGameplayContextReset();
  }
}
