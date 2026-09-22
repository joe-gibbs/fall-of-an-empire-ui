import { useEffect, useState } from 'react';
import type { LoadingScreenResponse } from '../../bridge-types.generated.ts';
import { whenImageAssetReady } from '../../preload/assets';
import { LOADING_SCREEN_FALLBACK_BACKGROUND } from './loadingScreenPresentation';

export function useLoadingOverlayPictureReady(state: LoadingScreenResponse): boolean {
  const background = state.background || LOADING_SCREEN_FALLBACK_BACKGROUND;
  const [readyBackground, setReadyBackground] = useState('');

  useEffect(() => {
    if (!state.visible) {
      return undefined;
    }

    let cancelled = false;
    void whenImageAssetReady(background).then(() => {
      if (!cancelled) {
        setReadyBackground(background);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [background, state.visible]);

  return state.visible && readyBackground === background;
}
