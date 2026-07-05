import { useEffect, useState } from 'react';
import { bridgeCall, onBridgeEvent, type LoadingScreenResponse } from '../../bridge-types.generated.ts';
import { getCachedBridgeEvent } from '../core/bridgeEventCache';
import { acknowledgeBridgeFailure } from '../core/runtimeEngine';

const EMPTY_LOADING_SCREEN: LoadingScreenResponse = {
  visible: false,
  progress: 0,
  background: '',
  tip: '',
};

function normaliseState(state: LoadingScreenResponse): LoadingScreenResponse {
  const progress = Number.isFinite(state.progress) ? Math.max(0, Math.min(100, state.progress)) : 0;
  return {
    visible: !!state.visible,
    progress,
    background: state.background || '',
    tip: state.tip || '',
  };
}

export function useLoadingScreenBridge(): LoadingScreenResponse {
  const [state, setState] = useState<LoadingScreenResponse>(() => {
    const cached = getCachedBridgeEvent('game.loading_screen');
    return normaliseState(cached ?? EMPTY_LOADING_SCREEN);
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await bridgeCall('game.loading_screen');
        if (!cancelled) setState(normaliseState(res));
      } catch (error) {
        acknowledgeBridgeFailure(error);
        if (!cancelled) setState(EMPTY_LOADING_SCREEN);
      }
    })();

    const unsub = onBridgeEvent('game.loading_screen', (data) => {
      setState(normaliseState(data));
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
