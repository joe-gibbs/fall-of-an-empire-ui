import { useEffect, useState } from 'react';
import { onBridgeEvent } from '../../bridge-types.generated.ts';
import type { GetAppModeResponse } from '../../bridge-types.generated.ts';
import { currentBridgeEventRevision, getCachedBridgeEvent } from '../core/bridgeEventCache';
import { acknowledgeBridgeFailure, callRuntimeBridgeRevisioned } from '../core/runtimeEngine';

export type AppMode = 'mainmenu' | 'ingame' | 'loading';

function normalise(value: string | undefined): AppMode {
  if (value === 'loading') return 'loading';
  return value === 'mainmenu' ? 'mainmenu' : 'ingame';
}

/**
 * Tracks the native app mode, including the loading-only surface.
 * Native loading mode renders only the loading overlay; underlying screens
 * are unmounted so they do not keep querying game data while the world changes.
 * Returns null until the first resolution (bridge ping + initial fetch)
 * so the UI can hold off on committing to either layout.
 */
export function useAppMode(): AppMode | null {
  const [mode, setMode] = useState<AppMode | null>(() => {
    const cached = getCachedBridgeEvent('game.get_app_mode');
    return cached ? normalise(cached.mode) : null;
  });

  useEffect(() => {
    let cancelled = false;
    // Only a push newer than the initial request may be overridden by its response.
    let latestPushRevision = 0;

    const unsub = onBridgeEvent('game.get_app_mode', (data) => {
      latestPushRevision = currentBridgeEventRevision();
      setMode(normalise(data.mode));
    });

    callRuntimeBridgeRevisioned({ action: 'game.get_app_mode' })
      .then(({ value, sentRevision }) => {
        if (cancelled || latestPushRevision > sentRevision) return;
        setMode(normalise((value as GetAppModeResponse).mode));
      })
      .catch((error) => {
        acknowledgeBridgeFailure(error);
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return mode;
}
