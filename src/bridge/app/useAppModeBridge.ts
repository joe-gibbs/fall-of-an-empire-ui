import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent } from '../core/bridgeEventCache';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

export type AppMode = 'mainmenu' | 'ingame' | 'loading';
export type AppContentMode = Exclude<AppMode, 'loading'>;

function normalise(value: string | undefined): AppMode {
  if (value === 'loading') return 'loading';
  return value === 'mainmenu' ? 'mainmenu' : 'ingame';
}

function toContentMode(mode: AppMode): AppContentMode | null {
  if (mode === 'loading') return null;
  return mode;
}

/**
 * Tracks whether the app should render the main-menu or in-game surface.
 * Native loading mode renders only the loading overlay; underlying screens
 * are unmounted so they do not keep querying game data while the world changes.
 * Returns null until the first resolution (bridge ping + initial fetch)
 * so the UI can hold off on committing to either layout.
 */
export function useAppMode(): AppContentMode | null {
  const [mode, setMode] = useState<AppContentMode | null>(() => {
    const cached = getCachedBridgeEvent('game.get_app_mode');
    return cached ? toContentMode(normalise(cached.mode)) : null;
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
      setMode(toContentMode(pendingMode));
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
