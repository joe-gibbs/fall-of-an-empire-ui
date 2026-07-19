import React from 'react';
import { useLoadingScreenBridge } from '../../bridge/app/useLoadingScreenBridge';
import { preloadImageAsset } from '../../preload/assets';
import { WebkilnAssetPath } from '../../utils/assets';
import './LoadingScreenOverlay.css';

const FALLBACK_BACKGROUND = '/assets/loading-screens/general.png';
const LOGO_SRC = '/assets/main-menu-logo.png';
const CLOSING_ANIMATION_MS = 450;

const LoadingScreenOverlay: React.FC = () => {
  const state = useLoadingScreenBridge();
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

  React.useEffect(() => {
    preloadImageAsset(renderedState.background || FALLBACK_BACKGROUND);
    preloadImageAsset(LOGO_SRC);
  }, [renderedState.background]);

  if (!state.visible && !renderedState.visible && !isClosing) return null;

  const visibleState = state.visible ? state : renderedState;
  const progress = Math.max(0, Math.min(100, visibleState.progress));
  const backgroundSrc = WebkilnAssetPath(visibleState.background || FALLBACK_BACKGROUND);
  const logoSrc = WebkilnAssetPath(LOGO_SRC);

  return (
    <div className={`loading-screen${isClosing && !state.visible ? ' loading-screen--closing' : ''}`}>
      <div
        className="loading-screen__background"
        style={{ backgroundImage: `url("${backgroundSrc}")` }}
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
