import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent } from '../core/bridgeEventCache';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

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
    let pendingMode: AppMode | null = null;
    let pendingFrame = 0;
    let pendingTimer = 0;

    const clearPendingCommit = () => {
      if (pendingFrame !== 0) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
      }
      if (pendingTimer !== 0) {
        window.clearTimeout(pendingTimer);
        pendingTimer = 0;
      }
    };

    const commitPendingMode = () => {
      pendingFrame = 0;
      pendingTimer = 0;
      if (cancelled || pendingMode === null) return;
      setMode(pendingMode);
      pendingMode = null;
    };

    const applyMode = (nextMode: AppMode) => {
      pendingMode = nextMode;
      clearPendingCommit();
      if (typeof window.requestAnimationFrame === 'function') {
        pendingFrame = window.requestAnimationFrame(commitPendingMode);
      } else {
        pendingTimer = window.setTimeout(commitPendingMode, 0);
      }
    };

    (async () => {
      try {
        const res = await bridgeCall('game.get_app_mode');
        if (!cancelled) applyMode(normalise(res.mode));
      } catch (error) {
        acknowledgeBridgeFailure(error);
        if (!cancelled) setMode(null);
      }
    })();

    const unsub = onBridgeEvent('game.get_app_mode', (data) => {
      applyMode(normalise(data.mode));
    });

    return () => {
      cancelled = true;
      clearPendingCommit();
      unsub();
    };
  }, []);

  return mode;
}
