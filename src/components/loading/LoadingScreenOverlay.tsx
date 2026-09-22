import React from 'react';
import type { LoadingScreenResponse } from '../../bridge-types.generated.ts';
import { WebkilnAssetPath } from '../../utils/assets';
import {
  LOADING_SCREEN_FALLBACK_BACKGROUND,
  LOADING_SCREEN_LOGO,
  shouldShowLoadingOverlay,
} from './loadingScreenPresentation';
import './LoadingScreenOverlay.css';

const CLOSING_ANIMATION_MS = 450;

interface LoadingScreenOverlayProps {
  state: LoadingScreenResponse;
  pictureReady: boolean;
}

const LoadingScreenOverlay: React.FC<LoadingScreenOverlayProps> = ({ state, pictureReady }) => {
  const [renderedState, setRenderedState] = React.useState(state);
  const [isClosing, setIsClosing] = React.useState(false);
  const renderedVisibleRef = React.useRef(renderedState.visible);
  const closeTimerRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null);

  React.useEffect(() => {
    renderedVisibleRef.current = renderedState.visible;
  }, [renderedState.visible]);

  React.useEffect(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (state.visible) {
      setRenderedState(state);
      setIsClosing(false);
      return undefined;
    }

    if (renderedVisibleRef.current) {
      setIsClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        setRenderedState(state);
        setIsClosing(false);
        closeTimerRef.current = null;
      }, CLOSING_ANIMATION_MS);

      return () => {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
      };
    }

    setRenderedState(state);
    setIsClosing(false);
    return undefined;
  }, [state]);

  if (state.visible && !pictureReady) {
    return null;
  }
  if (!shouldShowLoadingOverlay(state.visible, pictureReady, isClosing) && !renderedState.visible) {
    return null;
  }

  const visibleState = state.visible ? state : renderedState;
  const progress = Math.max(0, Math.min(100, visibleState.progress));
  const backgroundSrc = WebkilnAssetPath(visibleState.background || LOADING_SCREEN_FALLBACK_BACKGROUND);
  const logoSrc = WebkilnAssetPath(LOADING_SCREEN_LOGO);

  return (
    <div className={`loading-screen${isClosing && !state.visible ? ' loading-screen--closing' : ''}`}>
      <img
        className="loading-screen__background"
        src={backgroundSrc}
        alt=""
        draggable={false}
      />
      <div className="loading-screen__wash" />
      <div className="loading-screen__vignette" />
      <div className="loading-screen__bottom-scrim" />

      <div
        className="loading-screen__logo"
        style={{ backgroundImage: `url("${logoSrc}")` }}
      />

      <div className="loading-screen__content">
        {visibleState.tip && (
          <div className="loading-screen__tip">
            {visibleState.tip}
          </div>
        )}

        <div className="loading-screen__progress-row">
          <div className="loading-screen__progress-track">
            <div
              className="loading-screen__progress-fill"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreenOverlay;
