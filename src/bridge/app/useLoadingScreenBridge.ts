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
    // A push is newer than the initial fetch, so the fetch result is dropped once one arrives.
    let receivedPush = false;

    const unsub = onBridgeEvent('game.loading_screen', (data) => {
      receivedPush = true;
      setState(normaliseState(data));
    });

    (async () => {
      try {
        const res = await bridgeCall('game.loading_screen');
        if (!cancelled && !receivedPush) setState(normaliseState(res));
      } catch (error) {
        acknowledgeBridgeFailure(error);
        if (!cancelled && !receivedPush) setState(EMPTY_LOADING_SCREEN);
      }
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
