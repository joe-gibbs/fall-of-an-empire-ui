import { useEffect, type ReactNode } from 'react';
import { GameProvider } from './context/GameContext';
import MainMenu from './pages/MainMenu';
import LoadingScreenOverlay from './components/loading/LoadingScreenOverlay';
import { TooltipHost } from './components/common/tooltips/Tooltip';
import { WebUITextProvider } from './localization/WebUITextProvider';
import { useAppMode } from './bridge/app/useAppModeBridge';
import { useUIScale } from './bridge/core/useUIScale';
import { EscapeStackProvider } from './context/EscapeStackProvider';
import { preloadWebUIAssets } from './preload/assets';
import { acknowledgeBridgeFailure, getRuntimeEngine } from './bridge/core/runtimeEngine';
import GameUIRoot from './components/app-shell/GameUIRoot';
import ResourceDetailsProvider from './context/ResourceDetailsProvider';
import InitialSetupModal from './components/initial-setup/InitialSetupModal';
import { useButtonClickSound } from './hooks/useSound';
import './App.css';


function App() {
  useUIScale();
  useButtonClickSound();
  const appMode = useAppMode();
  useEffect(() => {
    preloadWebUIAssets(appMode);
  }, [appMode]);

  useEffect(() => {
    if (!appMode) return undefined;

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let timer = 0;

    const notifyRendered = () => {
      if (cancelled) return;
      const engine = getRuntimeEngine();
      if (!engine) return;
      void Promise.resolve(engine.call('UIRendered', { mode: appMode }))
        .catch(error => acknowledgeBridgeFailure(error, 'UIRendered'));
    };

    const scheduleWithTimer = () => {
      timer = window.setTimeout(notifyRendered, 0);
    };

    if (typeof window.requestAnimationFrame === 'function') {
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          notifyRendered();
        });
      });
    } else {
      scheduleWithTimer();
    }

    return () => {
      cancelled = true;
      if (firstFrame !== 0) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== 0) window.cancelAnimationFrame(secondFrame);
      if (timer !== 0) window.clearTimeout(timer);
    };
  }, [appMode]);

  let content: ReactNode = null;
  if (appMode === 'mainmenu') {
    content = (
      <>
        <MainMenu />
        <TooltipHost />
      </>
    );
  } else if (appMode === 'ingame') {
    content = (
      <GameProvider>
        <ResourceDetailsProvider>
          <GameUIRoot />
          <TooltipHost />
        </ResourceDetailsProvider>
      </GameProvider>
    );
  }

  return (
    <EscapeStackProvider>
      <WebUITextProvider>
        <div className="game-cursor-surface" data-webkiln-world-input>
          {content}
          <InitialSetupModal autoOpen={appMode === 'mainmenu'} />
          <LoadingScreenOverlay />
        </div>
      </WebUITextProvider>
    </EscapeStackProvider>
  );
}

export default App;
