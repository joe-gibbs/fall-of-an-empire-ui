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

type OverlayPhase = 'hidden' | 'visible' | 'closing';

const LoadingScreenOverlay: React.FC<LoadingScreenOverlayProps> = ({ state, pictureReady }) => {
  const [phase, setPhase] = React.useState<OverlayPhase>(state.visible ? 'visible' : 'hidden');
  // The last pushed state while visible, kept on screen during the closing animation.
  const [lastVisibleState, setLastVisibleState] = React.useState(state);

  React.useEffect(() => {
    if (state.visible) setLastVisibleState(state);
  }, [state]);

  // Transitions depend only on visibility, so repeated hidden pushes cannot restart the close.
  React.useEffect(() => {
    setPhase(previous => {
      if (state.visible) return 'visible';
      return previous === 'visible' ? 'closing' : previous;
    });
  }, [state.visible]);

  React.useEffect(() => {
    if (phase !== 'closing') return undefined;
    const timer = window.setTimeout(() => setPhase('hidden'), CLOSING_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // A hidden push renders before the phase effect runs; treat that frame as closing too.
  const isClosing = phase === 'closing' || (phase === 'visible' && !state.visible);
  if (!shouldShowLoadingOverlay(state.visible, pictureReady, isClosing)) {
    return null;
  }

  const visibleState = state.visible ? state : lastVisibleState;
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
