import { useEffect, useState, type ReactNode } from 'react';
import { GameProvider } from './context/GameContext';
import MainMenu from './pages/MainMenu';
import LoadingScreenOverlay from './components/loading/LoadingScreenOverlay';
import {
  resolveLoadingContentAppMode,
  resolvePresentedAppMode,
  shouldNotifyLoadingAppModeRendered,
  type LoadingContentAppMode,
} from './components/loading/loadingScreenPresentation';
import { useLoadingOverlayPictureReady } from './components/loading/useLoadingOverlayPictureReady';
import { TooltipHost } from './components/common/tooltips/Tooltip';
import { WebUITextProvider } from './localization/WebUITextProvider';
import { useAppMode } from './bridge/app/useAppModeBridge';
import { useLoadingScreenBridge } from './bridge/app/useLoadingScreenBridge';
import { useUIScale } from './bridge/core/useUIScale';
import { EscapeStackProvider } from './context/EscapeStackProvider';
import { preloadWebUIAssets } from './preload/assets';
import { acknowledgeBridgeFailure, getRuntimeEngine } from './bridge/core/runtimeEngine';
import GameUIRoot from './components/app-shell/GameUIRoot';
import ResourceDetailsProvider from './context/ResourceDetailsProvider';
import CultureDetailsProvider from './context/CultureDetailsProvider';
import ReligionDetailsProvider from './context/ReligionDetailsProvider';
import InitialSetupModal from './components/initial-setup/InitialSetupModal';
import { useButtonClickSound } from './hooks/useSound';
import InputModeProvider from './input/InputModeProvider';
import GamepadFocusProvider from './input/GamepadFocusManager';
import GamepadPromptLayer from './input/GamepadPromptLayer';
import './App.css';


function App() {
  useUIScale();
  useButtonClickSound();
  const appMode = useAppMode();
  const loadingState = useLoadingScreenBridge();
  const overlayPictureReady = useLoadingOverlayPictureReady(loadingState);
  const [lastContentAppMode, setLastContentAppMode] = useState<LoadingContentAppMode | null>(
    appMode === 'mainmenu' || appMode === 'ingame' ? appMode : null,
  );
  if ((appMode === 'mainmenu' || appMode === 'ingame') && lastContentAppMode !== appMode) {
    setLastContentAppMode(appMode);
  }
  const contentAppMode = resolveLoadingContentAppMode(
    appMode,
    lastContentAppMode,
    overlayPictureReady,
  );
  const presentedAppMode = resolvePresentedAppMode(appMode, overlayPictureReady);
  useEffect(() => {
    preloadWebUIAssets(contentAppMode);
  }, [contentAppMode]);

  useEffect(() => {
    if (!shouldNotifyLoadingAppModeRendered(appMode, overlayPictureReady)) {
      return undefined;
    }

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let timer = 0;

    const notifyRendered = () => {
      if (cancelled || presentedAppMode == null) return;
      const engine = getRuntimeEngine();
      if (!engine) return;
      void Promise.resolve(engine.call('UIRendered', { mode: presentedAppMode }))
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
  }, [appMode, overlayPictureReady, presentedAppMode]);

  let content: ReactNode = null;
  if (contentAppMode === 'mainmenu') {
    content = (
      <>
        <MainMenu />
        <TooltipHost />
      </>
    );
  } else if (contentAppMode === 'ingame') {
    content = (
      <GameProvider>
        <ResourceDetailsProvider>
          <CultureDetailsProvider>
            <ReligionDetailsProvider>
              <GameUIRoot />
              <TooltipHost />
            </ReligionDetailsProvider>
          </CultureDetailsProvider>
        </ResourceDetailsProvider>
      </GameProvider>
    );
  }

  return (
    <EscapeStackProvider>
      <WebUITextProvider>
        <InputModeProvider>
          <GamepadFocusProvider appMode={contentAppMode}>
            <div className="game-cursor-surface" data-webkiln-world-input>
              {content}
              <InitialSetupModal autoOpen={contentAppMode === 'mainmenu'} />
              <LoadingScreenOverlay state={loadingState} pictureReady={overlayPictureReady} />
              <GamepadPromptLayer appMode={contentAppMode} />
            </div>
          </GamepadFocusProvider>
        </InputModeProvider>
      </WebUITextProvider>
    </EscapeStackProvider>
  );
}

export default App;
